import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, startTestServer, stopTestServer, callAs, registerAndLogIn } from './harness.mjs';
import { COLOURS } from '../src/categories/handlers.js';

let me;
let stranger;
const ids = {};

// Calls are as `me` unless they pass `cookie`.
let call;

before(async () => {
  await startTestServer();
  me = await registerAndLogIn('me@example.com');
  stranger = await registerAndLogIn('stranger@example.com');
  call = callAs(me);
});

after(stopTestServer);

test('create', async () => {
  let response = await call('POST', '/categories', { body: { name: ' Groceries ', colour: 'saffron' } });
  assert.equal(response.status, 201);
  assert.deepEqual(response.json, { id: response.json.id, name: 'Groceries', colour: 'saffron' });
  ids.groceries = response.json.id;

  response = await call('POST', '/categories', { body: { name: 'Fuel', colour: 'slate' } });
  ids.fuel = response.json.id;

  const invalidBodies = [
    [{ name: '   ', colour: 'sky' }, 'blank name'],
    [{ colour: 'sky' }, 'missing name'],
    [{ name: 'Rent' }, 'missing colour'],
    [{ name: 'Rent', colour: 'lime' }, 'a UI token is not a category colour'],
    [{ name: 'Rent', colour: '#FF0000' }, 'hex is not a colour key'],
    [{ name: 'Rent', colour: 'Sky' }, 'keys are lowercase'],
  ];
  for (const [body, label] of invalidBodies) {
    response = await call('POST', '/categories', { body });
    assert.equal(response.status, 400, label);
    assert.equal(typeof response.json.error, 'string', label);
  }

  response = await call('POST', '/categories', { body: { name: 'Groceries', colour: 'teal' } });
  assert.equal(response.status, 409, 'duplicate name');
  assert.equal((await call('POST', '/categories', { cookie: null, body: { name: 'X', colour: 'sky' } })).status, 401);
});

test('list is scoped to the owner, in creation order', async () => {
  const mine = await call('GET', '/categories');
  assert.deepEqual(mine.json.map((category) => category.id), [ids.groceries, ids.fuel]);
  assert.deepEqual((await call('GET', '/categories', { cookie: stranger })).json, []);

  const edit = await call('PATCH', `/categories/${ids.groceries}`, { cookie: stranger, body: { name: 'Mine now' } });
  assert.equal(edit.status, 404);
  assert.equal((await call('POST', `/categories/${ids.groceries}/archive`, { cookie: stranger })).status, 404);
  assert.equal((await call('PATCH', '/categories/abc', { body: { name: 'X' } })).status, 404);
  const unchanged = await db.query('SELECT name, archived_at FROM categories WHERE id = $1', [ids.groceries]);
  assert.deepEqual(unchanged.rows[0], { name: 'Groceries', archived_at: null });
});

test('edit', async () => {
  let response = await call('PATCH', `/categories/${ids.groceries}`, { body: { colour: 'sand' } });
  assert.equal(response.status, 200);
  assert.deepEqual(response.json, { id: ids.groceries, name: 'Groceries', colour: 'sand' }, 'name kept');

  response = await call('PATCH', `/categories/${ids.groceries}`, { body: { name: ' Food ' } });
  assert.deepEqual(response.json, { id: ids.groceries, name: 'Food', colour: 'sand' }, 'colour kept');

  assert.equal((await call('PATCH', `/categories/${ids.groceries}`, { body: { colour: 'green' } })).status, 400);
  assert.equal((await call('PATCH', `/categories/${ids.groceries}`, { body: { name: '' } })).status, 400);
  assert.equal((await call('PATCH', `/categories/${ids.groceries}`, { body: { name: 'Fuel' } })).status, 409);
});

test('unknown fields are rejected, not ignored', async () => {
  let response = await call('POST', '/categories', { body: { name: 'Rent', color: 'sky' } });
  assert.equal(response.status, 400);
  assert.equal(response.json.error, 'Unknown field "color". Allowed: name, colour');

  response = await call('PATCH', `/categories/${ids.groceries}`, { body: { color: 'sky' } });
  assert.equal(response.status, 400);
  const stored = await db.query('SELECT colour FROM categories WHERE id = $1', [ids.groceries]);
  assert.equal(stored.rows[0].colour, 'sand', 'nothing changed');
});

test('archive: hidden, frozen, name reusable', async () => {
  assert.equal((await call('POST', `/categories/${ids.fuel}/archive`)).status, 204);
  assert.ok(!(await call('GET', '/categories')).json.some((category) => category.id === ids.fuel), 'hidden');
  assert.equal((await call('POST', `/categories/${ids.fuel}/archive`)).status, 409, 'already archived');
  assert.equal((await call('PATCH', `/categories/${ids.fuel}`, { body: { name: 'Petrol' } })).status, 409);

  const stored = await db.query('SELECT name, archived_at IS NOT NULL AS archived FROM categories WHERE id = $1', [ids.fuel]);
  assert.deepEqual(stored.rows[0], { name: 'Fuel', archived: true }, 'kept, not deleted');

  const again = await call('POST', '/categories', { body: { name: 'Fuel', colour: 'plum' } });
  assert.equal(again.status, 201, 'an archived name can be reused');
});

test("the handler's colour list matches the database constraint", async () => {
  const result = await db.query(
    `SELECT pg_get_constraintdef(oid) AS definition
     FROM pg_constraint
     WHERE conrelid = 'categories'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%colour%'`,
  );
  assert.equal(result.rows.length, 1, 'exactly one colour constraint');
  const inDatabase = [...result.rows[0].definition.matchAll(/'([^']+)'::text/g)].map((match) => match[1]);
  assert.deepEqual([...inDatabase].sort(), [...COLOURS].sort());
});

test('database only accepts the eight colours', async () => {
  const [{ id: userId }] = (await db.query("SELECT id FROM users WHERE email = 'me@example.com'")).rows;
  await assert.rejects(
    db.query("INSERT INTO categories (user_id, name, colour) VALUES ($1, 'Z', 'lime')", [userId]),
    { code: '23514' },
  );
});
