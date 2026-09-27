# API-BREAKDOWN.md

Every endpoint in v1, grouped by build step. **70 endpoints across steps 0–7.**

Do not build an endpoint before its step. If something you need is missing,
stop and ask — do not add it.

---

## Conventions

- Base path `/api`
- Auth on everything except login and register
- The user is taken from the token. **Never from the request body.**
- Every query is scoped to the requesting user. No exceptions.
- Money in and out as decimal strings, 2 places. Never as numbers.
- Errors: `{ error: "message" }` with a real HTTP status

**Before writing any handler**: identify which rows the requester is entitled
to, and make that part of the SQL `WHERE` clause. Not a check afterwards.

---

## Step 0 — Auth (5)

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get token |
| POST | `/auth/logout` | Invalidate token |
| GET | `/auth/me` | Current user |
| POST | `/auth/password` | Change password |

Keep it boring. No WebAuthn, no PIN, no biometrics in v1.

---

## Step 1 — Accounts, categories, transfers, adjustments (15)

### Accounts

| Method | Path | Purpose |
|---|---|---|
| GET | `/accounts` | List, with calculated balances |
| POST | `/accounts` | Create |
| GET | `/accounts/:id` | One account |
| PATCH | `/accounts/:id` | Edit |
| POST | `/accounts/:id/archive` | Archive (never delete) |
| GET | `/accounts/:id/ledger` | Everything that touched this account |

`GET /accounts` returns calculated balances. Credit cards report outstanding,
with the sign convention applied consistently.

### Categories

| Method | Path | Purpose |
|---|---|---|
| GET | `/categories` | List |
| POST | `/categories` | Create |
| PATCH | `/categories/:id` | Edit |
| POST | `/categories/:id/archive` | Archive |

### Transfers

| Method | Path | Purpose |
|---|---|---|
| GET | `/transfers` | List |
| POST | `/transfers` | Create (includes card bill payments) |
| PATCH | `/transfers/:id` | Edit |
| DELETE | `/transfers/:id` | Remove |

Verify **both** accounts belong to the user. This is the first place the
ownership rule bites.

`DELETE` soft-deletes: the transfer drops out of balances and ledgers, but the
row stays.

### Adjustments

| Method | Path | Purpose |
|---|---|---|
| GET | `/accounts/:id/adjustments` | List an account's adjustments |
| POST | `/accounts/:id/adjustments` | Correct the balance when it disagrees with the bank |

Takes amount, direction (`in` or `out`), date and a **required** note. Counts
in balances, never in spending. No edit, no delete — correct a wrong
adjustment with another one.

---

## Step 2 — Expenses, single-user (8)

| Method | Path | Purpose |
|---|---|---|
| GET | `/expenses` | List, filtered and paginated |
| POST | `/expenses` | Create |
| GET | `/expenses/:id` | One expense |
| PATCH | `/expenses/:id` | Edit |
| DELETE | `/expenses/:id` | Remove |
| POST | `/expenses/:id/receipt` | Upload image |
| DELETE | `/expenses/:id/receipt` | Remove image |
| GET | `/expenses/summary` | Totals by category and month |

Filters on list: date range, category, account, search. **Paginated from day
one** — never fetch everything to total it.

`GET /expenses/summary` returns two numbers per month: spent, and of which came
back. Months are frozen; totals never change retroactively.

No sharing yet. No `personId`, no shares. Resist adding the field early.

---

## Step 3 — Income (4)

| Method | Path | Purpose |
|---|---|---|
| GET | `/income` | List |
| POST | `/income` | Create |
| PATCH | `/income/:id` | Edit |
| DELETE | `/income/:id` | Remove |

---

## Step 4 — People and linking (9)

| Method | Path | Purpose |
|---|---|---|
| GET | `/people` | List |
| POST | `/people` | Create (a name, no account needed) |
| PATCH | `/people/:id` | Edit |
| DELETE | `/people/:id` | Blocked if debt is open |
| POST | `/people/:id/invite` | Send invite by email |
| GET | `/invites/:token` | Look up a received invite |
| POST | `/invites/:token/accept` | Accept and link |
| POST | `/invites/:token/reject` | Decline |
| GET | `/invites/pending` | Invites sent to me |

Accepting an invite links a `Person` to a `User`. It requires the invited
person's action — never the inviter's alone.

`DELETE /people/:id` returns an error naming the open balance if one exists.

---

## Step 5 — Shares, items, comments, notifications (15)

### Items

| Method | Path | Purpose |
|---|---|---|
| GET | `/expenses/:id/items` | List |
| PUT | `/expenses/:id/items` | Replace the whole list |
| DELETE | `/expenses/:id/items` | Remove all |

`PUT` replaces the whole list in one transaction. Reject unless items sum
exactly to the expense total.

### Shares

| Method | Path | Purpose |
|---|---|---|
| GET | `/expenses/:id/shares` | List |
| PUT | `/expenses/:id/shares` | Set shares directly |
| POST | `/expenses/:id/split-evenly` | Convenience: split among N people |
| GET | `/shares/owed-to-me` | Everything owed to me |
| GET | `/shares/i-owe` | Everything I owe |

`PUT /shares` is **rejected if items exist** — shares come from items then.
Reject if shares exceed the expense total.

### Comments

| Method | Path | Purpose |
|---|---|---|
| GET | `/expenses/:id/comments` | List |
| POST | `/expenses/:id/comments` | Add |

No edit, no delete.

### Notifications

| Method | Path | Purpose |
|---|---|---|
| GET | `/notifications` | List |
| POST | `/notifications/:id/read` | Mark read |
| POST | `/notifications/read-all` | Mark all read |
| GET | `/notifications/unread-count` | Badge count |
| POST | `/push/subscribe` | Register for push |
| DELETE | `/push/subscribe` | Unregister |

**The visibility rule starts here.** Every endpoint in this step must return
only rows the requester is a party to. Write the test case before the handler:
can a user fetch a share belonging to an expense they are not part of?

---

## Step 6 — Settlements (9)

| Method | Path | Purpose |
|---|---|---|
| GET | `/balances` | Net balance per person |
| GET | `/balances/:personId` | Net figure plus the shares behind it |
| POST | `/settlements` | Record a payment received |
| GET | `/settlements` | History |
| POST | `/settlements/:id/reverse` | Reverse a mistake |
| POST | `/settlement-requests` | "I have paid you" |
| GET | `/settlement-requests` | Incoming and outgoing |
| POST | `/settlement-requests/:id/accept` | Accept → creates settlement |
| POST | `/settlement-requests/:id/reject` | Reject with a reason |
| POST | `/shares/write-off` | Close a debt without payment |

`POST /settlements` takes a list of share IDs, the receiving account, and the
**real payment amount**. Shares may point in both directions: settling a 1,200
claim against a 3,000 claim with one 1,800 payment records 1,800 once. Validate
that the difference between the two directions equals the amount.

`POST /settlement-requests/:id/accept` is where the receiver picks the
account. The payer does not know where the money landed.

`write-off` is only allowed for the person owed.

Reversal creates a cancelling record. It never modifies or deletes the
original.

---

## Step 7 — Account permissions (5)

| Method | Path | Purpose |
|---|---|---|
| GET | `/accounts/:id/permissions` | Who can use this account |
| POST | `/accounts/:id/permissions` | Grant to a person |
| DELETE | `/accounts/:id/permissions/:personId` | Revoke |
| GET | `/accounts/shared-with-me` | Accounts I can log against |
| GET | `/expenses/logged-for-others` | Expenses I logged on others' accounts |

Permissions are a **list**. Several people may hold permission on one account.

Revoking does not touch expenses already logged.

`POST /expenses` must now accept an account the user does not own, and verify
permission before allowing it. This is the only change step 7 makes to
existing endpoints.

---

## Count

| Step | Endpoints |
|---|---|
| 0 — Auth | 5 |
| 1 — Accounts, categories, transfers, adjustments | 15 |
| 2 — Expenses | 8 |
| 3 — Income | 4 |
| 4 — People | 9 |
| 5 — Shares, items, comments | 15 |
| 6 — Settlements | 9 |
| 7 — Permissions | 5 |
| **Total** | **70** |

v1 had roughly 120 endpoints across 34 modules. If this number grows much past
70, something is being built that was not asked for.
