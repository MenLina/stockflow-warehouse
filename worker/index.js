import {
  archiveProduct, categories, change, countOperations, history, inventory, normalize,
  product, recordOperation, row,
} from './store.js';
import { currentUser, endSession, makeSession, verifyLogin } from './auth.js';
import {
  button, catalog, categoryForm, categoryList, layout, loginPage, operationButtons,
  operationForm, operationHistory, overview, problem, productForm,
} from './views.js';
import { stylesheet } from './style.js';

const localDay = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'Europe/Samara',
});
const kinds = ['receipt', 'writeoff'];
const loginAttempts = new Map();
const sourceArchive = typeof STOCKFLOW_SOURCE_ZIP === 'undefined' ? '' : STOCKFLOW_SOURCE_ZIP;

function headers() {
  return new Headers({
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; style-src 'self'; form-action 'self'; base-uri 'none'",
    'Referrer-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
  });
}

function html(content, status = 200) {
  const result = headers();
  result.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(content, { status, headers: result });
}

function redirect(path, cookie) {
  const result = headers();
  result.set('Location', path);
  if (cookie) result.set('Set-Cookie', cookie);
  return new Response(null, { status: 303, headers: result });
}

function feedback(path, text, error = false) {
  const query = new URLSearchParams({ [error ? 'error' : 'ok']: text });
  return redirect(path + (path.includes('?') ? '&' : '?') + query);
}

function value(values, key) {
  return String(values.get(key) ?? '').trim();
}

function positiveInteger(input) {
  if (!/^\d{1,14}$/.test(input)) return 0;
  return Number(input);
}

function validDate(input) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) return '';
  const date = new Date(`${input}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === input ? input : '';
}

function dayStart(date, offset = 0) {
  if (!date) return '';
  return new Date(Date.parse(`${date}T00:00:00+04:00`) + offset * 86400000).toISOString();
}

function page(context, title, section, content, { description, actions, status } = {}) {
  return html(layout({ ...context, title, section, content, description, actions }), status);
}

function errorPage(context, status, title, description) {
  return page(context, title, '', problem(title, description), { status });
}

function formMessage(query) {
  const error = value(query, 'error').slice(0, 250);
  const text = error || value(query, 'ok').slice(0, 250);
  return text ? { text, error: Boolean(error) } : undefined;
}

async function readPage({ env, context, url, admin, method }) {
  const db = env.DB;
  const path = url.pathname;
  const query = url.searchParams;

  if (sourceArchive && path === '/download') {
    return page(context, 'Скачать StockFlow', '', `<section class="panel form-panel">
      <p>Архив содержит папку проекта с исходниками и инструкцией в README.md.
      Для запуска демоверсии нужен Node.js 22.13 или новее.</p>
      ${button('/download/StockFlow.zip', 'Скачать StockFlow.zip', 'primary')}
      </section>`);
  }
  if (sourceArchive && path === '/download/StockFlow.zip') {
    const result = headers();
    result.set('Content-Type', 'application/zip');
    result.set('Content-Disposition', 'attachment; filename="StockFlow.zip"');
    const body = method === 'HEAD' ? null : Uint8Array.from(atob(sourceArchive), char => char.charCodeAt(0));
    return new Response(body, { headers: result });
  }
  if (path === '/') {
    const [products, groups, entries, today] = await Promise.all([
      inventory(db), categories(db), history(db, {}, 6), countOperations(db, dayStart(localDay.format(Date.now()))),
    ]);
    return page(context, 'Обзор склада', '/', overview({ products, categories: groups, entries, today: today.total }), {
      description: 'Текущие остатки и последние складские операции', actions: operationButtons(),
    });
  }
  if (path === '/products' || path === '/inventory') {
    const term = value(query, 'q').slice(0, 100);
    const categoryId = positiveInteger(value(query, 'category'));
    const inventoryOnly = path === '/inventory';
    const [products, groups] = await Promise.all([inventory(db, { term: normalize(term), category: categoryId }), categories(db)]);
    const title = inventoryOnly ? 'Остатки товаров' : 'Каталог товаров';
    const actions = inventoryOnly ? operationButtons() : admin ? button('/products/new', '+ Добавить товар', 'primary') : '';
    return page(context, title, path, catalog({
      products, categories: groups, term, categoryId, path, canEdit: admin, inventoryOnly,
    }), { actions });
  }
  if (path === '/categories') {
    return page(context, 'Категории', path, categoryList(await categories(db), admin));
  }
  if (path === '/history') {
    const kind = kinds.includes(query.get('kind')) ? query.get('kind') : '';
    const start = validDate(value(query, 'start'));
    const end = validDate(value(query, 'end'));
    const index = Math.min(positiveInteger(value(query, 'page')) || 1, 100000);
    const perPage = 30;
    const entries = await history(db, { kind, from: dayStart(start), until: dayStart(end, 1) },
      perPage + 1, (index - 1) * perPage);
    return page(context, 'История операций', path, operationHistory({
      entries: entries.slice(0, perPage), kind, start, end, page: index, hasNext: entries.length > perPage,
    }), { actions: operationButtons() });
  }
  if (path === '/operations/new') {
    const kind = query.get('kind') === 'writeoff' ? 'writeoff' : 'receipt';
    const title = kind === 'writeoff' ? 'Списание товара' : 'Поступление товара';
    return page(context, title, '/inventory', operationForm({
      products: await inventory(db), kind, productId: positiveInteger(value(query, 'product')), requestId: crypto.randomUUID(),
    }));
  }

  const productEdit = path.match(/^\/products\/(\d{1,14})\/edit$/);
  const categoryEdit = path.match(/^\/categories\/(\d{1,14})\/edit$/);
  if (path === '/products/new' || productEdit || categoryEdit) {
    if (!admin) return forbidden(context);
    if (categoryEdit) {
      const category = await row(db, 'SELECT * FROM categories WHERE id = ?', Number(categoryEdit[1]));
      if (category) return page(context, 'Изменить категорию', '/categories', categoryForm(category));
    } else {
      const item = productEdit ? await product(db, Number(productEdit[1])) : null;
      if (!productEdit || item) {
        return page(context, item ? 'Изменить товар' : 'Добавить товар', '/products',
          productForm(item, await categories(db)));
      }
    }
  }

  return errorPage(context, 404, 'Страница не найдена', 'Проверьте адрес страницы или вернитесь к обзору склада.');
}

function forbidden(context) {
  return errorPage(context, 403, 'Доступ ограничен', 'Это действие доступно администратору склада.');
}

async function saveProduct(db, id, data) {
  const sku = normalize(value(data, 'sku')).toLocaleUpperCase('ru');
  const name = value(data, 'name');
  const unit = value(data, 'unit');
  const category = positiveInteger(value(data, 'category'));
  const destination = id ? `/products/${id}/edit` : '/products/new';
  if (!sku || sku.length > 32 || !name || name.length > 120 || !unit || unit.length > 16 ||
    !category || !await row(db, 'SELECT id FROM categories WHERE id = ?', category)) {
    return feedback(destination, 'Заполните поля и выберите существующую категорию.', true);
  }
  const fields = [sku, name, normalize(`${name} ${sku}`), category, unit];
  try {
    const affected = id ? await change(db, `UPDATE products SET sku = ?, name = ?, search_key = ?,
      category_id = ?, unit = ? WHERE id = ? AND archived_at IS NULL
      AND (unit = ? OR NOT EXISTS(SELECT 1 FROM operations WHERE product_id = products.id))`, ...fields, id, unit)
      : await change(db, `INSERT INTO products (sku, name, search_key, category_id, unit)
        VALUES (?, ?, ?, ?, ?)`, ...fields);
    if (!affected) {
      if (!await product(db, id)) return feedback('/products', 'Товар уже удалён или не существует.', true);
      return feedback(destination, 'Единицу измерения можно изменить до первой операции по товару.', true);
    }
  } catch (error) {
    if (String(error).includes('UNIQUE constraint failed')) {
      return feedback(destination, 'Товар с таким артикулом уже есть в каталоге или истории.', true);
    }
    if (String(error).includes('FOREIGN KEY constraint failed')) {
      return feedback(destination, 'Категория уже удалена. Выберите другую.', true);
    }
    throw error;
  }
  return feedback('/products', id ? 'Товар обновлён.' : 'Товар добавлен.');
}

async function saveCategory(db, id, name) {
  const destination = id ? `/categories/${id}/edit` : '/categories';
  if (!name || name.length > 80) return feedback(destination, 'Введите название категории до 80 символов.', true);
  try {
    const affected = id ? await change(db, 'UPDATE categories SET name = ?, name_key = ? WHERE id = ?',
      name, normalize(name), id) : await change(db, 'INSERT INTO categories (name, name_key) VALUES (?, ?)', name, normalize(name));
    if (!affected) return feedback('/categories', 'Категория уже удалена или не существует.', true);
  } catch (error) {
    if (String(error).includes('UNIQUE constraint failed')) {
      return feedback(destination, 'Категория с таким названием уже существует.', true);
    }
    throw error;
  }
  return feedback('/categories', id ? 'Категория обновлена.' : 'Категория добавлена.');
}

async function saveOperation(db, data, user) {
  const kind = value(data, 'kind');
  const productId = positiveInteger(value(data, 'product'));
  const quantity = positiveInteger(value(data, 'quantity'));
  const note = value(data, 'note');
  const requestId = value(data, 'requestId');
  const destination = '/operations/new?' + new URLSearchParams({ kind, product: productId });
  if (!kinds.includes(kind) || !productId || !quantity || quantity > 1000000 ||
    !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(requestId)) {
    return feedback(destination, 'Выберите товар и укажите целое количество от 1 до 1 000 000.', true);
  }
  if (kind === 'writeoff' && !note) {
    return feedback(destination, 'Укажите основание списания.', true);
  }
  if (note.length > 300) {
    return feedback(destination, 'Длина текста не должна превышать 300 символов.', true);
  }
  const result = await recordOperation(db, { kind, productId, quantity, note, requestId }, user);
  if (result === 'missing') return feedback(destination, 'Товар удалён или не существует.', true);
  if (result === 'duplicate') return feedback(destination, 'Форма уже использована. Проверьте историю операций.', true);
  if (result === 'quantity') {
    return feedback(destination, kind === 'writeoff' ? 'Недостаточно товара на складе.' : 'Превышен максимальный остаток.', true);
  }
  return feedback('/history', kind === 'receipt' ? 'Поступление проведено.' : 'Списание проведено.');
}

async function writePage({ env, url, context, admin, data }) {
  const db = env.DB;
  const path = url.pathname;

  if (path === '/logout' && env.LOCAL) return redirect('/login', endSession(url));
  if (path === '/operations') return saveOperation(db, data, context.user);

  const productPath = path.match(/^\/products\/([1-9]\d{0,13})(\/archive)?$/);
  const categoryPath = path.match(/^\/categories\/([1-9]\d{0,13})(\/delete)?$/);
  if (path === '/products' || path === '/categories' || productPath || categoryPath) {
    if (!admin) return forbidden(context);
    if (path === '/products') return saveProduct(db, 0, data);
    if (path === '/categories') return saveCategory(db, 0, value(data, 'name'));
    if (productPath) {
      const id = Number(productPath[1]);
      if (!productPath[2]) return saveProduct(db, id, data);
      const removed = await archiveProduct(db, id);
      return removed ? feedback('/products', 'Товар удалён из каталога.')
        : feedback(`/products/${id}/edit`, 'Удалить можно только товар с нулевым остатком.', true);
    }
    const id = Number(categoryPath[1]);
    if (!categoryPath[2]) return saveCategory(db, id, value(data, 'name'));
    const removed = await change(db, `DELETE FROM categories WHERE id = ?
      AND NOT EXISTS(SELECT 1 FROM products WHERE category_id = ?)`, id, id);
    return removed ? feedback('/categories', 'Категория удалена.')
      : feedback(`/categories/${id}/edit`, 'Категория используется в каталоге или истории товаров.', true);
  }
  return errorPage(context, 404, 'Страница не найдена', 'Проверьте адрес страницы или вернитесь к обзору склада.');
}

async function login(request, env, url, data) {
  const address = request.headers.get('stockflow-client-address') || 'local';
  const now = Date.now();
  for (const [key, entry] of loginAttempts) if (entry.expiry <= now) loginAttempts.delete(key);
  const recent = loginAttempts.get(address) ?? { count: 0, expiry: now + 60000 };
  if (recent.count >= 12) {
    return feedback('/login', 'Слишком много попыток. Попробуйте войти через минуту.', true);
  }
  recent.count += 1;
  loginAttempts.set(address, recent);
  const user = await verifyLogin(env, normalize(value(data, 'login')).slice(0, 64), String(data.get('password') ?? ''));
  if (!user) return feedback('/login', 'Неверный логин или пароль.', true);
  loginAttempts.delete(address);
  return redirect('/', await makeSession(user, env, url));
}

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  if (path === '/stockflow.css' && (method === 'GET' || method === 'HEAD')) {
    return new Response(method === 'HEAD' ? null : stylesheet, { headers: {
      'Content-Type': 'text/css; charset=utf-8', 'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    }});
  }
  if (!['GET', 'HEAD', 'POST'].includes(method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD, POST' } });
  const message = formMessage(url.searchParams);
  let data;
  if (method === 'POST') {
    if (request.headers.get('Origin') !== url.origin) return html('<p>Запрос отклонён.</p>', 403);
    const contentType = request.headers.get('Content-Type')?.split(';')[0];
    if (Number(request.headers.get('Content-Length')) > 8192) return html('<p>Запрос слишком большой.</p>', 413);
    // Some user agents omit Content-Type on forms with no fields.
    if (contentType && contentType !== 'application/x-www-form-urlencoded') return html('<p>Неверный формат запроса.</p>', 415);
    const body = await request.text();
    if (body.length > 8192) return html('<p>Запрос слишком большой.</p>', 413);
    data = new URLSearchParams(body);
    if (path === '/login' && env.LOCAL) return login(request, env, url, data);
  }
  const user = env.AUTH ? await env.AUTH.getUser(request, env.DB) : await currentUser(request, env);
  if (!user) {
    if (path !== '/login') return redirect('/login');
    return html(loginPage({ signInUrl: env.AUTH?.signInUrl, demo: env.LOCAL?.demo, message }));
  }
  if (path === '/login') return redirect('/');
  const context = { user, signOutUrl: env.AUTH?.signOutUrl, message };
  const route = { env, url, context, admin: user.role === 'admin', data, method };
  return method === 'POST' ? writePage(route) : readPage(route);
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (error) {
      console.error(error);
      return html('<!doctype html><html lang="ru"><meta charset="utf-8"><title>StockFlow</title><p>Не удалось загрузить данные склада. Попробуйте ещё раз.</p></html>', 500);
    }
  },
};
