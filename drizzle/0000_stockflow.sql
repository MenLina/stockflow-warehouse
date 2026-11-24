CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  login TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')),
  password_hash TEXT
);
--> statement-breakpoint
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  search_key TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  unit TEXT NOT NULL,
  archived_at TEXT
);
--> statement-breakpoint
CREATE TABLE operations (
  id INTEGER PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('receipt', 'writeoff')),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  unit TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
--> statement-breakpoint
CREATE INDEX operations_product_id ON operations(product_id);
--> statement-breakpoint
CREATE INDEX products_category_id ON products(category_id);
--> statement-breakpoint
CREATE INDEX operations_created_at ON operations(created_at DESC);
