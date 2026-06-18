# HisabKitab — Feature Roadmap

## Already Built ✅
- Full expense CRUD (categories, payment types, people)
- Auth — Google + Email/Password + Forgot Password
- PWA icons + manifest
- Home page search (300ms debounce)
- Balance nudge cards (you owe / owed to you)
- Split & Settle with state machine (PENDING → PAYMENT_REQUESTED → CONFIRMED/REJECTED)
- Waived splits (🎁 forgiven, no amount deducted)
- Paid for others (single person owes full amount)
- Settlement logging on expense cards (strikethrough + badge)
- Profile photo upload with crop/zoom/rotate editor (Cloudinary)
- Analytics — 6-month trend, daily spend, category + payment breakdown, budget inline, period selector, comparison badge
- Recurring expenses — day/time picker, end date, pause/resume/delete
- Budget limits — per-category monthly limit, progress bar (green/yellow/red)
- Bulk Payment — select multiple splits, approval/reject flow, FCM both ways
- Group system — TRIP/HOME/WORK/COUPLE/OTHER, equal/exact splits, net balances, smart settle-up, settlements
- Notification system — DB-persisted, bell icon, unread badge, type icons, navigation
- Export to CSV — period selector, columns: Date/Title/Category/Payment Type/Amount/Note/Paid For/Group + Total row

---

## Roadmap

### Quick Wins (1–2 days)

- [x] **Budget alert push notification** — fires at 80% and 100% of category budget after each expense create/update; deduplicates via Notification table (one alert per threshold per month).
- [x] **UPI deep link on split request** — "Pay via UPI" button on BalancesPage I-owe cards; opens `upi://pay?pa=...` in GPay/PhonePe.
- [x] **Swipe to delete / long-press to duplicate** — swipe left on expense card reveals red delete zone; hold 600ms to duplicate with today's date.
- [x] **PWA shortcuts in manifest** — Add Expense, Groups, Balances shortcuts in manifest.json for home screen long-press menu.
- [x] **Home screen budget summary** — compact progress bar on HomePage showing total month spend vs all budget limits; green/yellow/red; tappable to Budgets page.
- [x] **Custom date range picker for Analytics** — "Custom" chip reveals from/to date inputs; query fires only when both dates are set.

### Medium Effort (2–4 days)

- [x] **Smart insights card on home** — rotating insight derived from existing data: budget near-limit, top category, biggest expense.
- [x] **Settle-up reminder notification** — if a split has been PENDING for 7+ days, send an FCM nudge to the ower; deduplicates via Notification table (once per 7 days).
- [x] **Receipt photo on expense** — attach a Cloudinary image to an expense (same upload pattern as profile photo); shown as thumbnail; viewable full-screen.
- [x] **Calendar view** — monthly calendar grid with colored dots per day; tap a day to expand expense list; prev/next navigation.
- [x] **Voice input on Add Expense** — Web Speech API, say "500 rupees food UPI" and auto-fill amount, category, payment type, and title.
- [x] **Unequal / percentage splits in groups** — GroupDetailPage supports Equal / By ₹ / By % modes with live validation.
- [x] **Expense search in Groups** — search bar on GroupDetailPage filters group expenses by title.
- [x] **Recurring expense auto-create push** — FCM notification sent when recurring expenses are auto-generated (e.g. "Netflix ₹649 auto-added for June").

### Larger Features (1–2 weeks)

- [x] **Offline support** — NetworkFirst Workbox strategy caches API responses; OfflineBar component shows "offline" / "back online" banner.
- [x] **Import from CSV / bank statement** — papaparse, 3-step flow (upload → column map → import), auto-detects column names, up to 500 rows, matches categories & payment types by name.
- [x] **Share bill as image** — html2canvas captures a styled bill card in BalancesTab; uses Web Share API on mobile, downloads PNG on desktop.
- [x] **Multi-currency on expense** — currency picker (INR/USD/EUR/GBP/AED/SGD/THB/JPY/…) on Add/Edit; stored on Expense; displayed with correct symbol on cards.
- [x] **Monthly email report** — node-cron fires 1st of each month; Nodemailer sends HTML email with total spent, top categories, budget alerts; configurable via SMTP_* env vars.
- [ ] **Google Drive backup** — one-tap export of all data as a JSON/CSV zip to the user's Google Drive. Pairs with existing export feature.

### Polish & Power-user

- [x] **Dark mode** — system-preference-aware (`prefers-color-scheme`), toggle in Settings. All pages covered.
- [x] **Expense tags** — free-form tags on expenses for flexible cross-category filtering (e.g. "work", "travel", "reimbursable"). `tags String[]` on Expense, TagInput chip component, shown on ExpenseCard, autocomplete from `GET /expenses/tags`.
- [x] **Expense comments / notes thread** — add follow-up notes to an existing expense (e.g. "reimbursed by company on Jun 20"). `ExpenseComment` model, GET/POST/DELETE `/expenses/:id/comments`, comment section in AddEditExpensePage (edit mode only).
- [x] **Account deletion (GDPR)** — wipe account with Cloudinary photo cleanup and full cascade delete. `DELETE /users/me` backend endpoint, double-confirm dialog in SettingsPage.
- [x] **Installment / EMI tracker** — `Loan` + `LoanPayment` models (migration `20260618061003_add_loans`). Full CRUD backend. Create form with live EMI/interest preview. Detail page with full amortization table — tap any row to mark paid/unpaid, overdue rows flagged red. Accessible via Settings → EMI Tracker.
- [x] **Savings goal** — set a monthly savings target + optional income; home screen widget shows progress bar and goal status (on track / at risk). `SavingsGoal` model, `GET/PUT/DELETE /savings-goal`, Settings → Savings Goal page.
- [x] **Biometric / PIN lock** — 4-digit PIN (SHA-256 hashed) + optional WebAuthn biometric (TouchID/FaceID/Windows Hello via platform authenticator). Auto-locks on `visibilitychange`. Full-screen numpad LockScreen, auto-triggers biometric on lock. Toggle in Settings → App Lock.
- [x] **Activity feed** — timeline of all changes: who added what, who settled, who was added to a group. `GET /api/activity` derives from existing tables (no migration), groups by Today/Yesterday/This Week/Earlier, accessible from Settings.
- [x] **Net balance graph per person** — line chart showing how your balance with a specific person has changed over time. `GET /splits/balance-history/:personId`, recharts LineChart (stepAfter), event list below; reachable via 📈 button on each OwedPersonCard.
- [x] **Desktop PWA keyboard shortcuts** — `N` new expense, `/` focus search, `G` groups, `B` balances, `A` analytics, `S` settings, `H` home, `?` help modal. Global `keydown` handler guards against input elements and modifier keys.
