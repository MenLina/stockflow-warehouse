const number = new Intl.NumberFormat('ru-RU');
const dateTime = new Intl.DateTimeFormat('ru-RU', {
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Samara',
});
const dayLabel = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Samara',
});

export function escape(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const e = escape;
const roleLabel = { admin: 'Администратор', employee: 'Сотрудник' };
const navigation = [
  ['/', '◫', 'Обзор'],
  ['/products', '▤', 'Товары'],
  ['/categories', '◇', 'Категории'],
  ['/inventory', '▥', 'Остатки'],
  ['/history', '◷', 'История операций'],
];

function brand() {
  return `<a class="brand" href="/" aria-label="StockFlow, обзор">
    <span class="logo" aria-hidden="true"><i></i><i></i><i></i></span>
    <span>StockFlow<small>Складской учёт</small></span>
  </a>`;
}

function flash(message) {
  return message ? `<div class="notice ${message.error ? 'notice-error' : ''}" role="${message.error ? 'alert' : 'status'}">
    ${e(message.text)}</div>` : '';
}

function document(title, body, className) {
  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#122520"><title>${e(title)} · StockFlow</title>
<link rel="stylesheet" href="/stockflow.css"></head>
<body class="${className}">${body}</body></html>`;
}

export function layout({ title, section, user, signOutUrl, message, description, actions = '', content }) {
  const logout = signOutUrl ? `<a class="logout" href="${e(signOutUrl)}" target="_top">Выйти</a>`
    : '<form method="post" action="/logout"><button class="logout" type="submit">Выйти</button></form>';
  return document(title, `<a href="#main" class="skip">К содержанию</a>
  <aside class="sidebar">
    ${brand()}
    <nav aria-label="Разделы склада">${navigation.map(([path, icon, label]) =>
    `<a href="${path}"${path === section ? ' aria-current="page"' : ''}><span aria-hidden="true">${icon}</span>${label}</a>`).join('')}</nav>
    <div class="account">
      <span class="avatar" aria-hidden="true">${e(user.display_name.slice(0, 1).toLocaleUpperCase('ru'))}</span>
      <div class="account-name"><strong>${e(user.display_name)}</strong><small>${roleLabel[user.role]}</small></div>
      ${logout}
    </div>
  </aside>
  <main id="main" class="main">
    <div class="topbar"><span class="warehouse"><span aria-hidden="true"></span>Основной склад</span>
      <time datetime="${new Date().toISOString()}">${dayLabel.format(Date.now())}</time></div>
    <header class="page-head"><div><h1>${e(title)}</h1>${description ? `<p>${e(description)}</p>` : ''}</div>
      ${actions ? `<div class="actions">${actions}</div>` : ''}</header>
    ${flash(message)}${content}
  </main>`, 'app');
}

export function loginPage({ signInUrl, demo, message }) {
  const demoInfo = demo ? `<details class="demo"><summary>Данные для демонстрации</summary>
    <dl><dt>Администратор</dt><dd><code>admin</code> / <code>stockflow-admin</code></dd>
    <dt>Сотрудник</dt><dd><code>employee</code> / <code>stockflow-staff</code></dd></dl></details>` : '';
  const form = signInUrl ? `<a class="button primary" href="${e(signInUrl)}" target="_top">Войти</a>`
    : `<form method="post" action="/login" class="form">
    <label>Логин<input name="login" autocomplete="username" maxlength="64" required autofocus></label>
    <label>Пароль<input type="password" name="password" autocomplete="current-password" maxlength="256" required></label>
    <button class="button primary" type="submit">Войти</button></form>${demoInfo}`;
  return document('Вход', `<main class="login"><div class="login-card">${brand()}<h1>Вход в систему</h1>
    ${flash(message)}${form}</div></main>`, 'login-body');
}

export const button = (href, label, type = '') =>
  `<a class="button ${type}" href="${e(href)}">${e(label)}</a>`;

export const operationButtons = () =>
  button('/operations/new?kind=writeoff', '− Списание') +
  button('/operations/new?kind=receipt', '+ Поступление', 'primary');

function empty(title, description = '') {
  return `<div class="empty"><strong>${e(title)}</strong>${description ? `<p>${e(description)}</p>` : ''}</div>`;
}

function table(head, body) {
  return `<div class="table-scroll"><table><thead><tr>${head.map(name =>
    `<th scope="col">${e(name)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function status(quantity) {
  return quantity ? '<span class="status in-stock">В наличии</span>' : '<span class="status out-of-stock">Нет в наличии</span>';
}

function operationTable(entries, compact) {
  if (!entries.length) return empty('Операций пока нет', 'Поступления и списания появятся здесь после проведения.');
  const headings = ['Дата и время', 'Товар', 'Операция', 'Количество', 'Сотрудник'];
  if (!compact) headings.push('Основание или комментарий');
  return table(headings, entries.map(entry => {
    const receipt = entry.kind === 'receipt';
    return `<tr><td class="nowrap">${dateTime.format(new Date(entry.created_at))}</td>
      <td><strong>${e(entry.product_name)}</strong><small>${e(entry.product_sku)}</small></td>
      <td><span class="status ${receipt ? 'in-stock' : 'out-of-stock'}">${receipt ? 'Поступление' : 'Списание'}</span></td>
      <td class="nowrap movement ${receipt ? 'positive' : ''}">${receipt ? '+' : '−'}${number.format(entry.quantity)} ${e(entry.unit)}</td>
      <td>${e(entry.operator)}</td>${compact ? '' : `<td>${e(entry.note || '—')}</td>`}</tr>`;
  }).join(''));
}

export function overview({ products, categories, entries, today }) {
  const metrics = [
    ['▤', 'Товарных позиций', products.length],
    ['◇', 'Категорий', categories.length],
    ['○', 'Нет в наличии', products.filter(item => !item.quantity).length],
    ['◷', 'Операций сегодня', today],
  ];
  return `<div class="metrics">${metrics.map(([icon, title, value]) => `<article class="metric">
    <span class="metric-icon" aria-hidden="true">${icon}</span><p>${title}</p><strong>${number.format(value)}</strong>
  </article>`).join('')}</div>
  <section class="panel" aria-labelledby="recent"><div class="panel-head">
     <h2 id="recent">Последние операции</h2><a class="text-link" href="/history">Вся история <span aria-hidden="true">→</span></a></div>
     ${operationTable(entries, true)}</section>`;
}

function categoryOptions(categories, selected, filter = false) {
  return `<option value="">${filter ? 'Все категории' : 'Выберите категорию'}</option>` +
    categories.map(category => `<option value="${category.id}"${category.id === selected ? ' selected' : ''}>${e(category.name)}</option>`).join('');
}

export function catalog({ products, categories, term, categoryId, path, canEdit, inventoryOnly }) {
  const filters = `<form class="filters" action="${path}" method="get">
    <label>Поиск<input type="search" name="q" placeholder="Название или артикул" value="${e(term)}" maxlength="100"></label>
    <label>Категория<select name="category">${categoryOptions(categories, categoryId, true)}</select></label>
    <button class="button" type="submit">Найти</button>
    ${term || categoryId ? button(path, 'Сбросить', 'quiet') : ''}</form>`;
  const columns = ['Товар', 'Артикул', 'Категория', 'Остаток', 'Наличие'];
  if (!inventoryOnly && canEdit) columns.push('Действия');
  const productRows = products.map(item => `<tr>
    <td><strong>${e(item.name)}</strong></td><td><span class="sku">${e(item.sku)}</span></td>
    <td>${e(item.category)}</td><td class="nowrap"><strong>${number.format(item.quantity)}</strong> ${e(item.unit)}</td>
    <td>${status(item.quantity)}</td>${!inventoryOnly && canEdit ? `<td><a class="text-link" href="/products/${item.id}/edit">Изменить</a></td>` : ''}
    </tr>`).join('');
  return `<section class="panel" aria-label="${inventoryOnly ? 'Список остатков' : 'Каталог'}">
    ${filters}${products.length ? table(columns, productRows) : empty(
    term || categoryId ? 'Товары не найдены' : 'Товаров пока нет',
    term || categoryId ? 'Попробуйте изменить условия поиска.' : 'Позиции появятся после добавления в каталог.')}</section>`;
}

export function categoryList(categories, canEdit) {
  const form = canEdit ? `<form method="post" action="/categories" class="filters">
    <label>Название новой категории<input name="name" required maxlength="80" placeholder="Например, упаковка"></label>
    <button type="submit" class="button primary">Добавить категорию</button></form>` : '';
  const columns = ['Категория', 'Товарных позиций'];
  if (canEdit) columns.push('Действия');
  return `<section class="panel" aria-label="Список категорий">${form}${categories.length ?
    table(columns, categories.map(item => `<tr><td><strong>${e(item.name)}</strong></td><td>${number.format(item.products)}</td>
      ${canEdit ? `<td><a class="text-link" href="/categories/${item.id}/edit">Изменить</a></td>` : ''}</tr>`).join(''))
    : empty('Категорий пока нет')}</section>`;
}

export function categoryForm(category) {
  return `<section class="panel form-panel"><form action="/categories/${category.id}" method="post" class="form">
    <label>Название<input name="name" value="${e(category.name)}" required maxlength="80"></label>
    <div class="actions"><button class="button primary" type="submit">Сохранить</button>${button('/categories', 'Отмена')}</div></form>
    <details class="remove"><summary>Удалить категорию</summary><p>Можно удалить категорию, которая не используется товарами.</p>
    <form action="/categories/${category.id}/delete" method="post"><button class="button danger" type="submit">Подтвердить удаление</button></form></details></section>`;
}

export function productForm(item, categories) {
  if (!categories.length) {
    return `<section class="panel form-panel"><p>Перед добавлением товара создайте категорию.</p>${button('/categories', 'Перейти к категориям', 'primary')}</section>`;
  }
  return `<section class="panel form-panel"><form method="post" action="${item ? `/products/${item.id}` : '/products'}" class="form">
    <label>Название<input name="name" value="${e(item?.name)}" maxlength="120" required></label>
    <div class="form-grid"><label>Артикул<input name="sku" value="${e(item?.sku)}" maxlength="32" required></label>
    <label>Единица измерения<input name="unit" value="${e(item?.unit ?? 'шт.')}" maxlength="16" required></label></div>
    <label>Категория<select name="category" required>${categoryOptions(categories, item?.category_id)}</select></label>
    <div class="actions"><button type="submit" class="button primary">${item ? 'Сохранить' : 'Добавить товар'}</button>${button('/products', 'Отмена')}</div></form>
    ${item ? `<details class="remove"><summary>Удалить товар</summary>
    <p>Удаление доступно при нулевом остатке. Записи в истории сохранятся.</p>
    <form method="post" action="/products/${item.id}/archive"><button type="submit" class="button danger">Подтвердить удаление</button></form></details>` : ''}
    </section>`;
}

export function operationForm({ products, kind, productId, requestId }) {
  if (!products.length) return `<section class="panel form-panel"><p>Для проведения операции в каталоге должен быть хотя бы один товар.</p>${button('/products', 'Открыть каталог')}</section>`;
  const writeoff = kind === 'writeoff';
  const productQuery = productId ? `&amp;product=${productId}` : '';
  return `<section class="panel form-panel">
    <nav class="actions operation-types" aria-label="Тип операции">
    <a class="button${writeoff ? '' : ' primary'}" href="/operations/new?kind=receipt${productQuery}"${writeoff ? '' : ' aria-current="page"'}>Поступление</a>
    <a class="button${writeoff ? ' primary' : ''}" href="/operations/new?kind=writeoff${productQuery}"${writeoff ? ' aria-current="page"' : ''}>Списание</a>
    </nav>
    <form method="post" action="/operations" class="form">
    <input type="hidden" name="requestId" value="${e(requestId)}">
    <input type="hidden" name="kind" value="${e(kind)}">
    <label>Товар<select name="product" required><option value="">Выберите товар</option>
    ${products.map(item => `<option value="${item.id}"${item.id === productId ? ' selected' : ''}>
    ${e(item.name)} · ${e(item.sku)} · остаток ${number.format(item.quantity)} ${e(item.unit)}</option>`).join('')}</select></label>
    <label>Количество<input name="quantity" type="number" min="1" max="1000000" step="1" inputmode="numeric" placeholder="0" required></label>
    ${writeoff
      ? '<label>Основание списания<textarea name="note" rows="3" maxlength="300" placeholder="Например, повреждение упаковки" required></textarea></label>'
      : '<label>Комментарий <span class="optional">необязательно</span><textarea name="note" rows="3" maxlength="300" placeholder="Комментарий к поступлению"></textarea></label>'}
    <div class="actions"><button type="submit" class="button primary">Провести операцию</button>${button('/', 'Отмена')}</div></form></section>`;
}

export function operationHistory({ entries, kind, start, end, page, hasNext }) {
  const filters = `<form action="/history" class="filters">
    <label>Тип операции<select name="kind"><option value="">Все операции</option>
    <option value="receipt"${kind === 'receipt' ? ' selected' : ''}>Поступление</option>
    <option value="writeoff"${kind === 'writeoff' ? ' selected' : ''}>Списание</option></select></label>
    <label>Дата с<input type="date" name="start" value="${e(start)}"></label>
    <label>Дата по<input type="date" name="end" value="${e(end)}"></label>
    <button type="submit" class="button">Применить</button>
    ${kind || start || end ? button('/history', 'Сбросить', 'quiet') : ''}</form>`;
  const pageUrl = nextPage => '/history?' + new URLSearchParams({ kind, start, end, page: nextPage });
  const pagination = page > 1 || hasNext ? `<nav class="pagination" aria-label="Страницы истории">
    ${page > 1 ? button(pageUrl(page - 1), '← Назад') : ''}<span>Страница ${page}</span>
    ${hasNext ? button(pageUrl(page + 1), 'Далее →') : ''}</nav>` : '';
  const body = entries.length ? operationTable(entries, false)
    : kind || start || end ? empty('Операции не найдены', 'Попробуйте изменить фильтры.') : operationTable([], false);
  return `<section class="panel" aria-label="Журнал операций">${filters}${body}${pagination}</section>`;
}

export function problem(title, description) {
  return `<section class="panel form-panel"><p>${e(description)}</p>${button('/', 'На главную')}</section>`;
}
