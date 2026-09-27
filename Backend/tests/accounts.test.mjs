import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, startTestServer, stopTestServer, callAs, registerAndLogIn } from './harness.mjs';

let me;
let stranger;

// Calls are as `me` unless they pass `cookie`.
let call;

const bank = { name: ' HDFC savings ', kind: 'bank', openingBalance: '31000', openingDate: '2026-09-01' };
const card = { name: 'HDFC credit card', kind: 'credit_card', openingOutstanding: '8200', openingDate: '2026-09-01', billingDay: 5, dueDay: 18, lastFour: '4821' };
const ids = {};

before(async () => {
  await startTestServer();
  me = await registerAndLogIn('me@example.com');
  stranger = await registerAndLogIn('stranger@example.com');
  call = callAs(me);
});

after(stopTestServer);

test('create bank, card, cash', async () => {
  let r = await call('POST', '/accounts', { body: bank });
  assert.equal(r.status, 201);
  assert.deepEqual(r.json, { id: r.json.id, name: 'HDFC savings', kind: 'bank', openingDate: '2026-09-01', openingBalance: '31000.00', balance: '31000.00', archivedAt: null });
  ids.bank = r.json.id;

  r = await call('POST', '/accounts', { body: card });
  assert.equal(r.status, 201);
  assert.equal(r.json.outstanding, '8200.00');
  assert.equal(r.json.openingOutstanding, '8200.00');
  assert.equal(r.json.balance, undefined, 'a card never gets balance');
  assert.deepEqual([r.json.billingDay, r.json.dueDay, r.json.lastFour], [5, 18, '4821']);
  ids.card = r.json.id;
  const stored = await db.query('SELECT opening_balance FROM accounts WHERE id = $1', [ids.card]);
  assert.equal(stored.rows[0].opening_balance, '-8200.00', 'stored as money in the account');

  r = await call('POST', '/accounts', { body: { name: 'Cash', kind: 'cash', openingBalance: '3150.5', openingDate: '2026-09-01' } });
  assert.equal(r.json.balance, '3150.50');
  ids.cash = r.json.id;
});

test('create rejects bad input', async () => {
  const bad = [
    [{ ...bank, name: 'X', openingBalance: 31000 }, 'money as a JSON number'],
    [{ ...bank, name: 'X', openingBalance: '1.005' }, '3 decimals'],
    [{ ...bank, name: 'X', openingBalance: '12345678901' }, 'too large'],
    [{ ...bank, name: 'X', openingBalance: undefined }, 'missing opening'],
    [{ ...bank, name: 'X', openingBalance: undefined, openingOutstanding: '5' }, 'bank with openingOutstanding'],
    [{ ...bank, name: 'X', billingDay: 5 }, 'bank with card field'],
    [{ ...card, name: 'X', lastFour: undefined }, 'card missing lastFour'],
    [{ ...card, name: 'X', lastFour: '12a4' }, 'lastFour not digits'],
    [{ ...card, name: 'X', billingDay: 32 }, 'billingDay 32'],
    [{ ...card, name: 'X', openingBalance: '5' }, 'card with openingBalance'],
    [{ ...bank, name: 'X', openingDate: '2026-02-30' }, 'impossible date'],
    [{ ...bank, name: 'X', openingDate: undefined }, 'missing date'],
    [{ ...bank, name: 'X', kind: 'loan' }, 'unknown kind'],
    [{ ...bank, name: '   ' }, 'blank name'],
  ];
  for (const [body, label] of bad) {
    const r = await call('POST', '/accounts', { body });
    assert.equal(r.status, 400, label);
    assert.equal(typeof r.json.error, 'string', label);
  }
  assert.equal((await call('POST', '/accounts', { body: bank })).status, 409, 'duplicate name');
  assert.equal((await call('POST', '/accounts', { body: bank, cookie: null })).status, 401);
});

test('list and get are scoped to the owner', async () => {
  const r = await call('GET', '/accounts');
  assert.deepEqual(r.json.map((a) => a.id), [ids.bank, ids.card, ids.cash]);
  assert.deepEqual((await call('GET', '/accounts', { cookie: stranger })).json, []);
  for (const [method, path] of [
    ['GET', `/accounts/${ids.bank}`], ['PATCH', `/accounts/${ids.bank}`],
    ['POST', `/accounts/${ids.bank}/archive`], ['GET', `/accounts/${ids.bank}/ledger`],
  ]) {
    const response = await call(method, path, { cookie: stranger, body: method === 'GET' ? undefined : { name: 'Mine now' } });
    assert.equal(response.status, 404, `stranger ${method} ${path}`);
  }
  assert.equal((await call('GET', '/accounts/abc')).status, 404);
  assert.equal((await call('GET', '/accounts/99999999999999999999')).status, 404);
  assert.equal((await call('GET', '/nope')).status, 404, 'unknown paths still 404, not 401');
  const unchanged = await db.query('SELECT name FROM accounts WHERE id = $1', [ids.bank]);
  assert.equal(unchanged.rows[0].name, 'HDFC savings');
});

test('edit', async () => {
  let r = await call('PATCH', `/accounts/${ids.card}`, { body: { name: 'HDFC Regalia', openingOutstanding: '9000' } });
  assert.equal(r.status, 200);
  assert.equal(r.json.name, 'HDFC Regalia');
  assert.equal(r.json.outstanding, '9000.00');
  assert.equal(r.json.lastFour, '4821', 'untouched fields kept');
  r = await call('PATCH', `/accounts/${ids.bank}`, { body: { openingBalance: '-500' } });
  assert.equal(r.json.balance, '-500.00');
  assert.equal((await call('PATCH', `/accounts/${ids.bank}`, { body: { kind: 'cash' } })).status, 400);
  assert.equal((await call('PATCH', `/accounts/${ids.bank}`, { body: { openingDate: '2026-01-01' } })).status, 400);
  assert.equal((await call('PATCH', `/accounts/${ids.card}`, { body: { dueDay: 0 } })).status, 400);
  assert.equal((await call('PATCH', `/accounts/${ids.bank}`, { body: { dueDay: 3 } })).status, 400);
  assert.equal((await call('PATCH', `/accounts/${ids.bank}`, { body: { name: 'Cash' } })).status, 409, 'rename onto existing name');
});

test('unknown fields are rejected, not ignored', async () => {
  let response = await call('POST', '/accounts', { body: { ...bank, name: 'X', colour: 'sky' } });
  assert.equal(response.status, 400);
  assert.match(response.json.error, /^Unknown field "colour"\. Allowed: /);

  response = await call('PATCH', `/accounts/${ids.bank}`, { body: { balance: '0' } });
  assert.equal(response.status, 400, 'balance is calculated, never set');
  assert.match(response.json.error, /^Unknown field "balance"/);
  assert.equal((await call('GET', `/accounts/${ids.bank}`)).json.balance, '-500.00', 'nothing changed');
});

test('archive is blocked unless balance is zero, and says the balance', async () => {
  let r = await call('POST', `/accounts/${ids.card}/archive`);
  assert.equal(r.status, 409);
  assert.equal(r.json.error, 'This card still has ₹9,000.00 outstanding. Clear it before archiving.');
  r = await call('POST', `/accounts/${ids.bank}/archive`);
  assert.equal(r.json.error, 'This account still has a balance of -₹500.00. Bring it to zero before archiving.');
  const big = await call('POST', '/accounts', { body: { ...bank, name: 'Big', openingBalance: '3100000' } });
  r = await call('POST', `/accounts/${big.json.id}/archive`);
  assert.match(r.json.error, /₹31,00,000\.00/);
});

test('archived accounts: hidden, readable, frozen, name reusable', async () => {
  const wallet = await call('POST', '/accounts', { body: { name: 'Paytm', kind: 'wallet', openingBalance: '0', openingDate: '2026-09-10' } });
  assert.equal((await call('POST', `/accounts/${wallet.json.id}/archive`)).status, 204);
  assert.ok(!(await call('GET', '/accounts')).json.some((a) => a.id === wallet.json.id), 'hidden from list');
  const one = await call('GET', `/accounts/${wallet.json.id}`);
  assert.equal(one.status, 200);
  assert.notEqual(one.json.archivedAt, null);
  assert.equal((await call('PATCH', `/accounts/${wallet.json.id}`, { body: { name: 'New' } })).status, 409);
  assert.equal((await call('POST', `/accounts/${wallet.json.id}/archive`)).status, 409);
  assert.equal((await call('GET', `/accounts/${wallet.json.id}/ledger`)).status, 200);
  const again = await call('POST', '/accounts', { body: { name: 'Paytm', kind: 'wallet', openingBalance: '0', openingDate: '2026-09-10' } });
  assert.equal(again.status, 201, 'archived name can be reused');
});

test('ledger', async () => {
  let r = await call('GET', `/accounts/${ids.cash}/ledger`);
  assert.deepEqual(r.json, { entries: [{ date: '2026-09-01', amount: '3150.50', direction: 'in', source: 'opening', sourceId: ids.cash }], hasMore: false });
  r = await call('GET', `/accounts/${ids.card}/ledger`);
  assert.deepEqual(r.json.entries[0], { date: '2026-09-01', amount: '9000.00', direction: 'out', source: 'opening', sourceId: ids.card });
  assert.deepEqual((await call('GET', `/accounts/${ids.cash}/ledger?page=2`)).json, { entries: [], hasMore: false });
  for (const page of ['0', 'abc', '1.5']) {
    assert.equal((await call('GET', `/accounts/${ids.cash}/ledger?page=${page}`)).status, 400, page);
  }
});

test('database enforces card fields itself', async () => {
  const [{ id: userId }] = (await db.query("SELECT id FROM users WHERE email = 'me@example.com'")).rows;
  await assert.rejects(
    db.query("INSERT INTO accounts (user_id, name, kind, opening_balance, opening_date, billing_day) VALUES ($1, 'Z', 'bank', 0, '2026-09-01', 5)", [userId]),
    { code: '23514' },
  );
  await assert.rejects(
    db.query("INSERT INTO accounts (user_id, name, kind, opening_balance, opening_date) VALUES ($1, 'Z', 'credit_card', 0, '2026-09-01')", [userId]),
    { code: '23514' },
  );
});
