export function row(db, sql, ...params) {
  return db.prepare(sql).bind(...params).first();
}

export async function rows(db, sql, ...params) {
  return (await db.prepare(sql).bind(...params).all()).results;
}

export async function change(db, sql, ...params) {
  return (await db.prepare(sql).bind(...params).run()).meta.changes;
}

export const stock = `coalesce((SELECT sum(CASE WHEN o.kind = 'receipt' THEN o.quantity ELSE -o.quantity END)
  FROM operations o WHERE o.product_id = p.id), 0)`;

export const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ru');

export function categories(db) {
  return rows(db, `SELECT c.*, (SELECT count(*) FROM products p
    WHERE p.category_id = c.id AND p.archived_at IS NULL) AS products
    FROM categories c ORDER BY c.name_key`);
}

export function inventory(db, filters = {}) {
  return rows(db, `SELECT p.*, c.name AS category, ${stock} AS quantity FROM products p
    JOIN categories c ON c.id = p.category_id WHERE p.archived_at IS NULL
    AND (? = '' OR instr(p.search_key, ?) > 0) AND (? = 0 OR p.category_id = ?)
    ORDER BY p.search_key, p.id`, filters.term ?? '', filters.term ?? '',
  filters.category ?? 0, filters.category ?? 0);
}

export function product(db, id) {
  return row(db, `SELECT p.*, ${stock} AS quantity FROM products p
    WHERE p.id = ? AND p.archived_at IS NULL`, id);
}

export function history(db, filters = {}, limit = 100, offset = 0) {
  return rows(db, `SELECT o.*, u.display_name AS operator FROM operations o
    JOIN users u ON u.id = o.user_id
    WHERE (? = '' OR o.kind = ?) AND (? = '' OR o.created_at >= ?)
      AND (? = '' OR o.created_at < ?)
    ORDER BY o.created_at DESC, o.id DESC LIMIT ? OFFSET ?`,
  filters.kind ?? '', filters.kind ?? '', filters.from ?? '', filters.from ?? '',
  filters.until ?? '', filters.until ?? '', limit, offset);
}

export function countOperations(db, since) {
  return row(db, 'SELECT count(*) AS total FROM operations WHERE created_at >= ?', since);
}

export async function archiveProduct(db, id) {
  return change(db, `UPDATE products AS p SET archived_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE p.id = ? AND p.archived_at IS NULL AND ${stock} = 0`, id);
}

export async function recordOperation(db, entry, user) {
  const delta = entry.kind === 'receipt' ? entry.quantity : -entry.quantity;
  const inserted = await change(db, `INSERT INTO operations
    (request_id, product_id, user_id, kind, quantity, product_name, product_sku, unit, note)
    SELECT ?, p.id, ?, ?, ?, p.name, p.sku, p.unit, ? FROM products p
    WHERE p.id = ? AND p.archived_at IS NULL AND ${stock} + ? BETWEEN 0 AND 1000000000
    ON CONFLICT(request_id) DO NOTHING`,
  entry.requestId, user.id, entry.kind, entry.quantity, entry.note, entry.productId, delta);
  if (inserted) return 'ok';

  const previous = await row(db, 'SELECT * FROM operations WHERE request_id = ?', entry.requestId);
  if (previous) {
    return previous.product_id === entry.productId && previous.user_id === user.id &&
      previous.kind === entry.kind && previous.quantity === entry.quantity &&
      previous.note === entry.note ? 'ok' : 'duplicate';
  }
  return await product(db, entry.productId) ? 'quantity' : 'missing';
}
