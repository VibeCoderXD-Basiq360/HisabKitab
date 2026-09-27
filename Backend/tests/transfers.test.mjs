import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, startTestServer, stopTestServer, callAs, registerAndLogIn } from './harness.mjs';

let me;
let stranger;
const ids = {};

// Calls are as `me` unless they pass `cookie`.
let call;

async function createAccount(body, cookie = me) {
  const response = await callAs(cookie)('POST', '/accounts', { body });
  return response.json.id;
}

async function balanceOf(accountId) {
  const account = (await call('GET', `/accounts/${accountId}`)).json;
  return account.balance ?? account.outstanding;
}

before(async () => {
  await startTestServer();
  me = await registerAndLogIn('me@example.com');
  stranger = await registerAndLogIn('stranger@example.com');
  call = callAs(me);
  ids.bank = await createAccount({ name: 'HDFC savings', kind: 'bank', openingBalance: '31000', openingDate: '2026-09-01' });
  ids.card = await createAccount({
    name: 'HDFC card', kind: 'credit_card', openingOutstanding: '8200', openingDate: '2026-09-01',
    billingDay: 5, dueDay: 18, lastFour: '4821',
  });
  ids.cash = await createAccount({ name: 'Cash', kind: 'cash', openingBalance: '0', openingDate: '2026-09-15' });
  ids.strangerBank = await createAccount(
    { name: 'Their bank', kind: 'bank', openingBalance: '100', openingDate: '2026-09-01' },
    stranger,
  );
});

after(stopTestServer);

test('a card bill payment moves both balances', async () => {
  const body = { fromAccountId: ids.bank, toAccountId: ids.card, amount: '5000', date: '2026-09-18', note: ' September bill ' };
  const response = await call('POST', '/transfers', { body });
  assert.equal(response.status, 201);
  assert.deepEqual(response.json, {
    id: response.json.id, fromAccountId: ids.bank, toAccountId: ids.card, amount: '5000.00', date: '2026-09-18', note: 'September bill',
  });
  ids.billPayment = response.json.id;

  assert.equal(await balanceOf(ids.bank), '26000.00');
  assert.equal(await balanceOf(ids.card), '3200.00', 'outstanding went down');

  const bankLedger = (await call('GET', `/accounts/${ids.bank}/ledger`)).json.entries;
  assert.deepEqual(bankLedger[0], { date: '2026-09-18', amount: '5000.00', direction: 'out', source: 'transfer', sourceId: ids.billPayment });
  const cardLedger = (await call('GET', `/accounts/${ids.card}/ledger`)).json.entries;
  assert.deepEqual(cardLedger[0], { date: '2026-09-18', amount: '5000.00', direction: 'in', source: 'transfer', sourceId: ids.billPayment });
});

test('create rejects bad input', async () => {
  const valid = { fromAccountId: ids.bank, toAccountId: ids.cash, amount: '100', date: '2026-09-20' };
  const invalidBodies = [
    [{ ...valid, amount: 100 }, 'amount as a JSON number'],
    [{ ...valid, amount: '0' }, 'zero'],
    [{ ...valid, amount: '-5' }, 'negative'],
    [{ ...valid, amount: '1.005' }, '3 decimals'],
    [{ ...valid, toAccountId: ids.bank }, 'same account twice'],
    [{ ...valid, fromAccountId: 1 }, 'id as a number'],
    [{ ...valid, date: undefined }, 'missing date'],
    [{ ...valid, date: '2026-13-01' }, 'impossible date'],
    [{ ...valid, note: 42 }, 'note not text'],
    [{ ...valid, memo: 'x' }, 'unknown field'],
  ];
  for (const [body, label] of invalidBodies) {
    const response = await call('POST', '/transfers', { body });
    assert.equal(response.status, 400, label);
    assert.equal(typeof response.json.error, 'string', label);
  }
  const blankNote = await call('POST', '/transfers', { body: { ...valid, note: '   ' } });
  assert.equal(blankNote.json.note, null, 'a blank note is no note');
  ids.bankToCash = blankNote.json.id;
});

test("someone else's account is refused, and nothing is written", async () => {
  const before = await db.query('SELECT count(*) FROM transfers');
  for (const body of [
    { fromAccountId: ids.bank, toAccountId: ids.strangerBank, amount: '100', date: '2026-09-20' },
    { fromAccountId: ids.strangerBank, toAccountId: ids.bank, amount: '100', date: '2026-09-20' },
    { fromAccountId: ids.bank, toAccountId: '999999', amount: '100', date: '2026-09-20' },
  ]) {
    const response = await call('POST', '/transfers', { body });
    assert.equal(response.status, 400);
    assert.match(response.json.error, /is not one of your accounts/);
  }
  const after = await db.query('SELECT count(*) FROM transfers');
  assert.equal(after.rows[0].count, before.rows[0].count);
  assert.equal(await balanceOf(ids.bank), '25900.00', 'unchanged since the last test');
});

test('no transfer before an account was opened', async () => {
  const response = await call('POST', '/transfers', {
    body: { fromAccountId: ids.cash, toAccountId: ids.bank, amount: '10', date: '2026-09-14' },
  });
  assert.equal(response.status, 400);
  assert.equal(response.json.error, 'Cash was opened on 2026-09-15, so a transfer cannot be dated before that');
  const onTheDay = await call('POST', '/transfers', {
    body: { fromAccountId: ids.cash, toAccountId: ids.bank, amount: '10', date: '2026-09-15' },
  });
  assert.equal(onTheDay.status, 201, 'the opening day itself is fine');
});

test('transfers are scoped to the owner', async () => {
  const asStranger = callAs(stranger);
  assert.deepEqual((await asStranger('GET', '/transfers')).json, { entries: [], hasMore: false });
  assert.equal((await asStranger('PATCH', `/transfers/${ids.billPayment}`, { body: { amount: '1' } })).status, 404);
  assert.equal((await asStranger('DELETE', `/transfers/${ids.billPayment}`)).status, 404);
  assert.equal((await call('DELETE', '/transfers/abc')).status, 404);
  assert.equal((await call('GET', '/transfers', { cookie: null })).status, 401);
  assert.equal(await balanceOf(ids.card), '3200.00', 'untouched');
});

test('edit', async () => {
  let response = await call('PATCH', `/transfers/${ids.billPayment}`, { body: { amount: '6000' } });
  assert.equal(response.status, 200);
  assert.equal(response.json.note, 'September bill', 'untouched fields kept');
  assert.equal(await balanceOf(ids.card), '2200.00');

  response = await call('PATCH', `/transfers/${ids.billPayment}`, { body: { toAccountId: ids.strangerBank } });
  assert.equal(response.status, 400, "cannot move a transfer onto someone else's account");
  response = await call('PATCH', `/transfers/${ids.billPayment}`, { body: { date: '2026-08-31' } });
  assert.equal(response.status, 400, 'cannot move it before the opening date');
  response = await call('PATCH', `/transfers/${ids.billPayment}`, { body: { colour: 'sky' } });
  assert.equal(response.status, 400);
  assert.equal(await balanceOf(ids.card), '2200.00', 'none of those changed anything');
});

test('delete is soft: gone from balances and lists, kept in the table', async () => {
  assert.equal((await call('DELETE', `/transfers/${ids.bankToCash}`)).status, 204);
  assert.ok(!(await call('GET', '/transfers')).json.entries.some((transfer) => transfer.id === ids.bankToCash));
  assert.equal(await balanceOf(ids.cash), '-10.00', 'only the cash-to-bank transfer is left');
  const stored = await db.query('SELECT deleted_at IS NOT NULL AS deleted FROM transfers WHERE id = $1', [ids.bankToCash]);
  assert.equal(stored.rows[0].deleted, true);
  assert.equal((await call('DELETE', `/transfers/${ids.bankToCash}`)).status, 404, 'already deleted');
  assert.equal((await call('PATCH', `/transfers/${ids.bankToCash}`, { body: { amount: '1' } })).status, 404);
});

test('a transfer touching an archived account is frozen', async () => {
  const wallet = await createAccount({ name: 'Paytm', kind: 'wallet', openingBalance: '0', openingDate: '2026-09-01' });
  const topUp = await call('POST', '/transfers', { body: { fromAccountId: ids.bank, toAccountId: wallet, amount: '100', date: '2026-09-20' } });
  await call('POST', '/transfers', { body: { fromAccountId: wallet, toAccountId: ids.bank, amount: '100', date: '2026-09-21' } });
  assert.equal((await call('POST', `/accounts/${wallet}/archive`)).status, 204, 'balance back to zero');

  assert.equal((await call('PATCH', `/transfers/${topUp.json.id}`, { body: { amount: '50' } })).status, 409);
  assert.equal((await call('DELETE', `/transfers/${topUp.json.id}`)).status, 409);
  assert.equal(await balanceOf(wallet), '0.00', 'still zero');
  const intoArchived = await call('POST', '/transfers', { body: { fromAccountId: ids.bank, toAccountId: wallet, amount: '1', date: '2026-09-22' } });
  assert.equal(intoArchived.status, 400);
  assert.equal(intoArchived.json.error, 'Paytm is archived');
});

test('list pages never overlap or skip, even on the same day', async () => {
  for (let index = 0; index < 55; index += 1) {
    await call('POST', '/transfers', { body: { fromAccountId: ids.bank, toAccountId: ids.cash, amount: '1', date: '2026-09-25' } });
  }
  const first = (await call('GET', '/transfers')).json;
  const second = (await call('GET', '/transfers?page=2')).json;
  assert.equal(first.entries.length, 50);
  assert.equal(first.hasMore, true);
  assert.equal(second.hasMore, false);
  const seen = [...first.entries, ...second.entries].map((transfer) => transfer.id);
  const all = await db.query("SELECT id FROM transfers WHERE deleted_at IS NULL AND user_id = (SELECT id FROM users WHERE email = 'me@example.com')");
  assert.equal(new Set(seen).size, seen.length, 'no overlap');
  assert.deepEqual([...seen].sort(), all.rows.map((row) => row.id).sort(), 'nothing skipped');
  assert.equal((await call('GET', '/transfers?page=0')).status, 400);
});

test('the database enforces ownership, direction and amount itself', async () => {
  const [{ id: myUserId }] = (await db.query("SELECT id FROM users WHERE email = 'me@example.com'")).rows;
  const insert = (from, to, amount) => db.query(
    "INSERT INTO transfers (user_id, from_account_id, to_account_id, amount, date) VALUES ($1, $2, $3, $4, '2026-09-20')",
    [myUserId, from, to, amount],
  );
  await assert.rejects(insert(ids.bank, ids.strangerBank, '1'), { code: '23503' }, "someone else's account");
  await assert.rejects(insert(ids.bank, ids.bank, '1'), { code: '23514' }, 'same account');
  await assert.rejects(insert(ids.bank, ids.cash, '0'), { code: '23514' }, 'zero amount');
});
