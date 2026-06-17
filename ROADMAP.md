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

- [ ] **Offline support** — vite-plugin-pwa is wired in but API responses aren't cached. Add a Workbox strategy so the expense list is readable offline and queued writes sync on reconnect.
- [ ] **Import from CSV / bank statement** — parse a bank-exported CSV, let the user map columns, auto-categorise by merchant name. Complements existing export.
- [ ] **Share bill as image** — generate a summary card (styled div → canvas screenshot) shareable to WhatsApp. Useful after group trips.
- [ ] **Multi-currency on group trips** — `currency` field already exists on Expense. Add a conversion layer (free exchangerate API) so group balances settle in INR even if some expenses were in THB/USD.
- [ ] **Monthly email / PDF report** — scheduled summary via Nodemailer: total spent, top categories, budget status. Pairs with existing notification system.
- [ ] **Google Drive backup** — one-tap export of all data as a JSON/CSV zip to the user's Google Drive. Pairs with existing export feature.

### Polish & Power-user

- [ ] **Dark mode** — system-preference-aware (`prefers-color-scheme`), toggle in Settings.
- [ ] **Expense comments / notes thread** — add follow-up notes to an existing expense (e.g. "reimbursed by company on Jun 20").
- [ ] **Expense tags** — free-form tags on expenses for flexible cross-category filtering (e.g. "work", "travel", "reimbursable").
- [ ] **Installment / EMI tracker** — track loan repayments as a series with a running balance.
- [ ] **Savings goal** — set a monthly savings target; home screen shows how much of the goal is intact based on spending so far.
- [ ] **Biometric / PIN lock** — WebAuthn or a simple PIN stored in IndexedDB so the app locks when backgrounded.
- [ ] **Account deletion + full data export (GDPR)** — download everything as JSON, then wipe account. Good hygiene if the app ever goes beyond personal use.
- [ ] **Activity feed** — timeline of all changes: who added what, who settled, who was added to a group. Useful in shared households.
- [ ] **Net balance graph per person** — line chart showing how your balance with a specific person has changed over time.
- [ ] **Desktop PWA keyboard shortcuts** — `N` to add expense, `/` to focus search, `G` to go to groups etc.
