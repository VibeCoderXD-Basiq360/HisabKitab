# ARCHITECTURE.md

The design for HisabKitab v2. This is the source of truth. If something is not
here, it is not decided — stop and ask rather than assuming.

---

## What this app is

A personal expense tracker where **any expense can be borne by someone other
than the person who paid for it**.

That single idea covers everything:

- I pay for my own coffee → ordinary expense
- I pay for household goods, my parents owe me → reimbursement
- I use my father's credit card → I owe him
- I pay for dinner, three friends owe me → a split

These are not four features. They are one model read four ways.

## The core insight

Every expense has two separate facts:

- **Who paid** — which account the money actually left
- **Who bears it** — whose cost it ultimately is

When these are the same person, it is an ordinary expense. When they differ,
someone owes someone. Debt is not recorded; it is what falls out when payer
and bearer differ.

---

## Entities

Fourteen. (Earlier conversations said "ten" — that was loose counting.)

### User
Someone with a login. You, your father, your friends who join.

### Person
Someone you track money with. **Always exists on your side**, whether or not
they use the app. Optionally links to a real `User`.

**All shares and settlements point at a `Person`, never at a `User`.** This is
deliberate: it gives one code path whether or not the other party has an
account. The previous version had both, and it is the single biggest reason
its splits code was unreadable.

### Account
Anything money sits in or moves through: bank, cash, wallet, credit card.

- `openingBalance` — set once, on the day you start
- Credit cards additionally: billing day, due day, last four digits
- **Credit cards run backwards**: spending increases what you owe, where a
  bank account decreases. Decide the sign convention once, in step 1.
- Balance is **always calculated**: opening balance + money in − money out.
  Never stored.

### AccountPermission
Grants another user the right to log expenses against your account.

**A list, not a single link.** One card can be delegated to several people.
The previous version allowed exactly one, which would have broken the moment a
second family member needed access.

Revoking permission does **not** remove expenses already logged. History
survives.

### Category
Name, colour, icon. Nothing else.

### Expense
What was bought, how much, from which account, on what date.

- `amount` is **immutable**. It never changes as people pay. The bill said
  ₹4,000; it says ₹4,000 forever. What changes is how much of it is *yours*.
- `paidFromAccountId` — may be an account you do not own, if you hold
  permission on it
- `paymentMethod` — a label (UPI, card, bank transfer, cash). Not an entity.
- One optional receipt image

### ExpenseItem
Optional line items on one expense: name, quantity, unit, amount, and
optionally the person it is for.

- Items **must sum exactly** to the expense total
- If items exist, shares are **calculated from items** and cannot be
  hand-edited
- An untagged item belongs to the person who bears the expense by default

### Share
A claim: this person owes this amount on this expense.

- A share is **not money**. It becomes money only when a settlement records it.
- Shares are per person. Each person is notified about their own share only.
- "Settled" is a state of the **share**, not of the expense. An expense is
  fully settled when all its shares are — which is calculated, not stored.

### Settlement
Money actually moving to close one or more shares.

- Records: who paid, amount, date, and **which account received it**
- The receiving account may differ from the paying account. Money does not
  have to come back the way it left.
- Can close shares in **both directions at once** (see Netting below)
- **The amount is the real payment, not the sum of the shares.** Settling a
  1,200 claim against a 3,000 claim with one 1,800 payment records 1,800 once.
  The check is: the difference between the two directions equals the payment.
- Never modified after creation. To correct one, create a reversal.

### SettlementRequest
The payer telling the receiver "I have paid you."

- A request is **not** a settlement. Only acceptance creates the money record.
- The receiver picks which account the money landed in, because only they know
- Rejection keeps the request visible as rejected, and the debt stays open
- A pending request blocks a second one for the same shares
- The receiver can also record a settlement directly, without a request

### Transfer
Money moving between two of your own accounts.

Paying a credit card bill **is a transfer**, bank to card. Not an expense, no
category.

### Income
Money coming in. Account, amount, date, source.

### Notification
A stored, readable, actionable list — not just a push message. Delivered by
push, email, and in-app.

### Comment
Discussion on an expense. Inherits the visibility rule: your friends discuss
the dinner and your father never sees it, even on his own card.

**Comments cannot be edited or deleted.** A record of "you said you would pay
by Friday" is worthless if it can be rewritten.

---

## The rules

### Ownership and timing

**An expense counts against whoever paid, until it is settled. Then it counts
against whoever bore it.**

Both directions, one sentence:

- You pay ₹2,000 for your father → your spending → he reimburses you → becomes
  his
- His card pays ₹3,000 for you → his spending → you pay him → becomes yours

**Monthly totals are frozen.** An expense always counts in the month it
happened. Months never change after the fact.

Every month therefore reports **two numbers**, not one:

- Spent — everything that left your accounts that month
- Of which came back — the portion since reimbursed

September reads "spent 18,420, of which 3,200 came back". Open it again in
November and the first number is identical; only the second has moved.

Rejected alternative: counting an expense in the month it settled. It gives a
single true number, but a total that changes while you were not looking
destroys trust in every other number, and it forces two dates onto every
expense.

### Money

- Decimal, exactly 2 places, everywhere
- One currency, no conversion
- Uneven split remainders go to one nominated share

### Amounts never shrink

An expense amount changes **only** if edited, never as a side effect of
payment. The expense list shows recovered progress ("₹4,000 · ₹2,000
recovered"); spending totals count only your portion.

### Settlements and transfers never touch spending totals

They move balances only. Counting a settlement as spending double-counts.

### Visibility

**A person sees an expense only if they are a party to it** — they paid, they
own the account, or they hold a share.

Your father sees the dinner on his card. He does not see your friends or their
shares. Your friends see their own share and never learn whose card was used.

Enforced on the server, on every query. This is the rule that makes groups
work later without a separate sharing system.

**Build it once.** Write the visibility condition as a single shared SQL
fragment and include it in the `WHERE` clause of every query touching
expenses, shares, items, comments or receipts. Never a check after fetching —
a row you are not entitled to must never load. Never in the UI.

### Netting

Between any two people, balances net to a single number. He owes you ₹1,000,
you owe him ₹500 → he owes you ₹500.

**Netting is a view, not stored data.** Individual shares stay attached to
their own expenses so you can always open the ₹500 and see what is behind it.

A settlement must therefore be able to close shares in both directions in one
payment.

### Editing

An expense can be edited even after some shares are settled. Shares
recalculate and affected people are notified.

**Settlement records are never modified.** Money that moved, moved.

Every expense keeps an edit trail: what changed, when.

### Closing a debt

Two distinct actions, and the wording matters:

- **"He paid me"** — creates a settlement, picks the receiving account, moves
  the expense, changes balances
- **"Write it off"** — no settlement, no money, no balance change. The expense
  stays yours because you genuinely bore the cost.

Only the person owed can write off. You cannot decide that what you owe is
forgiven.

### Deleting

- Accounts and categories: **archive**, never delete
- A person with an open debt **cannot** be deleted until it is settled or
  written off
- If a linked user unlinks or deletes their account, they revert to being a
  name on your side. Your history survives.

### Linking a person

When a tracked name joins and links, they see **everything from the start** —
all past shared expenses, items, and comments.

- Linking requires **their** acceptance, not just your click
- It is irreversible in terms of what they have seen

---

## Stack

| Layer | Choice |
|---|---|
| Backend | Node + Express |
| Database | PostgreSQL |
| Data access | **Plain SQL.** No ORM. |
| Frontend | React |
| Notifications | web-push, email, in-app |

**Why the same stack as v1**: the old repository stays live as a reference
implementation. Changing stack makes it near-worthless.

**Why no ORM**: v1 used Prisma, and adding a model was frictionless enough
that the schema reached 55 of them unnoticed. Friction is the point.

---

## Layering

### Backend

```
routes → handler → query
```

- **routes** — path, method, middleware
- **handler** — validate input, check permission, call queries, shape response
- **query** — SQL, one function per query

No service layer, no repository layer. Three files per module, maximum.

v1 put SQL directly in controllers and produced an 819-line file. Separating
queries out is the minimum structure needed to prevent that.

### Backend skeleton decisions

- Folder: `Backend/`, matching the old repo so the two can be compared
- ES modules (`import`), not CommonJS
- Dependencies: `express`, `pg`. Nothing else.
- Config from `Backend/.env`, loaded by Node's built-in `--env-file` flag.
  Variables: `DATABASE_URL`, `PORT`
- `GET /api/health` runs `SELECT 1`. `{ ok: true }` if Postgres answers,
  `503 { error }` if not
- No colour token file until the frontend exists

### Frontend

```
page → hook → api client
```

One hook per backend module. `useExpenses` talks to the `expense` module.
Finding the hook tells you the endpoint.

---

## Build order

Each step is independently usable. Nothing later changes anything earlier.

| Step | What | Why here |
|---|---|---|
| 1 | Accounts, categories, transfers | No dependencies |
| 2 | Expenses (single-user), receipts | 70% of daily use |
| 3 | Income | Balances now mean something |
| — | **Use it for two weeks** | If 1–3 are not pleasant, nothing else matters |
| 4 | People, invites, linking | No money involved yet |
| 5 | Shares, items, visibility rule, comments, notifications | The heart of it |
| 6 | Settlements, requests, netting, write-offs, reversals | Closing the loop |
| 7 | Account permissions | Hardest case, built on solid ground |

Notifications are not a step. They are wired in as steps 5, 6 and 7 create
them.

---

## Colour and styling

Dark, deep green, lime accent. Warm and material rather than clinical. Full
direction and screen-by-screen notes live in `design-brief.md`.

```
bg           #0C1611      surface      #121F18
raised       #1A2C22      line         #243A2D
ink          #EDF4EE      ink-2        #9FB5A6      ink-3   #6B8175
lime         #B3DD62      lime-dim     #8FC244      on-lime #14240A
bank         #2C5E54      card         #DDAD71      cash    #3B4A42
owed-to-you  #7FD1A0      you-owe      #E8846A      settled #4E6357
```

Sixteen tokens. Typeface is Inter, tabular figures on every number.

- **Lime is for actions only.** Money direction uses the mint/coral pair.
- **Never show direction by colour alone** — always pair it with a word
  ("owes you", "you owe").
- The home screen is the only decorated screen. Everything else is flat.

v1 declared tokens in `tailwind.config.js` and then bypassed them **3,236
times** with inline `style={{}}` objects and hex literals. That, not file
length, is why it became unreadable. See the styling rules in `CLAUDE.md`.

## Frontend state

React Query owns anything that comes from the server. Local component state
for genuinely local things (which filter chip is active, whether a sheet is
open). No global store unless something forces one.

**Nothing derived is ever stored on the client.** No computed balance in a
store, no running total in component state. Balances, net figures and monthly
totals come from the server, always.

Each mutation is responsible for invalidating the queries it dirties, in one
place. A settlement dirties: account balances, that person's net figure, the
affected expenses, the month summary, the notification count.

## Small decisions that prevent bugs

- **Dates are days, not timestamps.** Store the date the user picked. An
  expense at 11:50pm on 30 September must not land in October because the
  server runs UTC.
- **Pagination and summaries are server-side from day one.** After a year
  there will be thousands of expenses. Never fetch them all to total them.
- **Sessions must last.** This app is opened several times a day; weekly
  logouts will kill the habit. Decide the approach in step 0.
- **Backups before real data.** There is no migration from v1, so every rupee
  in v2 is typed by hand. Managed Postgres with automatic backups, or a
  scheduled dump, set up before you start entering anything.
- **Receipt URLs are not a security boundary.** Images obey the same
  visibility rule as their expense. An unguessable URL is not enough.

## Schema

Deliberately not written here. Each step writes its own tables when it needs
them — three in step 1, not fourteen up front. Designing all of them now is
how v1 reached 55 models.

Three decisions to make while writing them, not before:

- **Credit card sign.** Spending lowers a bank balance and raises card
  outstanding. One signed number flipped for display, or a separate
  outstanding concept. Decide in step 1; step 6 depends on it.
- **Settlement ↔ share link.** A proper join table, never an array of IDs.
  v1 stored expense IDs in a raw array with no foreign keys.
- **What a Person row holds** once it links to a real user — does it keep the
  name you gave it, or start reading their profile?

## Deliberately excluded from v1

Do not build these. Do not design for them.

Budgets · savings goals · financial goals · loans · subscriptions · recurring
expenses · expense templates · net worth and assets · groups · shared tabs ·
multi-currency and exchange rates · OCR and receipt scanning · offline mode ·
i18n · the entire business module (jobs, inventory, customers, P&L) · data
migration from v1

**Step 8 candidates**, once 1–7 are running: group as a shared space, and
multi-way debt simplification (A owes B, B owes C, C owes A → fewest
payments).

**Resist recurring expenses hardest.** It sounds simple. A recurring expense
that generates shares every month multiplies every edge case in this document.
