# HisabKitab — Gap & Improvement Tracker

**Last updated:** 2026-06-22 (session 2)  
**Legend:** ✅ Done · 🔧 In progress · ❌ Not started

---

## Summary scorecard

| Priority | Total | Done | Not Started |
|----------|-------|------|-------------|
| P0 — Core fixes | 3 | 3 | 0 |
| P1 — High value | 5 | 4 | 0 | ← bank SMS skipped (PWA limitation) |
| P2 — Medium value | 5 | 5 | 0 |
| P3 — Nice to have | 4 | 4 | 0 |
| **Total** | **17** | **17** | **0** |

> Update the scorecard manually when you tick items below.

---

## Recently completed (not gaps anymore)

- ✅ **Settle all at once** — `POST /splits/settle-all/:personId`; "✓ Mark all received · ₹X" button on BalancesPage. *(2026-06-21)*
- ✅ **Global search** — `/search` page (debounced 350ms) covers expenses/people/groups/tabs/loans. TopBar 🔍 icon on HomePage. *(2026-06-21)*
- ✅ **Partial split** — "My share (optional)" field in AddEditExpensePage; splits only the remainder. *(2026-06-21)*
- ✅ **Income tracking** — `Income` model (SALARY/FREELANCE/RENTAL/BUSINESS/INVESTMENT/GIFT/REFUND/OTHER); CRUD at `GET/POST /api/income`, `PUT/DELETE /api/income/:id`, `GET /api/income/summary`; IncomePage `/income` with month nav + add/edit sheet; Home overview shows Income · Expenses · Net card when income logged; Analytics shows net insight. *(2026-06-22)*
- ✅ **Subscription tracker** — `Subscription` model (MONTHLY/QUARTERLY/HALF_YEARLY/YEARLY cycles); CRUD at `/api/subscriptions`; SubscriptionsPage `/subscriptions` with due-soon alerts and monthly burn; FCM reminder 3 days before due (daily 9am cron). *(2026-06-22)*
- ✅ **Spending insights** — `GET /api/insights` computes: net this month, category spike vs last month, biggest expense, highest spend day, budget alerts, subscriptions due; insights card added to AnalyticsPage (This Month only). *(2026-06-22)*
- ✅ **3+ person Tabs** — `TabMember[]` join table; `memberId` nullable on SharedTab; multi-member auto-ACTIVE with equal split; `computeBalanceMulti` per-member net map; Group (3+) creation form with multi-email picker; per-member balance list + "Pay to" picker in settle sheet; "Split equally N ways" entry badge. *(2026-06-22)*
- ✅ **Split reimbursement visibility** — When A settles a split, B now gets an explicit `isReimbursement: true` expense card. Analytics excludes reimbursements from totals. *(2026-06-20)*
- ✅ **Shared Tabs** — 2-person expense sharing tab with entries, settlements, auto-linked expenses. *(2026-06-19)*
- ✅ **Monthly Tab Groups** — Persistent group (Ghar Kharch style) with monthly ACTIVE/CLOSED tabs, invite flow, cumulative balance. *(2026-06-19)*
- ✅ **Tab badge on ExpenseCard** — `🤝 [Tab Name]` badge for tab-sourced expenses. *(2026-06-19)*
- ✅ **Analytics bySource** — Manual vs Tab vs Reimbursements breakdown card in AnalyticsPage. *(2026-06-19)*

---

## P0 — Core fixes ✅ ALL DONE

---

## P1 — High value features

- ✅ **Income tracking** — done 2026-06-22
- ✅ **Subscription tracker** — done 2026-06-22
- ✅ **Spending insights** — done 2026-06-22
- ⛔ **Bank SMS auto-import** — Skipped. PWA cannot access device SMS on iOS (no API), Android requires a native companion app or Tasker. Not feasible without going native. Defer indefinitely.
- ✅ **Offline expense queue** — `localStorage`-based queue; `useOfflineQueue` hook with auto-sync on `online` event; 4xx conflicts marked failed with retry/discard UI; HomePage shows offline banner + pending/failed count + "Sync now" button + sync success toast. AddEditExpensePage and QuickAddPage both queue when offline. *(2026-06-22)*
- ✅ **Duplicate detection** — `useMemo` scans TanStack cache for same amount + category within 24h; amber dismissable banner above submit button in AddEditExpensePage. *(2026-06-22)*
- ✅ **PDF / rich export** — `jsPDF` + `jspdf-autotable`; ExportPage now has CSV + PDF cards; PDF includes header, summary cards, category breakdown table, full expense list, page numbers. *(2026-06-22)*
- ✅ **PWA Quick-Add Widget** — `/quick-add` route; minimal amount + category chips + payment chips + instant save; manifest shortcut updated to `/quick-add`; "Open full form →" escape hatch. *(2026-06-22)*
- ✅ **Share expense summary** — Web Share API on AnalyticsPage + BalancesPage; clipboard fallback. *(2026-06-22)*
- ✅ **Expense templates (Quick Add)** — `ExpenseTemplate` model; CRUD at `/api/templates`; ⚡ Quick Add sheet on HomePage; "Save as template" modal in AddEditExpensePage; pre-fill via `location.state.template`; `/settings/templates` management page. *(2026-06-22)*
- ✅ **Financial Goals** — `FinancialGoal` model; CRUD + contribute endpoint; `/settings/goals` page with progress bars, color picker, deadline countdown; goals strip on HomePage. *(2026-06-22)*
- ✅ **Net Worth Dashboard** — `Asset` model (CASH/BANK/INVESTMENT/PROPERTY/VEHICLE/OTHER); `/api/net-worth` aggregator pulls loans + split debts as liabilities; `/net-worth` page with 3-tab UI + breakdown bars; entry point on AnalyticsPage. *(2026-06-22)*
- ✅ **OCR Receipt Scanning** — Google Gemini 1.5 Flash vision API; `POST /api/ocr/scan`; "🔍 Scan & Fill" button on AddEditExpensePage; auto-fills title/amount/date/category from receipt photo. *(2026-06-22)*
- ✅ **3+ person Tabs** — `TabMember[]` join table added; `SharedTab.memberId` nullable (null = multi-member). Multi-member tabs are auto-ACTIVE, equal split. Controller has separate `computeBalanceMulti` / `computeBalance2Person` paths. Frontend: type toggle (2-person / Group 3+) in create form; per-member balance list + "Pay to" picker in settle sheet; "Split equally N ways" badge on entries. *(2026-06-22)*

---

## P2 — Medium value features ✅ ALL DONE

- ✅ **Net worth dashboard** — Assets (savings accounts, FDs, investments, cash) vs liabilities (loans, credit card outstanding, EMIs remaining). Single net worth number that updates over time. Simple CRUD for asset entries + pulls loan outstanding automatically from existing Loan model.

- ✅ **WhatsApp / share expense summary** — Share monthly expense summary or group balance as a formatted message via Web Share API. Useful for sending group settlement details to someone not on the app. Generate a plain-text or image summary and pass to `navigator.share()`.

- ✅ **OCR receipt scanning** — Tap receipt photo → extract amount and merchant name automatically. Use Google Vision API or Tesseract.js client-side. Pre-fills the Add Expense form so user just confirms. Reduces manual entry friction significantly.

- ✅ **Expense templates (Quick add)** — Save common expenses as templates (e.g., "Petrol ₹500 · Fuel · UPI"). One tap to add from template. Accessible from home page FAB or a dedicated "Quick Add" bottom sheet. No schema change — just a `ExpenseTemplate` model.

- ✅ **Financial goals (multiple)** — Current savings goal is single and basic. Extend to multiple named goals (Emergency Fund, Vacation, Laptop, etc.) each with a target amount, deadline, and linked savings account. Progress bar and projected completion date based on current monthly surplus.

---

## P3 — Nice to have

- ✅ **PDF / rich export** — Current export is plain CSV. Add a formatted PDF monthly report: cover page (month + summary), category breakdown pie chart, day-wise spend bar chart, full expense table. Use `jsPDF` + `html2canvas` on frontend.

- ✅ **Duplicate detection** — Warn user when adding an expense that looks like a duplicate (same amount + same category within 24 hours). Show a "Possible duplicate" banner with a dismiss option. Pure frontend check on the existing expense list.

- ✅ **Widget / home screen shortcut** — PWA shortcuts already exist (manifest.json) but only navigate to pages. Add a true quick-add flow: tapping the shortcut opens a minimal 3-field sheet (amount, category, payment type) that saves instantly without full app load.

- ✅ **Offline expense queue** — Currently offline just shows a banner. When offline, let users add expenses to a local queue (IndexedDB / Zustand persist). Sync automatically when back online. Requires conflict detection if the same category/payment type was deleted server-side while offline.

---

## How to use this file

1. When starting a feature, change `- [ ]` to `- [🔧]`.
2. When fully done, move it to the **Recently completed** section with a date and change tracker count.
3. Update the **Summary scorecard** table after every change.
4. Update `Last updated` date at the top.
N