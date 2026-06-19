# Project Memory

> Maintained by Claude. Update as decisions are made and code lands.

## Tech Stack
- **Runtime:** Node.js
- **Frontend:** React 19 + Vite 6 (PWA via vite-plugin-pwa)
- **Backend:** Express.js 5
- **Database:** PostgreSQL via Prisma 5 ORM (Supabase — free managed tier)
- **Auth:** Firebase Auth (client-side) + backend JWT (jsonwebtoken)
- **State:** Zustand 5 (auth/session) + TanStack Query 5 (server data)
- **HTTP client:** Axios (with JWT interceptor)
- **CSS:** Tailwind CSS 3
- **Image upload:** Cloudinary (profile photos)
- **Package manager:** npm (TBD — confirm when scaffolding)
- **Stack changed from:** MERN (MongoDB + Mongoose) → Vite/React + Express/Prisma/PostgreSQL (decided 2026-06-04, Day 1)

## Why the Stack Changed
- MongoDB → PostgreSQL: relational joins, exact Decimal(10,2) for money, proper cascades, Prisma migrations
- Supabase: free managed PostgreSQL, zero ops
- Vite over CRA: faster HMR, PWA plugin, smaller bundle
- Prisma over Mongoose: type-safe, auto-migrations, works with SQL
- TanStack Query: caching + background refetch replaces useEffect+fetch boilerplate
- Zustand: minimal auth state, no Redux overhead
- Firebase Auth: handles Google + email/password, no rolling our own auth
- JWT in localStorage (not httpOnly cookie): PWA hits API on different domain; cross-origin cookies break on mobile browsers

## Project Structure
Scaffolded 2026-06-04.

```
HisabKitab/
├── Web/                          # React 19 PWA (Vite 6)
│   ├── public/manifest.json
│   ├── src/
│   │   ├── main.jsx + index.css     # Entry + Tailwind
│   │   ├── App.jsx                  # Router + QueryClient + Protected routes
│   │   ├── lib/                     # firebase.js, api.js (axios+interceptor), queryClient.js
│   │   ├── store/authStore.js       # Zustand: jwt, user, profile, setAuth, logout
│   │   ├── hooks/                   # useExpenses, useCategories, usePeople, usePaymentTypes, useAuth
│   │   ├── components/
│   │   │   ├── ui/Button.jsx, ui/Input.jsx
│   │   │   ├── BottomNav.jsx, TopBar.jsx
│   │   │   ├── ExpenseCard.jsx, MonthSummary.jsx
│   │   ├── pages/
│   │   │   ├── auth/LoginPage.jsx, SignupPage.jsx
│   │   │   ├── home/HomePage.jsx
│   │   │   ├── expense/AddEditExpensePage.jsx
│   │   │   ├── settings/SettingsPage + Categories/People/PaymentTypes
│   │   │   ├── analytics/AnalyticsPage.jsx  (Phase 3 placeholder)
│   │   │   └── profile/ProfilePage.jsx
│   │   └── utils/currency.js, date.js
│   ├── vite.config.js               # VitePWA + proxy /api → :5000
│   ├── tailwind.config.js, postcss.config.js
│   └── package.json
└── Backend/                          # Express 5 + Prisma 5
    ├── prisma/schema.prisma         # Full Prisma schema (6 models)
    ├── src/
    │   ├── index.js                 # dotenv + listen
    │   ├── app.js                   # express, cors, helmet, rate-limit, routes
    │   ├── lib/prisma.js            # shared PrismaClient singleton
    │   ├── config/firebase.js, cloudinary.js
    │   ├── middleware/auth.js (JWT), upload.js (multer memoryStorage)
    │   └── modules/
    │       ├── auth/ (routes + controller)
    │       ├── user/ (routes + controller)
    │       ├── expense/ (routes + controller)
    │       ├── category/ (routes + controller)
    │       ├── person/ (routes + controller)
    │       └── paymentType/ (routes + controller)
    └── package.json
```

## Database Architecture
PostgreSQL on Supabase. Prisma schema defines:
- **User** — id (cuid), firebaseUid (unique), email, name, phone, photoUrl, photoPublicId
- **Category** — id, userId, name, color, icon; unique(userId, name)
- **PaymentType** — id, userId, name, icon, color, isDefault; unique(userId, name)
- **Person** — id, userId, name; unique(userId, name)
- **Expense** — id, userId, amount (Decimal 10,2), currency (INR default), title, note, expenseDate, categoryId (nullable, SetNull), paymentTypeId; indexes on (userId, expenseDate desc), (userId, categoryId), (userId, paymentTypeId)
- **ExpensePerson** — junction table Expense↔Person, composite PK (expenseId, personId)

All user-owned records cascade-delete when User is deleted.

## Code Flow
_(no code yet)_

Entry points planned:
- `POST /api/auth/login` — Firebase token in → backend JWT out
- `GET /api/user/me` — validate JWT on app load
- All CRUD routes under `/api/expenses`, `/api/categories`, `/api/people`, `/api/payment-types`

## Imports & Exports Map
_(no code yet)_

## Side Effects
_(no code yet)_

## External Services
- **Firebase Auth** — Google + email/password sign-in (client SDK + Admin SDK on server)
- **Supabase** — managed PostgreSQL host (connection via DATABASE_URL)
- **Cloudinary** — profile photo upload/delete (stores public_id for cleanup)

## Implementation Phases
- Phase 1 (core): Login, Home (expense list), Add/Edit/Delete expense, Bottom nav
- Phase 2: Manage categories, payment types, people; Profile + photo upload
- Phase 3: Analytics (charts by category, trend over months, filters)
- Phase 4: PWA polish (offline, install prompt, optimistic updates, skeletons)

## Implementation Order (Weekly)
- Week 1: Server — Express + Prisma + Supabase + auth + all CRUD routes
- Week 2: Client shell — Vite + React + Tailwind + Router + Query + Zustand + LoginPage + auth flow
- Week 3: Core feature — HomePage, AddEditExpensePage, all hooks
- Week 4: Settings/Profile + PWA (vite-plugin-pwa, service worker, manifest)
