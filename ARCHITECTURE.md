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

Fifteen. (Earlier conversations said "ten" — that was loose counting.
Adjustment was added in step 1.)

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
Name and colour. Nothing else.

Icon comes later, as a new column, when the frontend chooses an icon set.
Storing unchecked icon keys before then would make the later CHECK
constraint fail on existing rows.

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

### Adjustment
A correction on a single account, for when the app and the real balance
disagree. Amount, direction, date, and a **required** note saying why.

Counts in balances, never in spending.

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

### Settlements, transfers and adjustments never touch spending totals

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

### Request rules — every module

- **Unknown fields are rejected** with 400 naming the field and listing the
  allowed ones. Otherwise a misspelt field (`{"color": "sky"}` for `colour`)
  is silently ignored and the request appears to succeed while changing
  nothing.
- Ids in URLs and bodies are strings of digits, as the API returns them.
  Anything else is treated as not found (URL) or rejected (body).
- Both checks live in `src/fields.js`.

### Backend skeleton decisions

- Folder: `Backend/`, matching the old repo so the two can be compared
- ES modules (`import`), not CommonJS
- Dependencies: `express`, `pg`. Nothing else.
- Config from `Backend/.env`, loaded by Node's built-in `--env-file` flag.
  Variables: `DATABASE_URL`, `PORT`, `TEST_DATABASE_URL`
- Tests: `npm test` runs `Backend/tests/` with Node's built-in test runner,
  one file at a time — each file starts its own server on the same port and
  empties the same tables. They run migrations on the test database first.
  They refuse to start unless the database name ends in `_test`.
- Shared test setup lives in `Backend/tests/harness.mjs`: the `_test` guard
  (runs on import), the test database client, starting and stopping the
  server, one request helper, and logging in. Nothing else. Its name does not
  match the runner's test-file patterns, so it never runs as a test.
- `GET /api/health` runs `SELECT 1`. `{ ok: true }` if Postgres answers,
  `503 { error }` if not
- No colour token file until the frontend exists

### Migrations

- Numbered plain-SQL files in `Backend/migrations/` (`001_users.sql`, …),
  run in filename order by `npm run migrate` (`Backend/src/migrate.js`)
- `schema_migrations` records each filename that has run
- Each file runs in its own transaction; the runner stops at the first failure
- Run by hand, never on server start
- A file never changes once it is frozen — committed, or run on any database
  not ending in `_test` (see `CLAUDE.md` §13). Fix forward with a new file. No
  down migrations.

### Auth and sessions (step 0)

- **Session token**: random, 32 bytes. Only its SHA-256 hash is stored, in
  `sessions`. A leaked database cannot be used to log in.
- **Expiry**: 30 days of inactivity. Each use extends it; the "last used" time
  is written at most once a day. No absolute lifetime.
- **Logout** deletes that one session.
- **Changing password** deletes every other session of that user. This is the
  lost-phone remedy.
- **Cookie**: `httpOnly`, `Secure`, `SameSite=Lax`. Lax, not Strict, because
  notification links tapped from email and WhatsApp must arrive logged in.
  Frontend and API are therefore served from the same site.
- **Passwords**: Node's built-in `scrypt`. The cost parameters are stored with
  each hash (`scrypt:N:r:p:salt:hash`), so they can be raised later without
  breaking existing passwords.
- **Password rate limit**: in-memory counter keyed on email plus IP. 5 failed
  attempts locks that pair out for 15 minutes. Resets on server restart —
  accepted. One counter covers both login and the current-password check on
  change-password, so a thief holding an unlocked phone cannot guess the
  password there instead.
- **Registration** asks for email, password, display name. Email is trimmed
  and lowercased, and the database rejects any that is not. Password minimum 8
  characters, no other rules.
- **Registration is open** until step 4, when it closes to invite-only.
- No new packages. JWT rejected: it cannot be invalidated on logout.

Decided while building step 0 (for review):

- IDs are `BIGINT` identity columns. Scoped queries make guessing an ID
  harmless, so UUIDs add nothing.
- JSON responses use camelCase (`displayName`); columns use snake_case.
- `Backend/src/session.js` sits beside `db.js` as shared code: it reads and
  sets the session cookie and holds `requireAuth`, which every later module
  uses. The auth module itself is the usual three files.
- Register creates the account but does not log in. The client calls login
  next.
- Unexpected errors return `500 { error: "Something went wrong" }`, never the
  real error text. Unreadable request bodies (bad JSON, too large) return
  their 4xx status with a fixed message. Logging: see `CLAUDE.md` §9.

### Money movements and balances (step 1)

**Sign convention.** Every stored amount means *money in the account*. Money
leaving any account is negative; money arriving is positive. Credit cards are
therefore negative when you owe: ₹8,200 outstanding is stored as `-8200.00`.
A card bill payment is a transfer, bank −, card +.

- **At the API**, cards speak "outstanding" in both directions: requests send
  `openingOutstanding`, responses return `outstanding`. Other accounts use
  `openingBalance` and `balance`. A card never gets both. The flip happens in
  SQL, in the accounts queries only. The client never does arithmetic.
- **Ledger rows and adjustments** use a positive `amount` plus
  `direction: in | out` — money into or out of that account. No flip needed.
- Step 6 follows the same rule: a settlement is + on the receiving account and
  − on the paying account, if one is recorded.

**Balances.** The view `account_movements (account_id, amount, date, source,
source_id)` lists every movement of money with its signed amount. A balance
is the sum of an account's rows. It is calculated on every request and never
stored. The ledger is the same view filtered to one account, so the two cannot
disagree.

- Each movement type adds one branch to the view, in its own migration
  (`CREATE OR REPLACE VIEW` restates the view with the new branch). The
  balance and ledger queries never change.
- Branches: opening balance (accounts), transfer out and in (transfers),
  adjustment (adjustments). Later: expense (step 2), income (step 3),
  settlement (step 6).
- The view has no user scoping. Every query on it joins `accounts` and filters
  by owner.
- Every branch's amount must be `NUMERIC(12,2)` exactly — cast it, e.g.
  `(-amount)::numeric(12,2)`. A replaced view cannot change a column's type,
  and negation drops the `(12,2)`.

**No movement before its account's opening date.** Applies to every movement
type — transfers, adjustments, and in later steps expenses, income and
settlements. The handler's account lookup checks it and returns 400 naming the
opening date. Otherwise the movement would count twice: inside the opening
balance and again on its own.

**Accounts**

- `kind` and `opening_date` are fixed at creation. The opening balance can be
  edited; balances simply shift.
- The client always sends the opening date. The server never defaults a date,
  because "today" depends on a timezone.
- Card fields (billing day, due day, last four) are required for credit cards
  and empty for every other kind, enforced by a database constraint.
- Unarchived account names are unique per user.

**Archiving** (accounts and categories)

- Sets `archived_at`. Nothing is deleted.
- Archived items cannot be edited or used by any new or edited movement.
  Everything already recorded stays, and still counts.
- An account can be archived only when its balance is exactly zero. The error
  states the balance.
- `GET /accounts` hides archived accounts. They stay reachable by id, with
  their ledger.
- No un-archive — the spec has no endpoint for it.

**Transfers**

- Always between two accounts of the same user. Enforced by the database: the
  transfer's `(account, user)` pairs are foreign keys to `accounts (id,
  user_id)`.
- `DELETE /transfers/:id` soft-deletes (`deleted_at`). Deleted transfers drop
  out of the view, so out of balances and ledgers.
- Amount is positive; the direction is the from/to pair. From and to must
  differ. The note is optional; a blank note is stored as no note.
- Both accounts must be the requester's, unarchived, and opened on or before
  the transfer's date.
- **A transfer touching an archived account cannot be edited or deleted.** An
  account is archived only at a zero balance; changing one of its transfers
  would silently make it non-zero.

**Adjustments**

- One account, a positive amount, a direction, a date, a required note.
- Counts in balances, never in spending.
- Create and list only — a wrong adjustment is corrected by another one.
- **When to use which.** If the opening balance was wrong from the start,
  edit the opening balance. If it was right and the balance drifted later,
  add an adjustment. Using one for the other's job corrupts history: a
  wrong opening balance "fixed" by an adjustment leaves every day before
  the adjustment wrong, and a drift "fixed" by editing the opening balance
  rewrites days that were correct.
- Stored as a positive amount plus `direction` (`in` or `out`), the same words
  the API uses; the view turns them into a signed amount. `in` raises a
  balance; on a card, `out` raises what you owe.
- The account must be the requester's (a composite foreign key, as for
  transfers), unarchived (409 otherwise), and open on the adjustment's date.
- `GET /accounts/:id/adjustments` works on archived accounts too, since
  history stays readable. It is not paginated — adjustments are rare — and is
  newest first, by date then id.

**Categories**

- Columns: name, colour, `archived_at`. Names are unique among a user's
  unarchived categories.
- **Colour** is one of eight key names, checked by the database:
  `saffron`, `sand`, `rose`, `plum`, `indigo`, `sky`, `teal`, `slate`.
  Required, no default. They are hue words, not meanings, and deliberately
  avoid lime (actions), mint (owed to you) and coral (you owe), so a category
  dot is never mistaken for money direction. Rose must stay a cool pink, away
  from coral. The colour values go in the token file when the frontend
  exists; they are separate from the sixteen UI tokens.
- Name and colour can be edited. Expenses point at the category rather than
  copying it, so an edit shows on past expenses too — accepted.
- Archiving has no precondition. `GET /categories` hides archived ones.
- No icon yet — see the Category entity.

**`src/money.js`** is the decimal helper. At step 1 it only validates money
coming in (a string, at most 2 decimal places, within `NUMERIC(12,2)`, never a
JSON number) and formats rupees Indian-style (₹31,00,000.00) for error
messages. All sums and sign flips happen in SQL. Arithmetic joins money.js
when something first needs it in JavaScript.

Decided while building step 1 (for review):

- Adjustments are their own module, built after transfers. Module order:
  accounts → categories → transfers → adjustments.
- Every paginated list — so far the ledger and `GET /transfers` — returns 50
  rows per page, takes `?page=N`, is newest first, and replies
  `{ entries, hasMore }`. Transfers order by date, then id.
- Postgres `DATE` columns come back as `YYYY-MM-DD` strings, never JavaScript
  `Date` objects, which would shift days across timezones. Set once in
  `db.js`.
- An id that does not exist, or belongs to someone else, is 404. Both look the
  same, so a response never reveals that someone else's row exists.
- Categories are listed in the order they were created, like accounts. The
  response carries no `archivedAt`: the list only shows unarchived ones, and
  there is no endpoint to fetch one by id.

### Frontend

```
page → hook → api client
```

One hook per backend module. `useExpenses` talks to the `expense` module.
Finding the hook tells you the endpoint.

### Frontend setup

- Folder `Web/`, matching the old repo. Plain JavaScript, ES modules, Vite.
- Runtime packages: `react`, `react-dom`, `@tanstack/react-query`,
  `react-router`. Dev: `vite`, `@vitejs/plugin-react`. Nothing else without
  asking.
- **React Router is for URLs only.** It is used in declarative mode
  (`<BrowserRouter>`, `<Routes>`), which has no loaders or actions — never
  `createBrowserRouter`. React Query owns all server data; router loaders
  would be a second data layer.
- **Styling is plain CSS.** `src/tokens.css` holds every colour as a CSS
  variable, plus a short spacing and radius scale. Components use CSS
  Modules (`Name.module.css`) and refer to colours only through `var(--…)`.
  No Tailwind: its arbitrary values (`bg-[#1a2c22]`) are how v1 bypassed its
  tokens.
- **`src/api.js`** is the only place that calls `fetch`. It sends and reads
  JSON and turns any non-2xx reply into an error carrying the server's
  message and status. The session cookie travels on its own, same site.
- **No money arithmetic on the client.** Amounts arrive and leave as strings.
  The client only formats them for display; that formatter copies the
  backend's `formatRupees`, because `Web/` and `Backend/` share no code.
- **Mutations never auto-retry.** A create that timed out may still have
  been saved; retrying it can record the same money twice. Set once, on the
  query client. Queries retry only on network failures and server errors,
  never on a 4xx.
- **Inter is self-hosted** in `Web/public/fonts/`, with its licence. No
  request to an outside font service.
- **Development**: Vite passes `/api` through to Express on port 3000, so the
  browser sees one site and the session cookie works on `localhost`.
- **PWA, for now**: a manifest, placeholder icons and `theme-color`. No
  service worker until push notifications need one in step 5 — a caching
  one invites "the app did not update" bugs, and offline mode is excluded.

### Screens for steps 0 and 1

- **Home's hero** is the stack of account cards, each with its balance, and
  **no total**. At step 5 the hero becomes "Coming back to you" — what
  others owe — and the account cards move behind it.
- **Bottom bar: Home and Settings only.** Transfer is an action on Home and
  on each account. Categories are reached from Settings. The bar gains
  entries as frequent actions arrive (expenses, people).
- Built in five blocks, reviewed one at a time: building blocks with login,
  register and the login check; home and accounts; account detail with
  ledger and adjustments; transfers; categories and settings.
- **Testing is manual** — in a browser at phone width — until step 5.

### Home and accounts (block 2)

- **Home, top to bottom:** the hero stack of account cards; every account as
  a list; "Add an account". No total anywhere.
- **The stack** shows the first account in list order at the front, with up
  to two more peeking out behind it. It is static. With no accounts it is
  one empty card inviting you to add one.
- **Card faces use the account-kind tokens:** bank → `--bank`, credit card →
  `--card`, cash → `--cash`. **Wallet has no token, so it uses `--cash`** —
  both are money in hand. Text on the light `--card` face uses `--bg`.
- **The decoration is home-only** (directional gradient, sheen, top
  highlight, deep shadow, film grain, one glow at the top). Its extra shades
  — shadow, sheen, glow — are **derived from existing tokens and defined in
  `tokens.css`**, so components still only use `var(--…)`. The shadow is
  `--bg` itself; sheen and glow are `color-mix()` of a token with
  `transparent`. No named colours. They are mixes of existing tokens, not new colours. The one
  exception is each card's gradient end, which depends on its own face
  colour, so the card mixes it itself — still only from `var(--…)`.
- **What a card or row says:** a card shows "outstanding"; a card whose
  outstanding is negative says "in credit" and shows the amount without the
  minus; every other kind shows "balance". A credit card also shows its last
  four digits and "Bill due on the 18th".
- **Rows and cards are not links yet.** Account detail arrives in block 3;
  linking now would lead to "Nothing here".
- **No bottom bar yet.** Its only other entry, Settings, arrives in block 5,
  and the Transfer action arrives with transfers in block 4.
- **Adding an account (`/accounts/new`):** the kind is chosen first, and the
  form changes with it. Then the name, the day tracking starts, and the
  amount on that day — "How much did you owe on it that day?" for a credit
  card, "How much was in it that day?" for everything else. A credit card
  also asks for its last four digits, the day the bill comes and the day
  it's due. The start date is prefilled with today's date on the phone, and
  the client always sends it.
- **The form cannot enter a negative opening amount** (an overdrawn account,
  or a card in credit) — money inputs accept digits only. An adjustment
  covers it; listed under "Known gaps" in `PROJECT-STATUS.md`.
- **Form screens share one stylesheet** (`FormScreen.module.css`): login,
  register and add-account are its third use.

### Account detail, ledger and adjustments (block 3)

- **Home now links in.** The front card and every list row open the
  account (`/accounts/:id`). The cards behind stay decoration.
- **The account screen is flat** — not decorated. Top: name, kind, the
  headline figure with its word (and the due day for a card). Then the
  action "Correct the balance", then the ledger.
- **Ledger rows say what each movement was, in words:**
  - Opening: "Starting balance" (a card: "Owed at the start"), with
    "balance" / "overdrawn" (a card: "owed" / "in credit").
  - Transfer: "Transfer", with "in" / "out" (a card: "paid off" /
    "charged"). The other account is not named yet — the ledger only gives
    the transfer's id; block 4 can add it.
  - Adjustment: its note as the title, "Correction" in the detail, the same
    words as a transfer. The note comes from the adjustments list, fetched
    on the same screen.
  - The date sits in each row's detail. No colour for direction — the words
    carry it.
- **"Show more"** fetches the next page of the ledger and adds it below.
- **Correcting a balance (`/accounts/:id/adjust`)** asks the question the
  way you notice the problem: "There's more in it than the app shows" /
  "There's less in it than the app shows" — for a card, "I owe more than
  the app shows" / "I owe less than the app shows". Then by how much, on
  which day (today prefilled) and why (required). The screen says it is
  for a balance that drifted, not a starting balance that was wrong.
- **An archived account** can still be opened by its address, shows that
  it is archived, and has no "Correct the balance".
- **An account that doesn't exist, or isn't yours,** shows "We couldn't
  find that account" with a way home.
- **`Choices` is a building block** — pick one of a few options, as
  buttons over real radio inputs. The add-account kind picker and the
  correct-the-balance question both use it. Made shared at its second use,
  not its third, because CLAUDE.md §8b says to build primitives rather than
  restyle one-offs.
- **Editing and archiving an account are not in block 3.** They are in
  the step 1 API but no screen block has claimed them yet.

### Forms, errors and sessions on the frontend

- **Errors from the form's own checks sit beside their field** — blank,
  email shape, too short — and focus moves to the first field with a
  problem. The browser's own validation pop-ups are turned off so these are
  the only ones.
- **Errors from the server sit in one box above the button.** Server replies
  carry no field name today.
- **Every form has one shape: `hooks/useForm.js`.** It holds the values,
  runs the form's own checks on submit, moves focus to the first problem,
  and calls the form's submit only when there are none. Each form still
  decides its own fields, its own checks, and what submitting does. Shared
  because login, register and add-account were the third copy of it.
- **Login errors never name a field.** "Wrong email or password", never
  "No account with that email" — naming the field would reveal which emails
  have accounts.
- **Whether error replies carry an optional `field` is decided at step 2**,
  when forms first have server rules that belong to one field.
- **Unknown addresses show a "not found" screen** with a way home, not a
  silent redirect.
- **When a logged-in person's session ends, the cache is wiped.** Any
  request answered 401 while someone is logged in marks them logged out, so
  the login check sends them to the login screen. Once their screens have
  closed, the login check removes every cached query except "who am I", and
  every finished form submission (those keep what was typed, passwords
  included). Wiping while their screens were still open made those screens
  fetch again — that order was tried and failed. A 401 while nobody is
  logged in changes nothing: "who am I" returns 401 to every logged-out
  visitor, and acting on that could refetch it in a loop. Logout itself
  (block 5) wipes the cache the same way.

---

## Build order

Each step is independently usable. Nothing later changes anything earlier.

| Step | What | Why here |
|---|---|---|
| 1 | Accounts, categories, transfers, adjustments | No dependencies |
| — | **Frontend for steps 0 and 1** | The plan pauses after step 3 for two weeks of real daily use, which needs an interface |
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

Category colours are a separate palette of eight — see "Money movements and
balances (step 1)". First-pass values, in `Web/src/tokens.css`:

```
saffron      #F0B429      sand         #CBB994      rose    #D98BB0
plum         #9C7BC4      indigo       #6F7FD6      sky     #7DB8E8
teal         #3AA6A6      slate        #8C98A6
```

Saffron was moved from `#E3A437` to `#F0B429` because on the dark surface it
read as the same colour as `card`.

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
- **Every paginated list orders by a unique key.** Sort by date, then by a
  tiebreaker that is unique within the list (for the ledger: source, then
  source id). Rows sharing a date would otherwise come back in any order, and
  pages would overlap or skip rows. For the ledger this relies on each
  `account_movements` branch producing at most one row per account for a
  given source id — a new branch that breaks this needs a different
  tiebreaker.
- **Sessions must last.** This app is opened several times a day; weekly
  logouts will kill the habit. Decided in step 0 — see "Auth and sessions".
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
