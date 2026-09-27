# CLAUDE.md — Rules for this repository

These rules exist because the previous version of this project reached 44,000
lines that its owner could not read. Every rule below traces to a specific
failure in that codebase. Follow them literally.

If a rule blocks you, stop and ask. Do not work around it.

---

## 1. The prime rule

**The owner must be able to explain every merged file from memory the next day.**

If you write something he cannot explain, it does not matter that it works. It
gets rewritten or deleted. Optimise your output for being read, not for being
clever, complete, or impressive.

---

## 2. Size limits — hard

| Thing | Limit | If exceeded |
|---|---|---|
| Any file | 300 lines | Split it, or stop and ask |
| Route handler | 60 lines | Extract or simplify |
| Any function | 40 lines | Split it |
| Function parameters | 4 | Pass an object, or rethink |
| Nesting depth | 3 | Return early instead |

The previous codebase had a 1,017-line page component and an 819-line
controller. That is the failure mode these limits prevent.

If a limit is genuinely wrong for a case, say so and ask. Do not silently
exceed it.

---

## 3. Scope discipline

- Build **only** what the current step asks for. See `PROJECT-STATUS.md`.
- Do not add features, fields, endpoints, or options that were not requested.
- Do not build for a future requirement. If it is not in the current step, it
  does not exist.
- Do not create files that were not asked for — no extra README, no
  `utils.js` grab-bag, no config you were not told to add.
- If you think something is missing, **say so and wait**. Do not add it.

The previous codebase has completed one-off migration scripts, dead models,
and three overlapping ways to record the same thing, all from this failure.

---

## 4. Abstraction

- Write the thing directly. Do not add a layer "for flexibility".
- Do not abstract until the same code appears a **third** time. Twice is a
  coincidence.
- No base classes, generic handlers, factories, or wrappers unless explicitly
  asked for.
- Prefer boring, obvious code over concise or elegant code.

---

## 5. Dependencies

- **Never add a package without asking.** State what it does, what it costs,
  and what the alternative is.
- Prefer the standard library. Prefer 20 lines of our own code over a
  dependency.
- No ORM. Write SQL. This is deliberate — the previous project's schema grew
  to 55 models partly because adding one was frictionless.

---

## 6. Money

Non-negotiable, enforced everywhere:

- Money is **decimal with exactly 2 places**. Never a float. Never a JS
  `Number` in arithmetic.
- Database columns: `NUMERIC(12,2)`.
- All money arithmetic goes through the decimal helper. No exceptions.
- One currency. No conversion anywhere in the codebase.
- When splitting unevenly (₹1000 ÷ 3), the remainder goes to **one nominated
  share**. Never spread, never rounded up.

The previous codebase called `Number(split.amount)` to sum splits. Do not.

---

## 7. Data integrity

Rules the database must enforce, not just the UI:

- Sum of an expense's items **equals** the expense total, exactly.
- Sum of an expense's shares **never exceeds** the expense total.
- One settlement per share. Enforced by a unique constraint, not by checking
  first.
- Balances are always **calculated**, never stored.
- Archive, never delete. Anything with financial history is soft-deleted.

Every one of these gets a database constraint or a transaction. "The frontend
prevents it" is not acceptable.

---

## 8. Security

- **Every query is scoped.** No endpoint returns a row without checking the
  requester is entitled to it.
- The visibility rule: a person sees an expense only if they are a party to it
  — they paid, they own the account, or they hold a share.
- Never trust an ID from the request body. If the client sends
  `accountId`, verify it belongs to the user before using it.
- Enforce on the server. Never in the UI only.

The previous codebase let a user reference another user's payment type because
nothing checked. Do not repeat this.

---

## 8b. Styling — enforceable by grep

v1 declared design tokens and then bypassed them **3,236 times**. These two
rules are absolute because they are the only styling rules that can be
mechanically checked:

- **No hex colour literal anywhere except the token file.** Not in JSX, not in
  CSS, not "just this once" for a gradient stop.
- **No inline `style={{}}` objects. Ever.** Classes only.

Both are checkable with a single grep. If a grep for `style={{` or `#[0-9a-fA-F]{6}`
outside the token file returns anything, the code is wrong.

Also:

- Build the small set of primitives first (card, row, chip, progress) and use
  them. Do not restyle a one-off.
- Only the home screen is decorated. Everything else is flat surfaces and
  borders.

## 8c. Visibility — one fragment, used everywhere

The visibility rule (see `ARCHITECTURE.md`) is written **once**, as a shared
SQL fragment, and included in the `WHERE` clause of every query touching
expenses, shares, items, comments or receipts.

Never re-implement it inline. Never filter after fetching. Never rely on the
UI. A row the requester is not entitled to must never leave the database.

## 8d. Derived values

Nothing derived is stored — not in the database, not on the client.

Balances, net figures per person and monthly totals are always calculated from
the underlying rows. No cached balance column, no running total in a store or
in component state.

## 9. Code hygiene

- No commented-out code. Delete it; git remembers.
- No `TODO` or `FIXME` left in merged code. Either do it or raise it.
- No dead code. If nothing calls it, remove it.
- Output is for the person running the code, never leftover debugging.
  Server code prints only the startup line and unexpected errors in the
  error handler (the user only ever sees a generic message). Command-line
  scripts may print their results.
- No comments explaining *what* the code does. Comment only *why*, and only
  when the why is not obvious.
- Names say what the thing is. No `data`, `info`, `handle`, `process`, `temp`,
  `manager`, `helper`.

---

## 10. Working method

**One module at a time. One step at a time.**

1. Read `PROJECT-STATUS.md` to find the current step.
2. Read `ARCHITECTURE.md` for the rules that apply.
3. Read `API-BREAKDOWN.md` for the endpoints in scope.
4. Build **one** module. Stop.
5. Summarise in plain English: what you built, what each file does, what you
   decided that was not specified.
6. Wait for review. Do not start the next module.

Never build two modules in one go. Never start the next step because the
current one "is basically done".

---

## 11. When something is undecided

`ARCHITECTURE.md` is the source of truth. If it does not cover your situation:

**Stop and ask.** Do not pick the sensible default and carry on.

Undocumented decisions are how the last codebase became unreadable — not one
big mistake, hundreds of small unrecorded ones.

When a decision is made, it goes into `ARCHITECTURE.md` before the code is
written.

---

## 12. Explaining your work

After every module, write a short plain-English summary:

- What this module does, in two sentences
- Each file and its one-line purpose
- Anything you decided that was not in the spec
- Anything you are unsure about

No code in the summary. If you cannot explain it in plain English, it is too
complicated and should be rewritten.

---

## 13. Things you must never do here

- Refactor code you were not asked to touch
- Rename things across the codebase unprompted
- "Improve" or "clean up" a module while working on another
- Add CI, Docker, linting, or tooling unless asked
- Run tests against anything but a test database. Tests are allowed; they
  live in `Backend/tests/`, run with `npm test`, and must refuse to start
  unless the database name ends in `_test`
- Edit a migration once it is frozen. A migration is frozen once it is
  committed, or once it has run on any database whose name does not end in
  `_test`. Before that it may be edited, and the test database is dropped and
  rebuilt so no database holds an old version. After that, fix forward with a
  new file.
- Generate seed or demo data unless asked
- Write migration scripts to or from the old app — there is no data migration
- Copy code from the old repository. Read it for reference; write fresh.

---

## 14. The old repository

`VibeCoderXD-Basiq360/HisabKitab-Discarded-` is the previous version. It stays
live and untouched.

Note: `VibeCoderXD-Basiq360/HisabKitab` is **this** repo, the new one. The old
code moved to the `-Discarded-` URL. Do not confuse them.

Use it as a **reference** — to check how an edge case was handled, or what a
feature needed. Never as a **source** — do not copy files, patterns, or
schema from it.

Its mistakes are documented throughout this file.
