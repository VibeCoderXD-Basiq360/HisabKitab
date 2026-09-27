import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? '';
const databaseName = testDatabaseUrl ? new URL(testDatabaseUrl).pathname.slice(1) : '';
// These tests empty users and every table that refers to it. Refusing every other
// database is what stops them ever running against real data.
if (!databaseName.endsWith('_test')) {
  throw new Error(`Refusing to run: TEST_DATABASE_URL must name a database ending in _test (got "${databaseName}")`);
}

const PORT = '3999';
const baseUrl = `http://localhost:${PORT}/api`;
const backendDir = fileURLToPath(new URL('..', import.meta.url));
const testEnv = { ...process.env, DATABASE_URL: testDatabaseUrl, PORT };
const db = new pg.Client({ connectionString: testDatabaseUrl });
let server;

function startServer() {
  return new Promise((resolve, reject) => {
    server = spawn(process.execPath, ['src/server.js'], { cwd: backendDir, env: testEnv });
    server.stderr.pipe(process.stderr);
    server.stdout.once('data', resolve);
    server.once('exit', (code) => reject(new Error(`Server exited with code ${code}`)));
  });
}

async function call(method, path, { body, cookie, rawBody } = {}) {
  const headers = {};
  if (body !== undefined || rawBody !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  const response = await fetch(baseUrl + path, { method, headers, body: rawBody ?? JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : null, setCookie: response.headers.get('set-cookie') };
}

function cookieFrom(response) {
  return response.setCookie.split(';')[0];
}

async function logIn(email, password) {
  return cookieFrom(await call('POST', '/auth/login', { body: { email, password } }));
}

before(async () => {
  execFileSync(process.execPath, ['src/migrate.js'], { cwd: backendDir, env: testEnv });
  await db.connect();
  await db.query('TRUNCATE users RESTART IDENTITY CASCADE');
  await startServer();
});

after(async () => {
  // Wait for the port to be released before the next test file starts.
  server.kill();
  await once(server, 'exit');
  await db.query('TRUNCATE users RESTART IDENTITY CASCADE');
  await db.end();
});

// Tests run in order and share the user registered in the first one.

test('register', async () => {
  const body = { email: '  Avinash@Example.com ', password: 'hunter22', displayName: ' Avinash ' };
  let response = await call('POST', '/auth/register', { body });
  assert.equal(response.status, 201);
  assert.deepEqual(response.json, { id: '1', email: 'avinash@example.com', displayName: 'Avinash' });
  assert.equal(response.setCookie, null, 'register does not log in');

  response = await call('POST', '/auth/register', { body: { ...body, email: 'AVINASH@example.com' } });
  assert.equal(response.status, 409, 'same email in another case is a duplicate');

  const invalidBodies = [
    { email: 'b@x.com', password: 'short', displayName: 'B' },
    { email: 'not-an-email', password: 'hunter22', displayName: 'B' },
    { email: 'b@x.com', password: 'hunter22', displayName: '   ' },
  ];
  for (const invalid of invalidBodies) {
    response = await call('POST', '/auth/register', { body: invalid });
    assert.equal(response.status, 400, JSON.stringify(invalid));
    assert.equal(typeof response.json.error, 'string');
  }

  assert.equal((await call('POST', '/auth/register')).status, 400, 'no body');
});

test('unreadable body gets a fixed message, not the parser text', async () => {
  const response = await call('POST', '/auth/register', { rawBody: '{bad json' });
  assert.equal(response.status, 400);
  assert.deepEqual(response.json, { error: 'Request body could not be read' });
});

test('login', async () => {
  let response = await call('POST', '/auth/login', { body: { email: 'avinash@example.com', password: 'wrongpass' } });
  assert.equal(response.status, 401);
  response = await call('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'hunter22' } });
  assert.deepEqual(response.json, { error: 'Wrong email or password' }, 'unknown email gets the same message');

  response = await call('POST', '/auth/login', { body: { email: ' AVINASH@example.com', password: 'hunter22' } });
  assert.equal(response.status, 200);
  assert.match(response.setCookie, /HttpOnly/i);
  assert.match(response.setCookie, /Secure/i);
  assert.match(response.setCookie, /SameSite=Lax/i);
  assert.match(response.setCookie, /Max-Age=2592000/, '30 days');

  const token = cookieFrom(response).split('=')[1];
  const sessions = await db.query('SELECT token_hash FROM sessions');
  assert.ok(sessions.rows.every((row) => row.token_hash !== token), 'raw token is not stored');

  const users = await db.query('SELECT password_hash FROM users');
  assert.match(users.rows[0].password_hash, /^scrypt:32768:8:1:[0-9a-f]{32}:[0-9a-f]{128}$/);
});

test('session lookup, touch and idle expiry', async () => {
  const phone = await logIn('avinash@example.com', 'hunter22');
  assert.equal((await call('GET', '/auth/me')).status, 401, 'no cookie');
  assert.equal((await call('GET', '/auth/me', { cookie: 'session=deadbeef' })).status, 401, 'forged cookie');

  let response = await call('GET', '/auth/me', { cookie: `other=1; ${phone}` });
  assert.equal(response.status, 200);
  assert.equal(response.json.email, 'avinash@example.com');
  assert.equal(response.setCookie, null, 'fresh session is not re-sent');

  await db.query("UPDATE sessions SET last_used_at = now() - interval '2 days'");
  response = await call('GET', '/auth/me', { cookie: phone });
  assert.match(response.setCookie, /Max-Age=2592000/, 'cookie re-sent on touch');
  const tokenHash = createHash('sha256').update(phone.split('=')[1]).digest('hex');
  const touched = await db.query(
    "SELECT last_used_at > now() - interval '1 minute' AS fresh FROM sessions WHERE token_hash = $1",
    [tokenHash],
  );
  assert.equal(touched.rows[0].fresh, true, 'last used time moved forward');

  await db.query("UPDATE sessions SET last_used_at = now() - interval '31 days'");
  assert.equal((await call('GET', '/auth/me', { cookie: phone })).status, 401, '31 days idle');
});

test('change password logs out every other device', async () => {
  const phoneA = await logIn('avinash@example.com', 'hunter22');
  const phoneB = await logIn('avinash@example.com', 'hunter22');
  const change = (cookie, currentPassword, newPassword) =>
    call('POST', '/auth/password', { cookie, body: { currentPassword, newPassword } });

  assert.equal((await change(phoneA, 'wrongpass', 'newpass99')).status, 400);
  assert.equal((await change(phoneA, 'hunter22', 'short')).status, 400);
  assert.equal((await change(null, 'hunter22', 'newpass99')).status, 401);
  assert.equal((await change(phoneA, 'hunter22', 'newpass99')).status, 204);

  assert.equal((await call('GET', '/auth/me', { cookie: phoneA })).status, 200, 'this device stays in');
  assert.equal((await call('GET', '/auth/me', { cookie: phoneB })).status, 401, 'other device is out');
  const oldLogin = await call('POST', '/auth/login', { body: { email: 'avinash@example.com', password: 'hunter22' } });
  assert.equal(oldLogin.status, 401);
  const newLogin = await call('POST', '/auth/login', { body: { email: 'avinash@example.com', password: 'newpass99' } });
  assert.equal(newLogin.status, 200);
});

test('logout', async () => {
  const phone = await logIn('avinash@example.com', 'newpass99');
  const response = await call('POST', '/auth/logout', { cookie: phone });
  assert.equal(response.status, 204);
  assert.match(response.setCookie, /Expires=Thu, 01 Jan 1970/, 'cookie cleared');
  assert.equal((await call('GET', '/auth/me', { cookie: phone })).status, 401);
  assert.equal((await call('POST', '/auth/logout')).status, 401, 'logout needs a session');
});

test('login locks out after 5 wrong passwords', async () => {
  await call('POST', '/auth/register', { body: { email: 'dad@example.com', password: 'dadpass11', displayName: 'Dad' } });
  for (let attempt = 0; attempt < 5; attempt++) {
    await call('POST', '/auth/login', { body: { email: 'dad@example.com', password: `guess${attempt}` } });
  }
  const locked = await call('POST', '/auth/login', { body: { email: 'dad@example.com', password: 'dadpass11' } });
  assert.equal(locked.status, 429, 'locked even with the right password');
  const other = await call('POST', '/auth/login', { body: { email: 'avinash@example.com', password: 'newpass99' } });
  assert.equal(other.status, 200, 'other emails are not locked');
});

test('change-password shares the lockout counter with login', async () => {
  await call('POST', '/auth/register', { body: { email: 'mum@example.com', password: 'mumpass11', displayName: 'Mum' } });
  const stolenPhone = await logIn('mum@example.com', 'mumpass11');
  const hashBefore = await db.query("SELECT password_hash FROM users WHERE email = 'mum@example.com'");
  const change = (currentPassword) =>
    call('POST', '/auth/password', { cookie: stolenPhone, body: { currentPassword, newPassword: 'thiefpass1' } });

  for (let attempt = 0; attempt < 5; attempt++) {
    assert.equal((await change(`guess${attempt}`)).status, 400);
  }
  assert.equal((await change('mumpass11')).status, 429, 'locked even with the right password');
  const login = await call('POST', '/auth/login', { body: { email: 'mum@example.com', password: 'mumpass11' } });
  assert.equal(login.status, 429, 'login for the same email and IP is locked too');

  const hashAfter = await db.query("SELECT password_hash FROM users WHERE email = 'mum@example.com'");
  assert.equal(hashAfter.rows[0].password_hash, hashBefore.rows[0].password_hash);
});

test('database rejects an email that is not trimmed and lowercased', async () => {
  await assert.rejects(
    db.query("INSERT INTO users (email, display_name, password_hash) VALUES ('Upper@x.com', 'U', 'x')"),
    { code: '23514' },
  );
});

test('health', async () => {
  assert.deepEqual((await call('GET', '/health')).json, { ok: true });
});
