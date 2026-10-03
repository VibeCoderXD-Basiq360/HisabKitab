# PROJECT-STATUS.md

Read this first, every session. It says where the project is and what happens
next.

**Update it at the end of every working session.** A stale status file is
worse than none.

---

## Where things stand

**Current step: frontend for steps 0 and 1**

**Status: block 3 committed, not pushed — awaiting review.** Next: block 4,
transfers.

| Step | State |
|---|---|
| 0 — Auth | Done |
| 1 — Accounts, categories, transfers, adjustments | Done |
| — Frontend for steps 0 and 1 | **Current** |
| 2 — Expenses | Not started |
| 3 — Income | Not started |
| — Two weeks of real use | — |
| 4 — People and linking | Not started. **Close registration to invite-only here** — it is open until then |
| 5 — Shares, items, comments | Not started |
| 6 — Settlements | Not started |
| 7 — Account permissions | Not started |

---

## Immediate next actions

In order. Do not skip ahead.

1. **Frontend for steps 0 and 1 — not expenses.** Propose the setup first and
   wait: React and Vite, how the colour tokens are stored (Tailwind config or
   plain CSS), React Query, and what the PWA needs at this stage.
2. Only then, step 2.

Done so far: repository, the four documents, project skeleton, step 0 and
step 1.

**The old repository is now at
`VibeCoderXD-Basiq360/HisabKitab-Discarded-`** and stays live and untouched.
This repo (`HisabKitab`) is the new build. Keep using the old app daily until
v2 is genuinely better.

---

## How a module gets built

1. Read `ARCHITECTURE.md` for the rules that apply
2. Read `API-BREAKDOWN.md` for the endpoints in scope
3. Build **one** module — routes, handler, queries
4. Stop
5. Write a plain-English summary: what it does, what each file is for, what
   you decided that was not specified, what you are unsure about
6. Wait for review
7. Only after approval, move on

Never two modules at once. Never start the next step because the current one
is "basically done".

---

## The review gate

**Nothing merges that the owner cannot explain from memory the next day.**

After reviewing a module, close the files and explain what it does out loud.
If that fails, the review did not happen. Read it again or have it rewritten.

This is the rule the whole project depends on. v1 failed not because the code
was bad but because nobody read it.

Line-by-line review is easy at step 1 with 200 lines and hard at step 5 with
2,000. If a chunk is too big to read properly, **that is a signal to split it,
not to skim it**.

---

## To decide while building, not before

- **Credit card sign convention** — step 1, and step 6 depends on it
- **Session length and re-auth** — step 0
- **Backups** — before any real data is entered

## To decide at deploy

- **Proxy setting.** The password rate limit keys on the requester's IP.
  Behind a hosting proxy every request shows the proxy's IP, so Express's
  `trust proxy` setting must match the host — or every user shares one
  counter.
- **HTTPS on the local network.** The session cookie is `Secure`. Browsers
  allow that on `localhost`, but a phone reaching the laptop by its network
  IP over plain HTTP will never be logged in. Needs HTTPS, or testing on the
  deployed site.

- **Serving the frontend.** The session cookie needs `Web/` and the API on the
  same site. Either Express serves the built `Web/dist`, or a proxy puts both
  behind one domain.

## Known gaps

- **Negative opening amounts.** The add-account form can't enter one — an
  overdrawn account, or a card already in credit — because money inputs
  accept digits only. Workaround: add the account at zero, then an
  adjustment for the real amount.
- **Archive race.** If an account is archived at the same moment a movement
  on it is saved, it can end up archived with a non-zero balance. Harmless
  while only one person acts on an account. **Fix at step 6**, when two
  people can act on the same money — lock the account row while checking.

## Open questions

Nothing blocking. Two things deliberately left until they are real:

- **Foreign currency.** Excluded from v1. If an international trip actually
  happens, the plan is: convert at entry with a manually entered rate, store
  the original for reference, keep everything downstream in rupees. No
  exchange-rate table, no API.
- **Groups and multi-way debt simplification.** Step 8 candidates. Pairwise
  netting between two people covers the parents case and most trips. Revisit
  only after 1–7 are in daily use.

---

## Decisions already made — do not re-litigate

These were settled through long discussion. Reopening them costs more than it
gains.

| Decision | Settled as |
|---|---|
| Rewrite vs fix v1 in place | Rewrite, v1 stays live as reference |
| Stack | Node, Express, React, Postgres — same as v1 |
| ORM | None. Plain SQL. |
| Expense amount when people pay | Immutable. Never shrinks. |
| Whose expense is it | Payer's until settled, then bearer's |
| Monthly totals | Frozen. Month of the expense, plus a second "came back" figure |
| Netted settlement | One record for the real payment, not one per direction |
| Colour | Dark green, lime accent, 17 tokens — see `ARCHITECTURE.md` |
| Styling enforcement | No hex literals outside the token file, no inline styles |
| Frontend state | React Query owns server data; nothing derived on the client |
| Schema | Written step by step, not designed up front |
| Shares vs items | One list of items; shares calculated when items exist |
| Netting | A view, not stored data |
| Editing after settlement | Allowed. Settlement records never change. |
| Deleting a person with debt | Blocked |
| Deleting accounts and categories | Archive only |
| Linking a person | They see everything from the start, and must accept |
| Currency | Single currency, no conversion |
| Multi-user | From day one — the parents need real accounts |

---

## Session log

Append one entry per session. Keep entries short.

```
### YYYY-MM-DD — Step N, module X
Built:     
Decided:   
Unsure:    
Next:      
```

---

### 2026-09-15 — Planning
Built: nothing — design only
Decided: full v1 scope, 14 entities, all rules in `ARCHITECTURE.md`, stack,
build order, review process
Unsure: nothing blocking
Next: new empty repo, add these four files, then project skeleton

### 2026-09-16 — Design review and corrections
Built: nothing — UI prototype and design brief only
Decided: netted settlement records the real payment once; monthly totals frozen
with a second "came back" figure; visibility as one shared SQL fragment;
colour tokens and the two grep-enforceable styling rules; React Query owns
server state; schema written per step
Unsure: nothing blocking
Next: new empty repo, add these files, then project skeleton

### 2026-09-27 — Project skeleton
Built: Backend/ with Express server, Postgres pool, GET /api/health (SELECT 1),
404 catch-all returning `{ error: "Not found" }`, root .gitignore; local
database `hisabkitab` created, health check verified against it
Decided: Backend/ folder name, ES modules, express + pg only, config via
Node's --env-file, no token file until the frontend exists (recorded in
`ARCHITECTURE.md`); one startup log line is allowed; token count corrected
to sixteen
Unsure: nothing
Next: review skeleton, then step 0 — auth

### 2026-09-27 — Step 0, auth
Built: migrations runner + `users`, `sessions` tables; the five auth
endpoints; `session.js` with `requireAuth`; JSON error handler
Decided: see "Migrations" and "Auth and sessions" in `ARCHITECTURE.md`,
including the five marked "for review"
Then: change-password shares the login rate-limit counter; error handler
sends fixed messages only; console exceptions recorded in `CLAUDE.md` §9;
proxy and local-network HTTPS moved to "To decide at deploy"
Then: tests kept as `Backend/tests/auth.test.mjs` (`npm test`, Node's
built-in runner, `hisabkitab_test` database, refuses any name not ending in
`_test`); `CLAUDE.md` §9 rewritten as a principle, §13 allows tests
Unsure: expired session rows are never cleaned up
Next: step 1 — accounts module

### 2026-09-27 — Step 1, accounts
Built: `accounts` table and the `account_movements` view (opening-balance
branch only); the six accounts endpoints; `money.js` (validate, format
rupees); `days.js`; `db.js` returns DATE as a string
Decided: sign convention, archiving, opening-date rule for every movement,
adjustments as a new entity, category palette — all in `ARCHITECTURE.md`,
including four marked "for review"
Then: ledger tiebreaker written up as a rule for every paginated list;
accounts tests in `Backend/tests/`, test files run one at a time;
`design-brief.md` notes the separate category palette
Unsure: nothing
Next: categories

### 2026-09-27 — Step 1, categories
Built: shared test harness (`tests/harness.mjs`), both test files moved onto
it; `categories` table; the four categories endpoints; categories tests
Decided: eight colour keys, no icon until the frontend picks an icon set,
edits apply to past expenses — in `ARCHITECTURE.md`, plus one "for review"
Then: unknown fields rejected everywhere (auth, accounts, categories), rule
in `ARCHITECTURE.md`, checks in `src/fields.js`; test that the colour list
in the handler matches the database constraint
Unsure: nothing
Next: transfers

### 2026-09-27 — Step 1, transfers
Built: `transfers` table, its two branches in `account_movements`, the four
transfers endpoints, transfers tests; `callAs` moved into the test harness;
`isPositive` in `money.js`
Decided: transfers touching an archived account are frozen; every view
branch's amount is cast to NUMERIC(12,2) — both in `ARCHITECTURE.md`
Then: committed. Migration freeze rule in `CLAUDE.md`; archive race recorded
under "Known gaps"
Unsure: nothing
Next: adjustments

### 2026-09-27 — Step 1, adjustments
Built: `adjustments` table and its branch in `account_movements`; list and
create endpoints; adjustments tests
Decided: stored as amount plus direction; archived account is 409; list not
paginated — all in `ARCHITECTURE.md`. Frontend for steps 0–1 added to the
build order, before step 2
Unsure: nothing
Then: committed, with "when to use which" and the reason for the frontend
step in `ARCHITECTURE.md`
Next: frontend setup proposal

### 2026-09-27 — Frontend scaffold
Built: `Web/` — Vite, React, React Query, React Router (URLs only);
`tokens.css` with 16 UI tokens, 8 category colours and a spacing and radius
scale; `global.css`; `api.js`; manifest, `theme-color` and placeholder icons
Decided: saffron moved to `#F0B429` (read as `card` on the dark surface);
hex allowed in files that cannot read CSS variables (`CLAUDE.md` §8b);
router for URLs only; plain CSS modules — all in `ARCHITECTURE.md`
Then: hex grep widened to 3, 4, 6 and 8 digits and scoped to `Web/src`;
mutations never auto-retry; screen answers recorded; scaffold checked in a
real browser — renders, no console errors
Unsure: nothing
Next: block 1

### 2026-09-28 — Frontend block 1
Built: Inter self-hosted with its licence; building blocks (Card, Row, Chip,
Button, Field, MoneyInput, Amount) and `money.js`/`days.js` formatters;
`useAuth`; the login check (`RequireLogin`, and any 401 clears the current
user); login and register screens; a placeholder home
Checked in a real browser, against the test database: logged-out `/` goes
to `/login`; register logs in; a reload keeps the session; a session ended on
the server sends you back to login; wrong password shows the server's
message and is sent once; the unused blocks shown on a temporary page, since
removed. No console errors
Then, after review: not-found screen; errors from the form's own checks
beside their field with focus on the first; server errors in one box; the
cache wiped when a logged-in person's session ends (after their screens close
— wiping first was tried and failed); `CODEBASE-GUIDE.md` updated, and the
rule that every module updates it added to `CLAUDE.md` §12
Unsure: nothing
Next: block 2, home and accounts

### 2026-10-03 — Frontend block 2, home and accounts
Built: the hero card stack (no total; decorated — sheen, gradient, shadow,
grain, one glow); the accounts list; adding an account, with the form
changing for a credit card; `useAccounts`, `describeAccount.js`;
`FormScreen.module.css` now shared by login, register and add-account
Decided: wallet borrows the cash colour; derived shades in `tokens.css`;
rows and cards not links until block 3; no bottom bar until block 5;
negative opening amounts can't be entered — all in `ARCHITECTURE.md`
Checked in a real browser, against the test database: empty state; field
problems with focus on the first, card fields included; a card, a bank
account and a wallet added and shown; a duplicate name in the server box;
no console errors
Unsure: `Login` (58 lines) and `Register` (68) from block 1 break the
40-line function limit — found while checking block 2
Then: size limits rewritten as an alarm, not a wall (`CLAUDE.md` §2);
login, register and add-account now share `hooks/useForm.js` (third copy),
which also settles the two long functions. All three forms rechecked in the
browser
Next: review block 2, then push

### 2026-10-03 — Colour rules, then frontend block 3
Built: shadow based on `--bg`; the CLAUDE.md grep fixed (a control
character had replaced `\b`) and widened to `rgb(`, `rgba(`, `hsl(`,
`hsla(`; named colours made a review rule; negative opening amounts listed
as a known gap. Pushed with blocks 2 and the form change. Then block 3: home
cards and rows link to the account; the account screen with its ledger in
words and "Show more"; correcting a balance; `Choices` as a building block
Checked in a real browser, against the test database: 57 ledger rows across
two pages; a bank and a card corrected, with the right words and balances;
archived, missing and someone else's account; no console errors
Unsure: the card shadow, now plain `--bg`, barely shows against the page
Then: `--shadow` became the seventeenth token (#020403, chosen against the
glow; depth checked in the browser); CLAUDE.md §9b — routine checks, a
control-character scan, and the rule that every documented check is proven
by planting a violation (all three proven); editing and archiving an account
added to block 3, with the archive refusal suggesting a correction; transfer
labels gain the other account in block 4
Unsure: nothing
Next: review block 3, then push
