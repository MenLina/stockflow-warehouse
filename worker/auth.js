import { row } from './store.js';

const encoder = new TextEncoder();
const sessionLife = 8 * 60 * 60;
const sessionCookie = 'stockflow_session';

function base64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function sign(payload, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(await crypto.subtle.sign('HMAC', key, encoder.encode(payload)));
}

function signaturesMatch(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

export async function makeSession(user, env, url) {
  const expiry = Math.floor(Date.now() / 1000) + sessionLife;
  const payload = `${user.id}.${expiry}`;
  const signature = await sign(payload, env.LOCAL.secret);
  return cookie(`${payload}.${signature}`, sessionLife, url);
}

export function endSession(url) {
  return cookie('', 0, url);
}

function cookie(value, maxAge, url) {
  const secure = url.protocol === 'https:' ? '; Secure' : '';
  return `${sessionCookie}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}

export async function currentUser(request, env) {
  if (!env.LOCAL) return null;
  const prefix = `${sessionCookie}=`;
  const session = request.headers.get('cookie')?.split(/;\s*/).find(item => item.startsWith(prefix));
  const match = session?.slice(prefix.length).match(/^(\d+)\.(\d+)\.([A-Za-z0-9_-]{43})$/);
  if (!match || Number(match[2]) <= Date.now() / 1000) return null;
  const [, id, expiry, signature] = match;
  if (!signaturesMatch(signature, await sign(`${id}.${expiry}`, env.LOCAL.secret))) return null;
  return row(env.DB, 'SELECT id, login, display_name, role FROM users WHERE id = ?', Number(id));
}

export async function verifyLogin(env, login, password) {
  if (!env.LOCAL || password.length > 256) return null;
  const user = await row(env.DB, 'SELECT * FROM users WHERE login = ?', login);
  const accepted = await env.LOCAL.verify(password, user?.password_hash);
  return accepted ? user : null;
}
