import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db, startTestServer, stopTestServer, callAs, registerAndLogIn } from './harness.mjs';

let me;
let stranger;
const ids = {};

// Calls are as `me` unless they pass `cookie`.
let call;

async function balanceOf(accountId) {
  const account = (await call('GET', `/accounts/${accountId}`)).json;
  return account.balance ?? account.outstanding;
}

before(async () => {
  await startTestServer();
  me = await registerAndLogIn('me@example.com');
  stranger = await registerAndLogIn('stranger@example.com');
  call = callAs(me);
  const bank = await call('POST', '/accounts', {
    body: { name: 'HDFC savings', kind: 'bank', openingBalance: '31000', openingDate: '2026-09-01' },
  });
  ids.bank = bank.json.id;
  const card = await call('POST', '/accounts', {
    body: {
      name: 'HDFC card', kind: 'credit_card', openingOutstanding: '8200', openingDate: '2026-09-01',
      billingDay: 5, dueDay: 18, lastFour: '4821',
    },
  });
  ids.card = card.json.id;
});

after(stopTestServer);

test('an adjustment moves the balance and shows in the ledger', async () => {
  const response = await call('POST', `/accounts/${ids.bank}/adjustments`, {
    body: { amount: '250', direction: 'out', date: '2026-09-20', note: ' Bank charges I never logged ' },
  });
  assert.equal(response.status, 201);
  assert.deepEqual(response.json, {
    id: response.json.id, accountId: ids.bank, amount: '250.00', direction: 'out', date: '2026-09-20', note: 'Bank charges I never logged',
  });
  assert.equal(await balanceOf(ids.bank), '30750.00');

  const ledger = (await call('GET', `/accounts/${ids.bank}/ledger`)).json.entries;
  assert.deepEqual(ledger[0], { date: '2026-09-20', amount: '250.00', direction: 'out', source: 'adjustment', sourceId: response.json.id });

  await call('POST', `/accounts/${ids.bank}/adjustments`, {
    body: { amount: '50.5', direction: 'in', date: '2026-09-21', note: 'Interest' },
  });
  assert.equal(await balanceOf(ids.bank), '30800.50');
});

test('on a card, out raises what you owe', async () => {
  await call('POST', `/accounts/${ids.card}/adjustments`, {
    body: { amount: '100', direction: 'out', date: '2026-09-20', note: 'Annual fee' },
  });
  assert.equal(await balanceOf(ids.card), '8300.00');
});

test('create rejects bad input', async () => {
  const valid = { amount: '10', direction: 'in', date: '2026-09-20', note: 'Why' };
  const invalidBodies = [
    [{ ...valid, note: undefined }, 'note is required'],
    [{ ...valid, note: '   ' }, 'blank note'],
    [{ ...valid, amount: 10 }, 'amount as a JSON number'],
    [{ ...valid, amount: '0' }, 'zero'],
    [{ ...valid, amount: '-10' }, 'negative — use direction'],
    [{ ...valid, direction: 'up' }, 'unknown direction'],
    [{ ...valid, date: '2026-02-30' }, 'impossible date'],
    [{ ...valid, reason: 'x' }, 'unknown field'],
  ];
  for (const [body, label] of invalidBodies) {
    const response = await call('POST', `/accounts/${ids.bank}/adjustments`, { body });
    assert.equal(response.status, 400, label);
    assert.equal(typeof response.json.error, 'string', label);
  }
  const early = await call('POST', `/accounts/${ids.bank}/adjustments`, { body: { ...valid, date: '2026-08-31' } });
  assert.equal(early.status, 400);
  assert.equal(early.json.error, 'HDFC savings was opened on 2026-09-01, so an adjustment cannot be dated before that');
  assert.equal(await balanceOf(ids.bank), '30800.50', 'none of those changed anything');
});

test('list: newest first, scoped to the owner', async () => {
  const mine = (await call('GET', `/accounts/${ids.bank}/adjustments`)).json;
  assert.deepEqual(mine.map((adjustment) => adjustment.note), ['Interest', 'Bank charges I never logged']);

  const asStranger = callAs(stranger);
  assert.equal((await asStranger('GET', `/accounts/${ids.bank}/adjustments`)).status, 404);
  const sneaky = await asStranger('POST', `/accounts/${ids.bank}/adjustments`, {
    body: { amount: '999', direction: 'out', date: '2026-09-20', note: 'Mine now' },
  });
  assert.equal(sneaky.status, 404);
  assert.equal(await balanceOf(ids.bank), '30800.50');
  assert.equal((await call('GET', '/accounts/abc/adjustments')).status, 404);
  assert.equal((await call('GET', `/accounts/${ids.bank}/adjustments`, { cookie: null })).status, 401);
});

test('an adjustment can bring an account to zero so it can be archived; then it is frozen', async () => {
  const wallet = await call('POST', '/accounts', {
    body: { name: 'Paytm', kind: 'wallet', openingBalance: '120', openingDate: '2026-09-01' },
  });
  const walletId = wallet.json.id;
  await call('POST', `/accounts/${walletId}/adjustments`, {
    body: { amount: '120', direction: 'out', date: '2026-09-22', note: 'Wallet closed, balance lost' },
  });
  assert.equal((await call('POST', `/accounts/${walletId}/archive`)).status, 204);

  const afterArchive = await call('POST', `/accounts/${walletId}/adjustments`, {
    body: { amount: '1', direction: 'in', date: '2026-09-23', note: 'x' },
  });
  assert.equal(afterArchive.status, 409);
  assert.equal(afterArchive.json.error, 'Paytm is archived');
  assert.equal((await call('GET', `/accounts/${walletId}/adjustments`)).json.length, 1, 'history stays readable');
});

test('there is no way to edit or delete an adjustment', async () => {
  const [{ id }] = (await db.query('SELECT id FROM adjustments LIMIT 1')).rows;
  assert.equal((await call('PATCH', `/accounts/${ids.bank}/adjustments/${id}`, { body: { amount: '1' } })).status, 404);
  assert.equal((await call('DELETE', `/accounts/${ids.bank}/adjustments/${id}`)).status, 404);
});

test('the database enforces ownership, direction and note itself', async () => {
  const [{ id: myUserId }] = (await db.query("SELECT id FROM users WHERE email = 'me@example.com'")).rows;
  const strangerAccount = await callAs(stranger)('POST', '/accounts', {
    body: { name: 'Theirs', kind: 'cash', openingBalance: '0', openingDate: '2026-09-01' },
  });
  const insert = (accountId, direction, note) => db.query(
    "INSERT INTO adjustments (user_id, account_id, amount, direction, date, note) VALUES ($1, $2, 1, $3, '2026-09-20', $4)",
    [myUserId, accountId, direction, note],
  );
  await assert.rejects(insert(strangerAccount.json.id, 'in', 'x'), { code: '23503' }, "someone else's account");
  await assert.rejects(insert(ids.bank, 'sideways', 'x'), { code: '23514' }, 'unknown direction');
  await assert.rejects(insert(ids.bank, 'in', ''), { code: '23514' }, 'blank note');
});
