import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? '';
const databaseName = testDatabaseUrl ? new URL(testDatabaseUrl).pathname.slice(1) : '';
// Tests empty users and every table that refers to it. Refusing every other
// database is what stops them ever running against real data. This runs on
// import, so no test file can skip it.
if (!databaseName.endsWith('_test')) {
  throw new Error(`Refusing to run: TEST_DATABASE_URL must name a database ending in _test (got "${databaseName}")`);
}

const PORT = '3999';
const baseUrl = `http://localhost:${PORT}/api`;
const backendDir = fileURLToPath(new URL('..', import.meta.url));
const testEnv = { ...process.env, DATABASE_URL: testDatabaseUrl, PORT };
const EMPTY_DATABASE = 'TRUNCATE users RESTART IDENTITY CASCADE';

export const db = new pg.Client({ connectionString: testDatabaseUrl });
let server;

export async function startTestServer() {
  execFileSync(process.execPath, ['src/migrate.js'], { cwd: backendDir, env: testEnv });
  await db.connect();
  await db.query(EMPTY_DATABASE);
  server = spawn(process.execPath, ['src/server.js'], { cwd: backendDir, env: testEnv });
  server.stderr.pipe(process.stderr);
  await new Promise((resolve, reject) => {
    server.stdout.once('data', resolve);
    server.once('exit', (code) => reject(new Error(`Server exited with code ${code}`)));
  });
}

export async function stopTestServer() {
  // Wait for the port to be released before the next test file starts.
  server.kill();
  await once(server, 'exit');
  await db.query(EMPTY_DATABASE);
  await db.end();
}

export async function call(method, path, { body, rawBody, cookie } = {}) {
  const headers = {};
  if (body !== undefined || rawBody !== undefined) headers['content-type'] = 'application/json';
  if (cookie) headers.cookie = cookie;
  const response = await fetch(baseUrl + path, { method, headers, body: rawBody ?? JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, json: text ? JSON.parse(text) : null, setCookie: response.headers.get('set-cookie') };
}

// Returns a `call` that sends this cookie, unless the options name another
// cookie (or null for nobody).
export function callAs(cookie) {
  return (method, path, options = {}) => call(method, path, { cookie, ...options });
}

export async function logIn(email, password) {
  const response = await call('POST', '/auth/login', { body: { email, password } });
  return response.setCookie.split(';')[0];
}

export async function registerAndLogIn(email) {
  await call('POST', '/auth/register', { body: { email, password: 'password1', displayName: email } });
  return logIn(email, 'password1');
}
