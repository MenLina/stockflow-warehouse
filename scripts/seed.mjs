import { normalize } from '../worker/store.js';

export function seedDemo(db) {
  const categories = ['Упаковка', 'Офисные товары', 'Хозяйственные товары', 'Расходные материалы'];
  const addCategory = db.prepare('INSERT INTO categories (name, name_key) VALUES (?, ?)');
  const categoryIds = categories.map(name => Number(addCategory.run(name, normalize(name)).lastInsertRowid));

  const products = [
    ['UP-001', 'Коробка 400 × 300 мм', 0, 'шт.', 120],
    ['UP-002', 'Плёнка стрейч 500 мм', 0, 'рул.', 35],
    ['UP-003', 'Скотч упаковочный', 0, 'рул.', 58],
    ['OF-001', 'Бумага А4, 500 листов', 1, 'упак.', 24],
    ['OF-002', 'Маркер перманентный', 1, 'шт.', 16],
    ['HO-001', 'Перчатки рабочие', 2, 'пар', 42],
    ['HO-002', 'Мешки для мусора 60 л', 2, 'рул.', 0],
    ['RM-001', 'Этикетка 58 × 40 мм', 3, 'рул.', 12],
    ['RM-002', 'Лезвия для ножа 18 мм', 3, 'упак.', 0],
  ];
  const addProduct = db.prepare('INSERT INTO products (sku, name, search_key, category_id, unit) VALUES (?, ?, ?, ?, ?)');
  const addOperation = db.prepare(`INSERT INTO operations
    (request_id, product_id, user_id, kind, quantity, product_name, product_sku, unit, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const now = Date.now();
  for (const [i, [sku, name, category, unit, balance]] of products.entries()) {
    const result = addProduct.run(sku, name, normalize(`${name} ${sku}`), categoryIds[category], unit);
    const id = Number(result.lastInsertRowid);
    const used = i < 6 ? 5 + i : 10;
    addOperation.run(`demo-receipt-${id}`, id, 1, 'receipt', balance + used, name, sku, unit,
      'Начальный приход', new Date(now - (i + 2) * 86400000).toISOString());
    addOperation.run(`demo-writeoff-${id}`, id, 2, 'writeoff', used, name, sku, unit,
      i % 2 ? 'Израсходовано на хозяйственные нужды' : 'Выдано в работу', new Date(now - (i + 1) * 60 * 60000).toISOString());
  }
}
