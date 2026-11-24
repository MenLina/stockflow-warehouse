import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { DatabaseSync } from 'node:sqlite';
import { parseArgs, promisify } from 'node:util';
import worker from '../worker/index.js';
import { seedDemo } from './seed.mjs';

const { values: args } = parseArgs({ options: {
  demo: { type: 'boolean' },
  host: { type: 'string' },
  port: { type: 'string' },
  strictPort: { type: 'boolean' },
}});
const demo = args.demo === true;
const railwayVolume = demo ? undefined : process.env.RAILWAY_VOLUME_MOUNT_PATH;
if (!demo && process.env.RAILWAY_ENVIRONMENT_ID && !railwayVolume) {
  throw new Error('Подключите к сервису Railway постоянный диск. Путь для подключения — /data.');
}
const dataDir = railwayVolume || process.env.STOCKFLOW_DATA_DIR || `.stockflow/${demo ? 'demo' : 'local'}`;
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const database = new DatabaseSync(join(dataDir, 'stockflow.sqlite'));
database.exec('PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

function hash(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

database.exec('BEGIN IMMEDIATE');
try {
  if (database.prepare('PRAGMA user_version').get().user_version === 0) {
    const adminPassword = demo ? 'stockflow-admin' : process.env.STOCKFLOW_ADMIN_PASSWORD;
    const employeePassword = demo ? 'stockflow-staff' : process.env.STOCKFLOW_EMPLOYEE_PASSWORD;
    if (!demo && (!adminPassword || !employeePassword ||
      [adminPassword, employeePassword].some(password => password.length < 12 || password.length > 256))) {
      throw new Error('Задайте STOCKFLOW_ADMIN_PASSWORD и STOCKFLOW_EMPLOYEE_PASSWORD (12–256 символов).');
    }
    database.exec(readFileSync(new URL('../drizzle/0000_stockflow.sql', import.meta.url), 'utf8'));
    const insert = database.prepare('INSERT INTO users (login, display_name, role, password_hash) VALUES (?, ?, ?, ?)');
    insert.run('admin', 'Администратор', 'admin', hash(adminPassword));
    insert.run('employee', 'Сотрудник склада', 'employee', hash(employeePassword));
    if (demo) seedDemo(database);
    database.exec('PRAGMA user_version = 1');
  }
  database.exec('COMMIT');
} catch (error) {
  database.exec('ROLLBACK');
  throw error;
}

const keyFile = join(dataDir, 'session-key');
try {
  writeFileSync(keyFile, randomBytes(48).toString('hex'), { flag: 'wx', mode: 0o600 });
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
}
const secret = readFileSync(keyFile, 'utf8');
const dummyHash = hash(randomBytes(32).toString('hex'));
const deriveKey = promisify(scrypt);

const env = {
  DB: {
    prepare(sql) {
      const statement = database.prepare(sql);
      return { bind(...params) {
        return {
          first: () => statement.get(...params) ?? null,
          all: () => ({ results: statement.all(...params) }),
          run: () => ({ meta: { changes: Number(statement.run(...params).changes) } }),
        };
      }};
    },
  },
  LOCAL: {
    demo,
    secret,
    async verify(password, passwordHash) {
      const [salt, hash] = (passwordHash || dummyHash).split(':');
      const derived = await deriveKey(password, salt, 64);
      return timingSafeEqual(derived, Buffer.from(hash, 'hex')) && Boolean(passwordHash);
    },
  },
};

const port = Number(args.port || process.env.PORT || 5173);
const host = args.host || '127.0.0.1';
const server = createServer(async (incoming, outgoing) => {
  try {
    const protocol = incoming.headers['x-forwarded-proto']?.split(',')[0] === 'https' ? 'https' : 'http';
    const host = incoming.headers['x-forwarded-host']?.split(',')[0] || incoming.headers.host;
    const headers = new Headers(incoming.headers);
    headers.set('stockflow-client-address', incoming.socket.remoteAddress || 'local');
    const init = { method: incoming.method, headers };
    if (!['GET', 'HEAD'].includes(incoming.method)) {
      init.body = Readable.toWeb(incoming);
      init.duplex = 'half';
    }
    const request = new Request(new URL(incoming.url, `${protocol}://${host}`), init);
    const response = await worker.fetch(request, env);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body && incoming.method !== 'HEAD') Readable.fromWeb(response.body).pipe(outgoing);
    else outgoing.end();
  } catch (error) {
    console.error(error);
    if (!outgoing.headersSent) outgoing.writeHead(500);
    outgoing.end('Internal Server Error');
  }
});

server.listen(port, host, () => console.log(`StockFlow · http://${host}:${server.address().port}`));
