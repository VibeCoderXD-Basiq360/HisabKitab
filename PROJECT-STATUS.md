# PROJECT-STATUS.md

Read this first, every session. It says where the project is and what happens
next.

**Update it at the end of every working session.** A stale status file is
worse than none.

---

## Where things stand

**Current step: 1 — Accounts, categories, transfers**

**Status: not started.** Step 0 (auth) is done and committed.

| Step | State |
|---|---|
| 0 — Auth | Done |
| 1 — Accounts, categories, transfers | **Current** |
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

1. **New, empty repository.** Not a clone or a branch of the old one.
2. Add `CLAUDE.md`, `ARCHITECTURE.md`, `API-BREAKDOWN.md`, and this file.
3. Project skeleton: Express server, Postgres connection, one health endpoint.
   Nothing else. Review it.
4. Step 0 — auth. Five endpoints. Review.
5. Step 1, module by module: accounts → categories → transfers. Review each
   separately.

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
| Colour | Dark green, lime accent, 16 tokens — see `ARCHITECTURE.md` |
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
