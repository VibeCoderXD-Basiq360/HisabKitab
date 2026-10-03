# CODEBASE-GUIDE.md

A plain-English walk through every file in HisabKitab v2. Written from the
actual code, not from summaries of it, and updated in the same commit as every
module (`CLAUDE.md` §12). Last updated for: **frontend block 1** — logging in.

**How to use this.** Read a section, then close it and answer the questions at
the end of that section out loud, without looking. If you can't, read the real
file once — it'll be short — and try again. Recognising an explanation is easy.
Producing one is what understanding is.

---

## 1. The one idea that explains the whole backend

Every request takes the same journey, in the same order, through the same
kinds of files:

```
phone  →  server.js  →  routes.js  →  requireAuth  →  handlers.js  →  queries.js  →  database
                                                                          ↓
phone  ←  ─────────────────────────  JSON reply  ←──────────────────────  rows
```

Each step has exactly one job:

| Step | Job | Knows about |
|---|---|---|
| `server.js` | Receives every request and sends it to the right module | Which modules exist |
| `routes.js` | Matches the address and method to a function | Addresses only |
| `requireAuth` | Checks you're logged in, and says who you are | Sessions only |
| `handlers.js` | Checks the request makes sense, applies the rules | Rules, not SQL |
| `queries.js` | Talks to the database | SQL, not rules |

The split between **handlers** and **queries** is the most important one. A
handler decides *whether* something is allowed. A query only knows *how* to
read or write it. When something goes wrong, this tells you where to look:
wrong decision → handler; wrong data → query.

Once you understand one module, you understand all of them. They're built to
the same shape on purpose.

---

## 2. The folder tree

```
HisabKitab/
├── CLAUDE.md              rules Claude Code must follow
├── ARCHITECTURE.md        the design: what exists and why
├── API-BREAKDOWN.md       every endpoint, by build step
├── PROJECT-STATUS.md      where the project is, what's next
├── design-brief.md        the visual design, for a design tool
├── CODEBASE-GUIDE.md      this file
│
├── Backend/
│   ├── package.json       the two packages, and the npm commands
│   ├── migrations/        how the database gets its tables, in order
│   │   ├── 001_users.sql
│   │   ├── 002_sessions.sql
│   │   ├── 003_accounts.sql
│   │   ├── 004_categories.sql
│   │   ├── 005_transfers.sql
│   │   └── 006_adjustments.sql
│   ├── src/
│   │   ├── server.js      the front door
│   │   ├── db.js          the connection to Postgres
│   │   ├── session.js     who is logged in
│   │   ├── migrate.js     runs the migration files
│   │   ├── health.js      "is everything working?"
│   │   ├── money.js       checking and formatting rupees
│   │   ├── days.js        checking dates
│   │   ├── fields.js      checking request fields and ids
│   │   ├── auth/          register, login, logout, password
│   │   ├── accounts/      bank, cash, wallet, cards
│   │   ├── categories/    what money was spent on
│   │   ├── transfers/     money between your own accounts
│   │   └── adjustments/   correcting a balance that drifted
│   └── tests/
│       ├── harness.mjs    shared test setup
│       └── *.test.mjs     one test file per module
│
└── Web/
    ├── index.html         the one HTML page
    ├── vite.config.js     dev server, and /api forwarding
    ├── public/            icons and the app manifest
    │   └── fonts/         Inter, and its licence
    └── src/
        ├── main.jsx       starts the React app; what a 401 means
        ├── App.jsx        which screen shows at which address
        ├── api.js         the only place that calls the backend
        ├── RequireLogin.jsx  the login check around protected screens
        ├── money.js       showing rupees (display only)
        ├── days.js        showing dates (display only)
        ├── tokens.css     every colour, the only place hex lives
        ├── global.css     page-wide styles, and the font
        ├── hooks/
        │   └── useAuth.js     who am I, log in, register
        ├── components/    the building blocks screens are made of
        │   ├── Card.jsx       a flat bordered surface
        │   ├── Row.jsx        one line of a list
        │   ├── Chip.jsx       a small pill, with a category colour dot
        │   ├── Button.jsx     lime for the action, quiet for the other
        │   ├── Field.jsx      a labelled input, with its error
        │   ├── MoneyInput.jsx a Field that only accepts money
        │   └── Amount.jsx     a rupee amount, number only
        └── screens/
            ├── Login.jsx
            ├── Register.jsx
            ├── Home.jsx       placeholder until block 2
            └── NotFound.jsx   for addresses that match nothing
```

Each component and screen has a `.module.css` file beside it with its styles.

---

## 3. The shared backend files

These are used by every module.

### `server.js` — the front door (35 lines)

Every request arrives here first. It does four things, in order:

1. `express.json()` — turns the request body from text into a JavaScript object.
2. Hands the request to each module's router. Each one checks "is this
   address mine?" and either handles it or passes it on.
3. If no module claimed it, replies `404 Not found`.
4. If anything crashed along the way, the last handler catches it. You, the
   user, see only "Something went wrong". The real error is printed on the
   server for you, the developer.

That last part matters. The real error might contain table names or database
details. It goes in the server log, never to the phone.

Express knows the final function is an error handler only because it takes
**four** parameters instead of three. That's why the comment is there.

### `db.js` — the connection to Postgres (7 lines)

Opens a **pool**: a handful of database connections kept open and reused.
Opening a fresh connection for every request is slow, so every query borrows
one from the pool and gives it back.

The other line fixes a subtle problem. Postgres stores dates as days, like
`2026-09-27`. The `pg` library would normally turn that into a JavaScript date
at midnight — which, in a different timezone, can silently become the 26th.
This line keeps dates as plain text, so a day is always the day you typed.

### `session.js` — who is logged in (52 lines)

The most security-sensitive file in the project.

When you log in, `startSession`:
- makes a long random token (64 characters of randomness)
- stores only a **fingerprint** of it (a SHA-256 hash) in the database
- gives the real token to your browser as a cookie

Why store a fingerprint and not the token? If someone ever stole a copy of the
database, they'd have fingerprints — which can't be turned back into tokens, so
they can't log in as anyone. Same idea as never storing passwords.

The cookie settings each do one job:
- `httpOnly` — page JavaScript can't read it, so a script-injection bug can't
  steal it
- `secure` — only sent over HTTPS
- `sameSite: 'lax'` — sent when you tap a link to the app (so notification links
  work), but not with forged form submissions from other sites

`requireAuth` runs before every protected handler. It reads the cookie,
fingerprints it, and looks for a matching session used in the last 30 days.
No match means `401 Not logged in`. A match puts `req.user` on the request, so
every handler after it knows who you are.

To avoid writing to the database on every single request, the "last used" time
only moves forward once a day.

### `migrate.js` — building the database (40 lines)

Runs `npm run migrate`. It:

1. Makes sure a table called `schema_migrations` exists. This is its memory of
   which files have already run.
2. Lists every `.sql` file in `migrations/`, sorted by name — so `001` runs
   before `002`.
3. Skips anything already recorded.
4. Runs each new file inside a **transaction**: `BEGIN`, the SQL, record it,
   `COMMIT`. If anything fails, `ROLLBACK` undoes the whole file, so the
   database is never left half-changed.

This file prints its results, because it's a command you run by hand and its
output is the point.

### `money.js` — rupees, safely (25 lines)

The rule this file exists for: **money is never a JavaScript number.**
JavaScript numbers can't hold some decimals exactly — `0.1 + 0.2` gives
`0.30000000000000004`. For money that's unacceptable.

So money always travels as text, like `"1200.00"`.

- `parseMoney` checks text looks like money (at most 10 digits, at most 2
  decimals) and pads it to exactly 2 decimals. `"5"` becomes `"5.00"`.
  Anything else returns `null`, which the handler turns into an error.
- `isPositive` checks an amount is above zero by looking at the text itself —
  no arithmetic, so no rounding risk.
- `formatRupees` writes Indian grouping: `"3100000.00"` → `₹31,00,000.00`.

All actual adding up happens in Postgres, which handles decimals exactly.

### `days.js` — dates (10 lines)

Checks a date is a real `YYYY-MM-DD` day. Rejects impossible ones like 30
February.

### `fields.js` — checking requests (13 lines)

Two small checks every module uses.

- `isId` — an id must be text made of digits. `"12"` is fine, `12` is not.
- `unknownFieldError` — rejects any field the endpoint doesn't expect.

That second one prevents a nasty silent failure. This codebase spells it
`colour`. If someone sends `color` and it were simply ignored, the request
would say "success" while changing nothing. Instead it fails loudly:
`Unknown field "color". Allowed: name, colour`.

### `health.js` — is it working? (13 lines)

`GET /api/health` asks the database for `SELECT 1`. If the database answers,
`{ ok: true }`. If not, `503`. It proves the whole chain — server, connection
details, database — works end to end.

---

## 4. A module, fully explained: `accounts/`

Every module has the same three files. Accounts is the richest, so it's the
one to learn properly. The others follow its shape.

### `accounts/routes.js` — the addresses (19 lines)

Six lines that matter, one per endpoint:

```
GET   /accounts              list them
POST  /accounts              create one
GET   /accounts/:id          see one
PATCH /accounts/:id          edit one
POST  /accounts/:id/archive  archive one
GET   /accounts/:id/ledger   its money movements
```

Each line names the function to call, and puts `requireAuth` in front of it.
That's the whole file. If you want to know what an address does, this tells
you which handler to open.

### `accounts/handlers.js` — the rules (169 lines)

This is where requests get checked and rules get applied. The important
functions:

**`readAccountFields`** checks everything about a new or edited account. Name
not blank. Kind is one of the four. A real date. And the clever part: a bank
account must send `openingBalance`, a card must send `openingOutstanding`, and
sending the wrong one is an error rather than being quietly ignored.

The same function is used for both creating and editing. Editing first merges
your changes over the existing account, then checks the whole thing. One set
of rules, applied the same way every time.

**`toPublicAccount`** shapes what the phone receives. A card gets
`outstanding`, everything else gets `balance` — never both. The phone never has
to know how balances are stored inside.

The handler also enforces rules like: kind and opening date can't change after
creation; an archived account can't be edited; an account can only be
archived once its balance is zero.

### `accounts/queries.js` — the SQL (95 lines)

Two pieces here are worth understanding deeply.

**The card flip.** Inside the database, every amount means "money in this
account". So a card where you owe ₹8,200 is stored as `-8200.00`. That's
strange to read, but it means one rule works for everything — money leaving is
always minus, money arriving is always plus.

People don't think of cards that way, though. So `ACCOUNT_COLUMNS` flips the
sign for cards on the way out:

```sql
CASE WHEN a.kind = 'credit_card' THEN -totals.balance ELSE totals.balance END
```

This is the **only** place in the codebase the flip happens. If it happened in
several places, sooner or later one would be wrong.

**The balance is calculated, never stored.** `BALANCE_JOIN` adds up every
movement for the account, freshly, every time you ask. There's no "balance"
column anywhere in the database. A stored balance can drift out of step with
the movements it's meant to summarise; a calculated one can't.

Notice every query has `WHERE ... user_id = $2`. That's ownership, built into
the query itself. Asking for someone else's account doesn't return it and then
check — it simply finds nothing.

The `$1`, `$2` placeholders are also security. Values are sent separately from
the SQL, so nobody can sneak SQL in through a name or a note.

---

## 5. The other modules, by difference

They follow the accounts shape exactly. Only what's different:

**`auth/`** (235 lines across the three files) — register, login, logout,
change password. Passwords are hashed with `scrypt`, a deliberately slow hash,
so guessing is expensive. The cost settings are stored inside each hash so they
can be raised later. Five wrong passwords from the same email and address lock
that pair out for 15 minutes. Changing your password logs out every other
device — that's how you deal with a lost phone.

**`categories/`** (135 lines) — a name and one of eight colour keys. The
database refuses any other colour.

**`transfers/`** (193 lines) — money between two of your own accounts. The
database itself refuses a transfer touching someone else's account, using a
foreign key on `(account_id, user_id)` together. Deleting keeps the row but
drops it from balances.

**`adjustments/`** (102 lines) — correcting a balance that drifted. Never
edited or deleted; a wrong one is fixed with another one. Requires a note
saying why.

---

## 6. The database

### Migrations

Each file in `migrations/` is one change to the database, run once, in
number order. **Once a file is committed, it never changes.** To fix a mistake,
you write a new numbered file. This means any database can be rebuilt from
nothing by running every file in order, and you always know exactly how it got
to its current shape.

### The heart of it: `account_movements`

Look at the bottom of `006_adjustments.sql`. It defines a **view** — a saved
query that behaves like a table.

It gathers every movement of money in the app into one list, with one shape:
which account, how much (signed), what date, what kind of movement, and its id.

```
opening balance    → one row per account
transfer, money out → minus on the account it left
transfer, money in  → plus on the account it reached
adjustment          → plus or minus on its account
```

Every balance in the app is just "add up this view for one account". Every
ledger is just "list this view for one account".

This is why the design scales. When expenses arrive in step 2, they add one
more branch: minus on the account it was paid from. Income in step 3 adds
another. Settlements in step 6, another. The balance query never changes —
only the list of things that move money grows.

The `::numeric(12,2)` casts are there because negating an amount quietly
changes its type, and Postgres refuses to let a replaced view change a
column's type.

---

## 7. Tests

`npm test` runs every file in `Backend/tests/`, one at a time.

`harness.mjs` holds what every test file shares: starting a server, connecting
to the database, making requests, logging in. Its most important line runs the
moment it's imported — it **refuses to start** unless the database name ends in
`_test`. That's what stops the tests, which empty tables, from ever touching
your real data.

Each `*.test.mjs` file checks one module: the things that should work, and the
things that should be refused.

---

## 8. The frontend

### `main.jsx` — starting the app

Wraps the app in two things. **React Query**, which fetches and remembers data
from the server. And the **router**, which decides which screen is showing.

It also sets two important rules:
- **Mutations never retry.** If creating a transfer timed out, it might have
  saved anyway. Retrying could record the same money twice.
- **Queries retry only on network or server errors**, never on a 4xx. A
  "not found" will be "not found" again.

### `api.js` — the only door to the backend

The one place in the whole frontend that calls the server. It sends JSON,
reads JSON, and turns any error reply into a readable error. The session
cookie travels by itself, because the frontend and backend share one site.

If the backend is completely down and replies with something that isn't JSON,
it still produces a readable error instead of crashing.

### `tokens.css` — every colour

The only file in `Web/src` allowed to contain a colour code. Everything else
refers to colours by name, like `var(--ink-2)`. That's what stops v1's problem,
where colours were defined once and then hard-coded 3,236 times.

### `App.jsx`, `vite.config.js`, `index.html`, `global.css`

`App.jsx` maps addresses to screens: login and register for anyone, home
inside the login check, and "Nothing here" for anything else.
`vite.config.js` runs the dev server and forwards `/api` requests to the
backend. `index.html` is the single page everything renders into.
`global.css` sets the page background, text colour and focus ring, and loads
Inter from our own server — no request to an outside font service.

### Block 1: logging in

What's different about the first real screens.

**The login check — `RequireLogin.jsx` (30 lines).** Every screen that needs
a session sits inside it in `App.jsx`. It asks one question — "who am I?" —
and either shows the screen or sends you to `/login`, remembering where you
were so you come back there afterwards. "Who am I" is asked once per page
load and then trusted. It never asks again by itself; instead, the moment any
request comes back 401, the app knows the session has ended.

**When your session ends (`main.jsx` and `RequireLogin.jsx`).** The order
matters, and the first version got it wrong:

1. A request comes back 401 while you're logged in.
2. `main.jsx` marks you logged out — nothing else.
3. The login check notices, closes your screens and sends you to `/login`.
4. *Only then* does it wipe everything cached for you.

The first version wiped first. The screen you were on was still open, so it
immediately fetched its data again, and the redirect never happened. Wiping
after the screens have closed means nothing is left to refetch.

Two details. The wipe keeps "who am I", because removing that would make it
fetch again. And it also throws away finished form submissions, because those
quietly keep what was typed — including the password from logging in.

A 401 while nobody is logged in changes nothing. "Who am I" answers 401 to
every logged-out visitor; reacting to that could fetch it in a loop.

**Logging in wipes first, too (`useAuth.js`, 46 lines).** Someone else may
have used this browser. Before your data arrives, theirs is gone. Register
logs you straight in, because the backend's register doesn't.

**Two kinds of error, in two places (`Login.jsx`, `Register.jsx`).** The form
checks itself before sending: blank name, an email that doesn't look like
one, a password under 8 characters. Those errors appear under their field,
and focus jumps to the first one. The browser's own pop-ups are switched off
so these are the only ones. Errors from the server — "That email is already
registered", "Too many attempts" — appear in one box above the button,
because the server doesn't say which field they belong to.

The login error is deliberately vague: "Wrong email or password", never
"No account with that email". Saying which was wrong would tell a stranger
which emails have accounts.

**The building blocks (`components/`).** Screens are built from these, never
restyled one-offs. Two have a rule worth knowing:

- `MoneyInput` only lets you type digits and at most two decimals. What you
  type stays text all the way to the server — it's never turned into a
  number.
- `Amount` shows the number and nothing else. Whoever uses it adds the word
  ("outstanding", "owes you"), because direction is never shown by colour
  alone.

**Formatting only (`money.js`, `days.js`).** `money.js` is a copy of the
backend's `formatRupees` — the two folders share no code. `days.js` turns
`2026-09-18` into "18 Sep" by reading the text itself; turning it into a
JavaScript date first could shift it a day across timezones.

---

## 9. Explain without looking

Answer these out loud. Each one tests a section.

**The journey**
1. A request comes in for `PATCH /api/accounts/7`. Name every file it passes
   through, in order.
2. Something is being saved wrong. Handler or query — where do you look first,
   and why?

**Sessions**
3. Why does the database store a fingerprint of the token, not the token?
4. Why `lax` and not `strict`?

**Money**
5. Why is money text instead of a number?
6. Where does adding up actually happen?

**Accounts**
7. A card owes ₹8,200. What's stored in the database, and why?
8. Where is the only place the card sign gets flipped? Why only there?
9. Why is there no balance column?

**Database**
10. What is `account_movements`, and what happens to it in step 2?
11. You committed a migration with a typo. What do you do?

**Tests**
12. What stops the tests from wiping your real database?

**Frontend block 1**
13. Your session ends while a screen is open. What happens, step by step —
    and why does the cache wipe wait until the screen has closed?
14. Why does the login error never say which field was wrong?
15. A form shows "Use at least 8 characters" under the password, but "That
    email is already registered" in a box above the button. Why the
    difference?

If you can answer all of these, you understand v2 better than you understood
v1.
