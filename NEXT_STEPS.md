# HisabKitab — Next Steps

**Last updated:** 2026-06-22  
**Status:** All 17/17 planned features complete (P0 → P3). See `GAP_TRACKER.md` for full history.

---

## Immediate (do these first)

- [ ] **Restart backend** and smoke-test features built today (templates, financial goals, net worth, offline queue)
- [ ] **Add `GEMINI_API_KEY`** to `Backend/.env` — get free key at aistudio.google.com → activates OCR receipt scanning
- [ ] **Test PDF export** — open `/settings/export`, generate a PDF for this month
- [ ] **Test offline queue** — disable network, add expense, re-enable, verify sync on HomePage

---

## Next directions (ranked by value)

### 1. Production Deployment
Deploy to a real domain so others can use it.
- Frontend → Vercel (free, auto-deploy from GitHub)
- Backend → Railway or Render (free tier, environment vars UI)
- Set `CLIENT_URL`, `DATABASE_URL`, Firebase creds, Cloudinary creds, `GEMINI_API_KEY`
- Custom domain (e.g. hisabkitab.in)

### 2. Bank Statement Import
Parse CSV/PDF exports from Indian banks to bulk-create expenses.
- HDFC, SBI, Axis, ICICI all export CSV — formats differ slightly
- Backend: extend existing `/expenses/import` with bank-specific column mappers
- Frontend: bank selector on ImportPage → correct field mapping
- Auto-categorise by merchant name (petrol → Fuel, Zomato → Food, etc.)

### 3. UPI Deep Links on Settlement
One-tap pay from the Balances / Shared Tab settle screen.
- Already done on BalancesPage — extend to SharedTabDetailPage settlements
- Generate `upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR&tn=HisabKitab` links
- Need UPI ID field on user profile

### 4. Live Exchange Rates (auto)
Currently rates refresh on demand.
- Wire in a free cron — call `POST /api/exchange-rates/refresh` daily at 9am via the existing `node-cron` setup
- Already have the endpoint and the frankfurter.app integration — just add the cron job

### 5. Push Notification Expansion
FCM is already wired for splits/budgets/cards/subscriptions.
- Budget 100% alert → already done; add 50% warning
- Loan EMI due in 3 days → add to creditCardReminder job pattern
- Financial goal milestone (25% / 50% / 100% reached) → trigger on `contribute` endpoint

### 6. Mobile App (Capacitor)
Wrap the PWA in Capacitor for true native feel + Play Store listing.
- `npm install @capacitor/core @capacitor/cli @capacitor/android`
- Gains: SMS read access on Android (bank SMS auto-import), native share sheet, home screen widget
- Cost: ~1 day setup + Google Play developer account ($25 one-time)

### 7. Performance Audit
- Route-level code splitting (`React.lazy`) — currently all routes bundled
- Image lazy loading on ExpenseCard receipt thumbnails
- TanStack Query `prefetchQuery` on navigation for instant page loads

---

## Deferred / won't do (for now)

| Item | Reason |
|------|--------|
| Bank SMS auto-import | iOS has no SMS API; Android requires native app |
| Google Drive backup | OAuth complexity, Capacitor easier path |
| Real-time collaboration | Requires WebSockets, major arch change |
