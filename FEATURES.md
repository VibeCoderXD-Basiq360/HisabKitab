# HisabKitab — Complete Feature Inventory

**58 screens · 150+ features · 36 backend modules · 6 automated jobs**

---

## App Navigation Structure

```
Bottom Nav (always visible)
├── Home          → /home
├── Stats         → /analytics
├── [FAB +]       → /expense/new   (centre button — add expense)
├── Balances      → /balances
└── More          → /more
         ├── Profile card (arrow) → /profile
         ├── Quick chips: Settings · Alerts · Business · App Lock
         ├── Finance:   Accounts · Income · Net Worth · Loans · Subscriptions
         ├── Planning:  Budgets · Financial Goals · Savings Goal · Recurring
         ├── Activity:  Search · Calendar · Activity Log · Cart
         ├── Social:    Groups · Shared Tabs · People
         ├── Customize: Categories · Payment Types · Templates · Card Delegations · Exchange Rates
         └── Data:      Export · Import
```

> **Settings page** (`More → Settings chip`) duplicates many items from More for quick access:
> Categories, Payment Types, Card Delegations, People, Recurring, Templates, Savings Goal, App Lock, Exchange Rates, Import.

---

## How to read each feature

- **Navigate** — tap path through the app UI
- **URL** — browser/PWA address bar route
- **Pages** — JSX files under `Web/src/pages/`
- **APIs** — backend routes (all prefixed `/api/`)

---

## 1. Expense Management

- Add / Edit / Delete / Duplicate expenses
- Receipt photo upload + OCR scan (Gemini AI extracts merchant, amount, date, category)
- Voice input for description · Expense tagging · Multi-currency
- Transfer expense between people · Mark as reimbursement
- Itemized expense · Comments · Attach to shared tabs

**Navigate**
| Action | Path |
|---|---|
| Add new expense | Bottom Nav **[+]** FAB |
| Edit existing expense | Home → tap any expense card |
| Transfer an expense | Open expense → Transfer button (bottom sheet) |

**URL:** `/expense/new` · `/expense/:id`

**Pages (2)**
| File | Purpose |
|---|---|
| `expense/AddEditExpensePage.jsx` | Create or edit any expense; hosts OCR, voice, splits, tags, itemized fields |
| `expense/TransferExpenseSheet.jsx` | Bottom sheet to transfer an expense to another person |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/expenses` | List expenses (paginated, filterable) |
| POST | `/api/expenses` | Create expense |
| GET | `/api/expenses/:id` | Fetch single expense |
| PUT | `/api/expenses/:id` | Edit expense |
| DELETE | `/api/expenses/:id` | Delete expense |
| POST | `/api/expenses/:id/transfer` | Transfer to another person |
| POST | `/api/expenses/:id/receipt` | Upload receipt image (Cloudinary) |
| GET | `/api/expenses/:id/comments` | List comments |
| POST | `/api/expenses/:id/comments` | Add comment |
| DELETE | `/api/expenses/:id/comments/:commentId` | Delete comment |
| GET | `/api/expenses/tags` | All tags used by the user |
| POST | `/api/ocr/scan` | Scan receipt with Gemini AI |

---

## 2. Recurring Expenses

- Daily / Weekly / Monthly / Yearly / Weekdays / Weekends / Custom days
- Set end date, toggle on/off, delete rules

**Navigate**
| Action | Path |
|---|---|
| Manage rules | More → Planning → **Recurring** |
| Also via | More → Settings chip → **Recurring** |

**URL:** `/settings/recurring`

**Pages (1)**
| File | Purpose |
|---|---|
| `settings/RecurringPage.jsx` | List, create, toggle, and delete recurring rules |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/recurring` | List all recurring rules |
| POST | `/api/recurring` | Create rule |
| PATCH | `/api/recurring/:id` | Edit / toggle rule |
| DELETE | `/api/recurring/:id` | Delete rule |

---

## 3. Analytics & Insights

- Month-wise expense view + navigation · Calendar view with daily totals
- Category-wise & payment method-wise breakdown
- 3-month trend + all-time analytics · Daily expense charts
- Smart insights (budget alerts, biggest expense, category spikes)

**Navigate**
| Action | Path |
|---|---|
| Main analytics | Bottom Nav → **Stats** |
| Drill into a category | Stats → tap any category bar |
| Drill into a payment method | Stats → tap any payment method row |
| Calendar view | More → Activity → **Calendar** |

**URL:** `/analytics` · `/analytics/category/:id` · `/analytics/payment/:id` · `/calendar`

**Pages (4)**
| File | Purpose |
|---|---|
| `analytics/AnalyticsPage.jsx` | Main analytics hub — monthly summary, trend chart, day chart |
| `analytics/CategoryExpensesPage.jsx` | Drill-down: expenses for a single category |
| `analytics/PaymentExpensesPage.jsx` | Drill-down: expenses for a single payment method |
| `calendar/CalendarPage.jsx` | Monthly calendar with per-day expense totals |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/expenses/analytics` | Monthly totals, category breakdown, payment breakdown |
| GET | `/api/expenses/analytics/trend` | 3-month or all-time trend data |
| GET | `/api/insights` | Smart insight cards (budget alerts, spikes, etc.) |

---

## 4. Budget Management

- Per-category monthly budgets · Progress visualization (green / yellow / red)
- Push alerts at 50%, 80%, 100% threshold · Auto-reset on 1st of month

**Navigate**
| Action | Path |
|---|---|
| View all budgets | More → Planning → **Budgets** |
| Set / edit one budget | Budgets page → tap any category |

**URL:** `/settings/budgets` · `/settings/budgets/:categoryId`

**Pages (2)**
| File | Purpose |
|---|---|
| `settings/BudgetsPage.jsx` | View all category budgets with progress bars |
| `settings/CategoryBudgetPage.jsx` | Set or edit budget for one category |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/budgets` | List all budgets with current spend |
| PUT | `/api/budgets/:categoryId` | Set / update budget for a category |
| DELETE | `/api/budgets/:id` | Remove a budget |

---

## 5. Financial Goals

- Multiple goals with target amount, deadline, emoji, color
- Contribution tracking, progress %, days remaining · Mark as completed

**Navigate**
| Action | Path |
|---|---|
| View / manage goals | More → Planning → **Financial Goals** |

**URL:** `/settings/goals`

**Pages (1)**
| File | Purpose |
|---|---|
| `settings/FinancialGoalsPage.jsx` | List, create, contribute to, and complete goals |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/financial-goals` | List all goals |
| POST | `/api/financial-goals` | Create goal |
| PUT | `/api/financial-goals/:id` | Edit goal |
| DELETE | `/api/financial-goals/:id` | Delete goal |
| PATCH | `/api/financial-goals/:id/contribute` | Add a contribution |

---

## 6. Savings Goals

- Monthly income + savings target · Max spending limit calculation
- On-track vs at-risk status

**Navigate**
| Action | Path |
|---|---|
| Set savings goal | More → Planning → **Savings Goal** |
| Also via | More → Settings chip → **Savings Goal** |

**URL:** `/settings/savings-goal`

**Pages (1)**
| File | Purpose |
|---|---|
| `settings/SavingsGoalPage.jsx` | Set monthly income + savings % target |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/savings-goal` | Fetch savings goal + current status |
| PUT | `/api/savings-goal` | Set / update savings goal |
| DELETE | `/api/savings-goal` | Remove savings goal |

---

## 7. Income Tracking

- CRUD income entries
- Categories: Salary, Freelance, Rental, Business, Investment, Gift, Refund, Other
- Link to accounts · Income – Expense – Net summary card

**Navigate**
| Action | Path |
|---|---|
| View / add income | More → Finance → **Income** |

**URL:** `/income`

**Pages (1)**
| File | Purpose |
|---|---|
| `income/IncomePage.jsx` | List income entries; add / edit / delete inline |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/income/summary` | Income vs expense vs net summary |
| GET | `/api/income` | List income entries |
| POST | `/api/income` | Create income entry |
| PUT | `/api/income/:id` | Edit income entry |
| DELETE | `/api/income/:id` | Delete income entry |

---

## 8. Accounts Management

- Multiple accounts (Savings, Current, Credit Card, Cash, Wallet, Metro Card, Other)
- Opening balance, transaction history (ledger) · Inter-account transfers
- Custom icon + color per account

**Navigate**
| Action | Path |
|---|---|
| View all accounts | More → Finance → **Accounts** |
| Account ledger | Accounts → tap any account card |

**URL:** `/accounts` · `/accounts/:id`

**Pages (2)**
| File | Purpose |
|---|---|
| `accounts/AccountsPage.jsx` | List all accounts with balances |
| `accounts/AccountDetailPage.jsx` | Ledger / transaction history for one account |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/accounts` | List accounts with balances |
| POST | `/api/accounts` | Create account |
| PUT | `/api/accounts/:id` | Edit account |
| DELETE | `/api/accounts/:id` | Delete account |
| POST | `/api/accounts/transfer` | Transfer money between accounts |
| POST | `/api/accounts/:id/pay-bill` | Pay credit card bill from another account |
| GET | `/api/accounts/:id/ledger` | Full transaction history for account |

---

## 9. People & Contacts

- Add people with email · Send / accept / reject contact requests
- Edit / delete contacts

**Navigate**
| Action | Path |
|---|---|
| Manage contacts | More → Social → **People** |
| Also via | More → Settings chip → **People** |

**URL:** `/settings/people`

**Pages (1)**
| File | Purpose |
|---|---|
| `settings/PeoplePage.jsx` | Manage contacts — add, search, accept/reject requests |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/people` | List saved contacts |
| POST | `/api/people` | Add person manually |
| PUT | `/api/people/:id` | Edit person |
| DELETE | `/api/people/:id` | Delete person |
| GET | `/api/contacts/requests` | Pending contact requests (sent + received) |
| POST | `/api/contacts/request` | Send contact request by email |
| POST | `/api/contacts/requests/:id/accept` | Accept incoming request |
| POST | `/api/contacts/requests/:id/reject` | Decline incoming request |

---

## 10. Splits & Balances

- Split expenses among multiple people · Accept / reject split requests
- Mark received, waive off (forgive debt) · Request payment from debtors
- Bulk payment settlement requests · Balance history per person

**Navigate**
| Action | Path |
|---|---|
| Net balances per person | Bottom Nav → **Balances** |
| Shared expenses with one person | Balances → tap a person |
| Settlement history | Balances → tap person → History tab |

**URL:** `/balances` · `/balances/person/:personId` · `/balances/history/:personId`

**Pages (3)**
| File | Purpose |
|---|---|
| `balances/BalancesPage.jsx` | Net balance per person — who owes whom |
| `balances/PersonExpensesPage.jsx` | All split expenses shared with one person |
| `balances/BalanceHistoryPage.jsx` | History of settlements with one person |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/splits/balances` | Net balance summary per person |
| GET | `/api/splits/paid-for` | Expenses user paid for others |
| GET | `/api/splits/paid-for/:personId` | Expenses paid for a specific person |
| GET | `/api/splits/balance-history/:personId` | Settlement history with one person |
| POST | `/api/splits/:splitId/pay` | Pay / settle a split |
| POST | `/api/splits/:splitId/accept` | Accept an incoming split request |
| POST | `/api/splits/:splitId/reject` | Reject an incoming split request |
| POST | `/api/splits/:splitId/waive` | Waive / forgive a split debt |
| POST | `/api/splits/:splitId/mark-received` | Mark that you received payment |
| POST | `/api/splits/settle-all/:personId` | Settle all outstanding splits with a person |
| GET | `/api/bulk-payments` | List bulk settlement requests |
| POST | `/api/bulk-payments` | Create bulk settlement request |
| PATCH | `/api/bulk-payments/:id/respond` | Accept or reject bulk request |
| PATCH | `/api/bulk-payments/:id/cancel` | Cancel a bulk request |

---

## 11. Groups

- Create groups (Trip, Home, Work, Couple, Other)
- Invite members, manage balances · Group expense tracking, net balance

**Navigate**
| Action | Path |
|---|---|
| View all groups | More → Social → **Groups** |
| Group detail | Groups → tap a group |
| Create group | Groups → **+** button |

**URL:** `/groups` · `/groups/:id` · `/groups/new`

**Pages (3)**
| File | Purpose |
|---|---|
| `groups/GroupsPage.jsx` | List all groups |
| `groups/GroupDetailPage.jsx` | Group expenses, member balances, settlement |
| `groups/CreateGroupPage.jsx` | Create a new group + invite members |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/groups` | List all groups |
| POST | `/api/groups` | Create group |
| GET | `/api/groups/search-users` | Search users to invite |
| GET | `/api/groups/:id` | Group detail — members + balances |
| POST | `/api/groups/:id/expenses` | Add expense to group |
| DELETE | `/api/groups/:id/expenses/:eid` | Remove expense from group |
| POST | `/api/groups/:id/settlements` | Record a settlement within group |

---

## 12. Shared Tabs (Split Bills)

- Create tabs + tab groups · Invite, accept / decline
- Per-person balance, settlements · Tab group detail view

**Navigate**
| Action | Path |
|---|---|
| View all tabs | More → Social → **Shared Tabs** |
| Tab detail | Shared Tabs → tap a tab |
| Tab group detail | Tap a tab group card |

**URL:** `/tabs` · `/tabs/:id` · `/tab-groups/:id`

**Pages (3)**
| File | Purpose |
|---|---|
| `tabs/SharedTabsPage.jsx` | List all shared tabs |
| `tabs/SharedTabDetailPage.jsx` | Tab detail — entries, balances, settlements |
| `tabs/TabGroupDetailPage.jsx` | Tab group with monthly sub-tabs |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/shared-tabs` | List all shared tabs |
| POST | `/api/shared-tabs` | Create tab |
| GET | `/api/shared-tabs/:id` | Tab detail + balances |
| POST | `/api/shared-tabs/:id/accept` | Accept tab invite |
| POST | `/api/shared-tabs/:id/decline` | Decline tab invite |
| DELETE | `/api/shared-tabs/:id` | Delete tab |
| POST | `/api/shared-tabs/:id/entries` | Add entry to tab |
| PATCH | `/api/shared-tabs/:id/entries/:entryId` | Edit entry |
| DELETE | `/api/shared-tabs/:id/entries/:entryId` | Delete entry |
| POST | `/api/shared-tabs/:id/settlements` | Record settlement |
| DELETE | `/api/shared-tabs/:id/settlements/:settlementId` | Undo settlement |
| GET | `/api/tab-groups` | List tab groups |
| POST | `/api/tab-groups` | Create tab group |
| GET | `/api/tab-groups/:id` | Tab group detail |
| POST | `/api/tab-groups/:id/accept` | Accept tab group invite |
| POST | `/api/tab-groups/:id/decline` | Decline tab group invite |
| POST | `/api/tab-groups/:id/new-month` | Open a new monthly tab in group |
| DELETE | `/api/tab-groups/:id` | Delete tab group |

---

## 13. Loans

- Create loan records (amount, lender, borrower, interest)
- EMI tracking — mark paid, unmark · EMI reminders (3 days, 1 day, due day)
- Loan included in net worth calculation

**Navigate**
| Action | Path |
|---|---|
| View all loans | More → Finance → **Loans** |
| Loan EMI detail | Loans → tap a loan |
| Create loan | Loans → **+** button |

**URL:** `/loans` · `/loans/:id` · `/loans/new`

**Pages (3)**
| File | Purpose |
|---|---|
| `loans/LoansPage.jsx` | List all loans (given + taken) |
| `loans/CreateLoanPage.jsx` | Create a new loan record |
| `loans/LoanDetailPage.jsx` | EMI schedule — mark paid per month |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/loans` | List all loans |
| POST | `/api/loans` | Create loan |
| GET | `/api/loans/:id` | Loan detail with EMI schedule |
| PATCH | `/api/loans/:id` | Edit loan details |
| DELETE | `/api/loans/:id` | Delete loan |
| POST | `/api/loans/:id/payments/:month` | Mark EMI for a month as paid |
| DELETE | `/api/loans/:id/payments/:month` | Unmark EMI payment |

---

## 14. Subscriptions

- Billing cycles: Monthly / Quarterly / Half-yearly / Yearly
- Due date countdown (Overdue, Today, Tomorrow, N days)
- Auto-pay flag, logo, color-coded status · Due-in-3-days push reminders

**Navigate**
| Action | Path |
|---|---|
| View subscriptions | More → Finance → **Subscriptions** |

**URL:** `/subscriptions`

**Pages (1)**
| File | Purpose |
|---|---|
| `subscriptions/SubscriptionsPage.jsx` | List, add, edit, renew, and delete subscriptions |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/subscriptions` | List all subscriptions |
| POST | `/api/subscriptions` | Create subscription |
| PUT | `/api/subscriptions/:id` | Edit subscription |
| POST | `/api/subscriptions/:id/renew` | Mark as renewed (advance next due date) |
| DELETE | `/api/subscriptions/:id` | Delete subscription |

---

## 15. Net Worth

- Add assets (Cash, Bank, Investment, Property, Vehicle, Receivables, Other)
- Tracks liabilities (loans + split balances) · Total net worth = assets − liabilities

**Navigate**
| Action | Path |
|---|---|
| View net worth | More → Finance → **Net Worth** |

**URL:** `/net-worth`

**Pages (1)**
| File | Purpose |
|---|---|
| `netWorth/NetWorthPage.jsx` | Net worth summary + asset CRUD |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/net-worth` | Computed net worth (assets − liabilities) |
| GET | `/api/assets` | List all assets |
| POST | `/api/assets` | Add asset |
| PUT | `/api/assets/:id` | Edit asset |
| DELETE | `/api/assets/:id` | Delete asset |

---

## 16. Card Delegations (Shared Cards)

- Delegate card usage to someone · Approve / reject / revoke delegations
- Track delegated expenses + outstanding balance
- Repayment requests (select specific expenses)
- Identity verification (action token) for approvals

**Navigate**
| Action | Path |
|---|---|
| Manage delegations | More → Customize → **Card Delegations** |
| Also via | More → Settings chip → **Card Delegations** |

**URL:** `/settings/card-delegations`

**Pages (1)**
| File | Purpose |
|---|---|
| `settings/CardDelegationsPage.jsx` | Full delegation management — create, approve, repay |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/card-delegations` | List delegations (given + received) |
| POST | `/api/card-delegations` | Create delegation |
| GET | `/api/card-delegations/balance` | Outstanding balance on delegation |
| POST | `/api/card-delegations/:id/approve` | Approve delegation request |
| POST | `/api/card-delegations/:id/reject` | Reject delegation request |
| POST | `/api/card-delegations/:id/revoke` | Revoke an active delegation |
| GET | `/api/card-delegations/:id/expenses` | Expenses made under delegation |
| POST | `/api/card-delegations/:id/repayments` | Create repayment request |
| POST | `/api/card-delegations/:id/repayments/:repaymentId/approve` | Approve repayment |
| POST | `/api/card-delegations/:id/repayments/:repaymentId/reject` | Reject repayment |
| PATCH | `/api/card-delegations/expenses/:expenseId/toggle-repay` | Toggle expense into repayment |
| PATCH | `/api/card-delegations/:id/link-owner-card` | Link an account as the delegated card |
| GET | `/api/card-delegations/:id/combined-bill` | Combined bill view for owner |

---

## 17. Business Module

| Sub-feature | Details |
|---|---|
| Business setup | Name, tagline, multi-location |
| Partner management | Invite, accept/decline, equity & profit share |
| Jobs (3D Print) | Quoted → In Progress → Printed → Delivered → Cancelled |
| Job costing | Material + electricity + depreciation + labour + packaging + add-ons + failure markup |
| Customers | CRM — contact info, job history, revenue |
| Inventory | Items, stock per location, low-stock alerts, transfers, transaction history |
| Business expenses | Linked to locations + accounts |
| P&L report | Revenue, expenses, partner withdrawals, net profit |

**Navigate**
| Action | Path |
|---|---|
| Business dashboard | More → Quick chip → **Business** |
| Jobs list | Business → Jobs |
| New job | Business → Jobs → **+** |
| Job detail | Jobs → tap a job |
| Customers | Business → Customers |
| Inventory | Business → Inventory |
| P&L report | Business → P&L |
| Business expenses | Business → Expenses |
| Business settings | Business → Settings (⚙️) |

**URL:** `/business` · `/business/jobs` · `/business/jobs/new` · `/business/jobs/:id` · `/business/inventory` · `/business/customers` · `/business/pl` · `/business/expenses` · `/business/settings`

**Pages (9)**
| File | Purpose |
|---|---|
| `business/BusinessDashboard.jsx` | Business home — revenue, job stats, quick actions |
| `business/BusinessSettingsPage.jsx` | Business profile, locations, partners |
| `business/JobsPage.jsx` | List all jobs with status filters |
| `business/NewJobPage.jsx` | Create a new job with full cost breakdown |
| `business/JobDetailPage.jsx` | Job detail — update status, view costs |
| `business/CustomersPage.jsx` | CRM — list, view, create customers |
| `business/InventoryPage.jsx` | Item stock, add/adjust/transfer stock |
| `business/BusinessExpensePage.jsx` | Business expense list + withdrawals |
| `business/PLPage.jsx` | Profit & Loss report with filters |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/business` | Fetch business profile |
| POST | `/api/business` | Create business |
| PUT | `/api/business/settings` | Update business settings |
| POST | `/api/business/locations` | Add location |
| GET | `/api/business/partners/invites` | List partner invites |
| POST | `/api/business/partners/invite` | Send partner invite |
| POST | `/api/business/partners/:id/accept` | Accept partner invite |
| POST | `/api/business/partners/:id/decline` | Decline partner invite |
| PUT | `/api/business/partners/:partnerId` | Update partner equity / share |
| GET | `/api/business-jobs` | List all jobs |
| GET | `/api/business-jobs/:id` | Job detail |
| POST | `/api/business-jobs` | Create job |
| PATCH | `/api/business-jobs/:id` | Update job (status, costs) |
| GET | `/api/business-customers` | List customers |
| POST | `/api/business-customers` | Create customer |
| PUT | `/api/business-customers/:id` | Edit customer |
| GET | `/api/business-customers/:id` | Customer detail + job history |
| GET | `/api/inventory/items` | List inventory items |
| POST | `/api/inventory/items` | Create item |
| PUT | `/api/inventory/items/:id` | Edit item |
| POST | `/api/inventory/stock/add` | Add stock |
| POST | `/api/inventory/stock/adjust` | Adjust stock |
| POST | `/api/inventory/stock/transfer` | Transfer stock between locations |
| GET | `/api/inventory/transactions` | Stock transaction history |
| GET | `/api/business-expenses/feed` | Combined expense + withdrawal feed |
| GET | `/api/business-expenses` | Business expenses |
| POST | `/api/business-expenses` | Create business expense |
| DELETE | `/api/business-expenses/:id` | Delete business expense |
| GET | `/api/business-expenses/withdrawals` | Partner withdrawals |
| POST | `/api/business-expenses/withdrawals` | Record withdrawal |
| GET | `/api/business-pl` | P&L report |

---

## 18. Cart / Shopping

- Add items with amounts
- Checkout → creates expense (with category, payment method, account)
- Cart badge on home screen

**Navigate**
| Action | Path |
|---|---|
| Open cart | More → Activity → **Cart** |
| Also via | Home → cart badge (top-right) |

**URL:** `/cart`

**Pages (1)**
| File | Purpose |
|---|---|
| `cart/CartPage.jsx` | Cart list — add, edit, remove items; checkout |

**APIs** *(checkout calls standard expense creation)*
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/expenses` | Checkout creates a regular expense |

---

## 19. Payment Methods

- Cash, UPI, Debit Card, Credit Card, Wallet
- Credit card: last 4 digits, expiry, billing cycle day, due day
- Configurable due-date reminders (1–10 days) · Link account to payment method

**Navigate**
| Action | Path |
|---|---|
| Manage payment methods | More → Customize → **Payment Types** |
| Also via | More → Settings chip → **Payment Types** |

**URL:** `/settings/payment-types`

**Pages (1)**
| File | Purpose |
|---|---|
| `settings/PaymentTypesPage.jsx` | List, create, edit, delete payment methods |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/payment-types` | List payment methods |
| POST | `/api/payment-types` | Create payment method |
| PUT | `/api/payment-types/:id` | Edit payment method |
| DELETE | `/api/payment-types/:id` | Delete payment method |

---

## 20. Import / Export

- CSV import with auto field detection + manual mapping + preview
- Export to CSV (This Month / Last Month / 3 Months / All Time)

**Navigate**
| Action | Path |
|---|---|
| Export expenses | More → Data → **Export** |
| Import expenses | More → Data → **Import** |
| Also via Settings | More → Settings chip → **Import** |

**URL:** `/settings/export` · `/settings/import`

**Pages (2)**
| File | Purpose |
|---|---|
| `settings/ImportPage.jsx` | Upload CSV, map columns, preview, import |
| `settings/ExportPage.jsx` | Choose date range → download CSV |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/expenses/import` | Import expenses from CSV |
| GET | `/api/expenses/export` | Export expenses as CSV |

---

## 21. Exchange Rates

- Live rates from Frankfurter API (10+ currencies)
- Manual override, auto-refresh daily

**Navigate**
| Action | Path |
|---|---|
| View / override rates | More → Customize → **Exchange Rates** |
| Also via Settings | More → Settings chip → **Exchange Rates** |

**URL:** `/settings/exchange-rates`

**Pages (1)**
| File | Purpose |
|---|---|
| `settings/ExchangeRatesPage.jsx` | View and override exchange rates |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/exchange-rates` | List current rates |
| POST | `/api/exchange-rates/refresh` | Force-refresh from Frankfurter |
| PUT | `/api/exchange-rates/:from` | Manual override for a currency |

---

## 22. Quick-Add Templates

- Save expense as template (title, amount, category, emoji)
- One-tap add from template

**Navigate**
| Action | Path |
|---|---|
| Use templates (quick-add) | Home → ⚡ quick-add icon → `/quick-add` |
| Manage templates | More → Customize → **Templates** |
| Also via Settings | More → Settings chip → **Templates** |

**URL:** `/quick-add` · `/settings/templates`

**Pages (2)**
| File | Purpose |
|---|---|
| `quickAdd/QuickAddPage.jsx` | Home for quick-add — tap a template to create expense instantly |
| `settings/TemplatesPage.jsx` | Manage templates — create, edit, delete |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/templates` | List templates |
| POST | `/api/templates` | Create template |
| PUT | `/api/templates/:id` | Edit template |
| DELETE | `/api/templates/:id` | Delete template |
| POST | `/api/templates/:id/use` | Create expense from template |

---

## 23. App Lock

- 4-digit PIN setup · Biometric (fingerprint / face) via WebAuthn
- Lock on background or startup

**Navigate**
| Action | Path |
|---|---|
| Enable / manage | More → Quick chip → **App Lock** |
| Also via Settings | More → Settings chip → **App Lock** |

**URL:** `/settings/app-lock`

**Pages (1)**
| File | Purpose |
|---|---|
| `settings/AppLockPage.jsx` | Enable / disable PIN + WebAuthn credential management |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/auth/webauthn/register-options` | Start WebAuthn registration |
| POST | `/api/auth/webauthn/register-verify` | Complete registration |
| GET | `/api/auth/webauthn/authenticate-options` | Start WebAuthn auth challenge |
| POST | `/api/auth/webauthn/authenticate-verify` | Verify biometric auth |
| POST | `/api/auth/webauthn/firebase-action-token` | Generate action token for identity verify |
| GET | `/api/auth/webauthn/credentials` | List registered credentials |
| DELETE | `/api/auth/webauthn/credentials/:id` | Remove a credential |
| POST | `/api/auth/pin-reset/request` | Request PIN reset |
| POST | `/api/auth/pin-reset/verify` | Verify PIN reset token |

---

## 24. Notifications

- In-app + push (Web Push + FCM)
- Types: splits, payments, groups, business invites, budget alerts, loan EMI, subscription due, credit card due
- Mark read / mark all read / delete

**Navigate**
| Action | Path |
|---|---|
| Open notifications | More → Quick chip → **Alerts** |
| Also via | Home → 🔔 bell icon (top-right) |

**URL:** `/notifications`

**Pages (1)**
| File | Purpose |
|---|---|
| `notifications/NotificationsPage.jsx` | Notification inbox with read/delete actions |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/notifications` | List notifications (unread first) |
| PATCH | `/api/notifications/read-all` | Mark all as read |
| PATCH | `/api/notifications/:id/read` | Mark one as read |
| DELETE | `/api/notifications/:id` | Delete notification |
| POST | `/api/user/fcm-token` | Register push token with backend |

---

## 25. Search

- Global search across expenses, people, groups, tabs, loans

**Navigate**
| Action | Path |
|---|---|
| Open search | More → Activity → **Search** |
| Also via | Home → 🔍 search icon (top-right) |

**URL:** `/search`

**Pages (1)**
| File | Purpose |
|---|---|
| `search/SearchPage.jsx` | Search bar + categorised results |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/search` | Full-text search across entities |

---

## 26. Activity Log

- Full audit trail of user actions grouped by date

**Navigate**
| Action | Path |
|---|---|
| View activity | More → Activity → **Activity Log** |

**URL:** `/activity`

**Pages (1)**
| File | Purpose |
|---|---|
| `activity/ActivityPage.jsx` | Chronological list of all user actions |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/activity` | Paginated activity log |

---

## 27. Calendar View

- Monthly calendar with daily expense overlays · Tap day to see that day's expenses

**Navigate**
| Action | Path |
|---|---|
| Open calendar | More → Activity → **Calendar** |

**URL:** `/calendar`

**Pages (1)** *(shared with Analytics #3)*
| File | Purpose |
|---|---|
| `calendar/CalendarPage.jsx` | Calendar grid with per-day spend; tap day to drill into expenses |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/expenses/analytics` | Daily totals for calendar overlay |

---

## 28. Offline Support

- Expense queue when offline · Sync on reconnect, retry failed, discard failed
- Offline banner + pending count

**Navigate** — no dedicated screen; the offline banner appears automatically at the top of any page when the device loses connectivity.

**Pages** — none (background service worker + in-memory queue)

**APIs** — uses existing `/api/expenses` POST on reconnect; no dedicated endpoint

---

## 29. Automated Background Jobs

| Job | Schedule | Trigger |
|---|---|---|
| Monthly spending email report | 1st of month, 9 AM | Nodemailer |
| Budget threshold alerts | Daily 9 AM | Web Push |
| Credit card due reminders | Daily 9 AM | Web Push |
| Subscription due reminders | Daily 9 AM | Web Push |
| Loan EMI reminders | Daily 9 AM | Web Push |
| Exchange rate refresh | Daily 9 AM | Frankfurter API |

**Navigate** — no UI; jobs run server-side. Results surface as push notifications (→ `/notifications`) or updated data on next page load.

**APIs** — no external endpoints; jobs run internally and call notify helpers

---

## 30. Auth & Profile

- Firebase Google login, Email/Password, Forgot password
- WebAuthn (biometric / passkey) login · Profile photo upload + crop
- UPI ID management · Account deletion (two-step confirmation)

**Navigate**
| Action | Path |
|---|---|
| Login | App launch (not logged in) → `/login` |
| Sign up | Login page → **Create account** → `/signup` |
| Forgot password | Login page → **Forgot password** → `/forgot-password` |
| Edit profile | More → profile card arrow **→** `/profile` |
| Settings (account delete, dark mode, language) | More → Quick chip → **Settings** → `/settings` |

**URL:** `/login` · `/signup` · `/forgot-password` · `/profile` · `/settings`

**Pages (5)**
| File | Purpose |
|---|---|
| `auth/LoginPage.jsx` | Email/password + Google login + WebAuthn |
| `auth/SignupPage.jsx` | New account registration |
| `auth/ForgotPasswordPage.jsx` | Send password reset email |
| `profile/ProfilePage.jsx` | Edit name, photo, UPI ID, currency |
| `settings/SettingsPage.jsx` | App settings hub — dark mode, language, sub-settings, account delete |

**APIs**
| Method | Route | Purpose |
|---|---|---|
| POST | `/api/auth/login` | Verify Firebase token, return session |
| GET | `/api/user/me` | Fetch own profile |
| PUT | `/api/user/me` | Update profile (name, UPI, currency) |
| POST | `/api/user/profile-image` | Upload + crop profile photo (Cloudinary) |
| DELETE | `/api/user/me` | Delete account (all data) |

---

## General Navigation Pages

These pages act as hubs and don't belong to a single feature.

| File | URL | How to reach | Purpose |
|---|---|---|---|
| `home/HomePage.jsx` | `/home` | Bottom Nav → **Home** | Dashboard — recent expenses, quick-add, balance summary, insight cards |
| `more/MorePage.jsx` | `/more` | Bottom Nav → **More** | Secondary nav — all features not in the main bottom nav |
| `settings/CategoriesPage.jsx` | `/settings/categories` | More → Customize → **Categories** | Manage expense categories (create, reorder, delete) |

**APIs used on HomePage**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/expenses` | Recent expense list |
| GET | `/api/splits/balances` | Balance summary widget |
| GET | `/api/insights` | Insight cards |
| GET | `/api/budgets` | Budget progress widgets |

**APIs used on CategoriesPage**
| Method | Route | Purpose |
|---|---|---|
| GET | `/api/categories` | List all user categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Rename / reorder category |
| DELETE | `/api/categories/:id` | Delete category |

---

## Summary

| Metric | Count |
|---|---|
| Total screens | 58 |
| Major feature groups | 30 |
| Individual capabilities | 150+ |
| Backend modules | 36 |
| API endpoints | ~120 |
| Database tables | 30+ |
| Automated jobs | 6 |
| External integrations | 6 (Firebase, Gemini, Cloudinary, Frankfurter, Web Push, Nodemailer) |
