# HisabKitab

A mobile-first Progressive Web App for personal finance — expense tracking, splits & settlements, budgeting, loans, subscriptions, net worth, and business management.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white&style=flat-square)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white&style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white&style=flat-square)
![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase&logoColor=black&style=flat-square)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white&style=flat-square)

---

## Features

### Core
- **Expense Tracking** — add/edit/delete expenses with categories, payment types, accounts, tags, notes, and receipt photos
- **OCR Receipt Scanning** — scan a receipt with Gemini 1.5 Flash to auto-fill amount, merchant, date, and category
- **Voice Input** — dictate expense title via Web Speech API
- **Multi-currency** — log expenses in any currency; live exchange rates via Frankfurter API

### Splits & Social
- **Direct Splits** — split any expense with people; track PENDING → CONFIRMED status per person
- **Bulk Payments** — settle multiple debts with one payment request
- **Groups** — shared expense groups for trips, homes, couples (TRIP/HOME/WORK/COUPLE)
- **Shared Tabs** — ongoing monthly bill-sharing tabs between two users
- **Card Delegations** — let someone use your card; track repayments with WebAuthn-verified approvals
- **People & Contacts** — link contacts to their HisabKitab accounts for seamless splitting

### Planning & Finance
- **Budgets** — per-category monthly spend limits with 50/80/100% alert notifications
- **Savings Goal** — set monthly income and savings target; track whether you're on track
- **Financial Goals** — track progress toward saving targets (car, vacation, emergency fund)
- **Recurring Expenses** — auto-create expenses on daily/weekly/monthly/custom schedules
- **Quick Templates** — save expense presets for one-tap logging
- **Income Tracking** — log income by source (salary, freelance, rental, investment, etc.)
- **Accounts** — track bank accounts, wallets, credit cards; view per-account ledger
- **Loans** — track EMI loans with amortization; get due-date reminders
- **Subscriptions** — track recurring subscriptions with billing cycle reminders
- **Net Worth** — assets minus loan liabilities; real-time snapshot

### Business Module
- **Business Dashboard** — multi-partner business management
- **Jobs** — quote → in-progress → delivered pipeline with cost calculation
- **Customers** — CRM for business contacts linked to jobs
- **Inventory** — multi-location stock tracking with purchase/usage/wastage transactions
- **P&L** — profit & loss breakdown from jobs, expenses, and partner withdrawals

### UX & Security
- **App Lock** — PIN or biometric (WebAuthn/fingerprint) lock screen
- **Dark Mode** — system-synced or manual toggle
- **Offline Support** — queued expense creation when offline; syncs on reconnect
- **Push Notifications** — budget alerts, credit card due dates, split confirmations, loan EMIs
- **Import / Export** — bulk import via CSV; export expense history
- **Search** — full-text search across expenses, people, groups, tabs, loans
- **Calendar View** — browse expenses by date on a monthly calendar
- **Activity Log** — audit trail of all financial actions
- **i18n** — multi-language support via i18next

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| Server State | TanStack Query (React Query) v5 |
| Client State | Zustand 5 (6 stores) |
| Styling | Inline styles + Tailwind CSS (utility classes) |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL (Supabase) via Prisma 5 |
| Auth | Firebase Auth (Google GIS + Email/Password) + WebAuthn |
| Push Notifications | Native Web Push API (web-push package) |
| File Storage | Cloudinary (receipt images, profile photos) |
| OCR | Google Gemini 1.5 Flash |
| Exchange Rates | Frankfurter API (free, no key) |
| Email | Nodemailer (monthly reports, password reset) |
| Background Jobs | node-cron (6 daily/monthly jobs) |
| i18n | i18next |
| PWA | vite-plugin-pwa + service worker |

---

## Project Structure

```
HisabKitab/
├── Web/                          # React + Vite frontend (58 screens)
│   └── src/
│       ├── pages/                # All page components (home, expense, analytics,
│       │                         #   balances, accounts, budgets, loans, groups,
│       │                         #   tabs, business, settings, auth, …)
│       ├── components/           # Shared UI (TopBar, BottomNav, ExpenseCard, …)
│       │   └── ui/               # Primitives (Button, Input, Toggle, MenuRow, …)
│       ├── hooks/                # 34 React Query hooks (one per API domain)
│       ├── store/                # 6 Zustand stores (auth, cart, theme, lang, lock, sidebar)
│       └── lib/                  # Axios client, Firebase config, i18n setup
│
└── Backend/                      # Express API server (36 modules, ~120 endpoints)
    ├── prisma/
    │   └── schema.prisma         # 34-table PostgreSQL schema
    └── src/
        ├── modules/              # expense, category, paymentType, person, splits,
        │                         #   bulkPayment, recurring, budget, group, sharedTab,
        │                         #   tabGroup, contact, loan, subscription, income,
        │                         #   account, asset, netWorth, financialGoal, savingsGoal,
        │                         #   exchangeRate, cardDelegation, notification, activity,
        │                         #   search, template, ocr, insights, user, auth,
        │                         #   business, businessJob, businessCustomer,
        │                         #   businessExpense, businessPL, inventory
        ├── jobs/                 # 6 cron jobs (monthlyReport, budgetAlert,
        │                         #   creditCardReminder, subscriptionReminder,
        │                         #   loanReminder, exchangeRateRefresh)
        ├── middleware/           # JWT auth, Multer upload, rate limiting
        ├── config/               # Firebase Admin, Cloudinary
        └── lib/                  # Prisma singleton, notify helper, Web Push
```

---

## Local Development

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase free tier works)
- Firebase project (Auth enabled, Google provider + Email/Password)
- Cloudinary account
- Google Gemini API key (for OCR)

### 1. Clone & install

```bash
git clone https://github.com/VibeCoderXD-Basiq360/HisabKitab.git
cd HisabKitab

cd Backend && npm install
cd ../Web && npm install
```

### 2. Environment variables

**Backend** — create `Backend/.env`:

```env
DATABASE_URL=postgresql://...?connection_limit=5&pool_timeout=20
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Firebase Admin SDK — stringify the full service account JSON
FIREBASE_SERVICE_ACCOUNT='{...}'

# Gemini AI (OCR receipt scanning)
GEMINI_API_KEY=...

# Web Push (generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com

# Email (monthly reports)
EMAIL_USER=...
EMAIL_PASS=...
```

**Frontend** — create `Web/.env.local`:

```env
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_VAPID_PUBLIC_KEY=...
```

### 3. Database setup

```bash
cd Backend
npx prisma migrate deploy
# or for dev:
npx prisma db push
```

> **Windows:** stop the backend before running `prisma generate` or `db push` to avoid EPERM errors from the DLL lock.

### 4. Run

```bash
# Terminal 1 — backend (port 3000)
cd Backend && node src/index.js

# Terminal 2 — frontend (port 5173)
cd Web && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Split & Settle Flow

```
Payer adds expense → tags people → ExpenseSplit rows created (PENDING)
        │
Person marks as paid → PAYMENT_REQUESTED (push notification to payer)
        │
Payer confirms → CONFIRMED (push notification sent)
Payer rejects  → back to PENDING (push notification sent)

Multiple splits can be bundled into a BulkPayment for one-tap settlement.
```

---

## Background Jobs

| Job | Schedule | What it does |
|---|---|---|
| `monthlyReport` | 1st of month, 9 AM | Emails monthly expense summary to all users |
| `budgetAlert` | Daily, 9 AM | Fires push at 50%, 80%, 100% of category budget |
| `creditCardReminder` | Daily, 9 AM | Notifies before credit card payment due date |
| `subscriptionReminder` | Daily, 9 AM | Notifies 3 days before subscription renewal |
| `loanReminder` | Daily, 9 AM | Notifies 3 days, 1 day, and on EMI due date |
| `exchangeRateRefresh` | Daily, 9 AM | Updates exchange rates from Frankfurter API |

---

## API Overview

All endpoints require `Authorization: Bearer <JWT>` except `/api/auth/*`.

| Module | Base Path | Key Endpoints |
|---|---|---|
| Auth | `/api/auth` | POST /register, /login |
| User | `/api/user` | GET/PATCH /me, POST /profile-image, POST /fcm-token |
| Expenses | `/api/expenses` | Full CRUD + analytics, comments, items, tags |
| Categories | `/api/categories` | Full CRUD |
| Payment Types | `/api/payment-types` | Full CRUD |
| People | `/api/people` | Full CRUD |
| Splits | `/api/splits` | List, create, mark-paid, confirm, reject, waive |
| Bulk Payments | `/api/bulk-payments` | Create, confirm, reject |
| Recurring | `/api/recurring` | Full CRUD + process-due |
| Budgets | `/api/budgets` | List, create/update, delete |
| Groups | `/api/groups` | Full CRUD + members, expenses, settlements |
| Shared Tabs | `/api/shared-tabs` | Full CRUD + entries, settlements |
| Tab Groups | `/api/tab-groups` | Full CRUD |
| Contacts | `/api/contacts` | Send/accept/decline/list requests |
| Loans | `/api/loans` | Full CRUD + payments |
| Subscriptions | `/api/subscriptions` | Full CRUD |
| Income | `/api/income` | Full CRUD |
| Accounts | `/api/accounts` | Full CRUD + ledger, transfers, credit card payments |
| Assets | `/api/assets` | Full CRUD |
| Net Worth | `/api/net-worth` | GET (computed snapshot) |
| Financial Goals | `/api/financial-goals` | Full CRUD |
| Savings Goal | `/api/savings-goal` | GET/PUT |
| Exchange Rates | `/api/exchange-rates` | List, convert, refresh |
| Card Delegations | `/api/card-delegations` | Full CRUD + repayments, WebAuthn verify |
| Notifications | `/api/notifications` | List, mark-read, delete |
| Search | `/api/search` | GET (cross-entity full-text) |
| Templates | `/api/templates` | Full CRUD + use |
| OCR | `/api/ocr` | POST /scan (Gemini receipt parsing) |
| Insights | `/api/insights` | GET (home + analytics widgets) |
| Activity | `/api/activity` | GET (audit log) |
| Business | `/api/business` | Full CRUD + partners, locations, settings |
| Business Jobs | `/api/business-jobs` | Full CRUD + items |
| Business Customers | `/api/business-customers` | Full CRUD |
| Business Expenses | `/api/business-expenses` | Full CRUD + partner withdrawals |
| Business P&L | `/api/business-pl` | GET (computed) |
| Inventory | `/api/inventory` | Full CRUD + stock, transactions, transfers |
| WebAuthn | `/api/auth/webauthn` | Register, verify, list, delete credentials |

---

## License

MIT
