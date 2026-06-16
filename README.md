# HisabKitab

A mobile-first Progressive Web App for personal expense tracking with split & settle functionality.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white&style=flat-square)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white&style=flat-square)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1?logo=postgresql&logoColor=white&style=flat-square)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20FCM-FFCA28?logo=firebase&logoColor=black&style=flat-square)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white&style=flat-square)

---

## Features

- **Expense Tracking** — add, edit, and delete expenses with custom categories and payment types
- **Split & Settle** — split any expense with people, track who owes what, request and confirm payments
- **Push Notifications** — real-time FCM notifications when someone marks a split as paid or accepts/rejects a payment
- **Balance Overview** — at-a-glance nudge cards showing money owed to you and money you owe
- **People Management** — link people to their HisabKitab accounts for seamless splitting
- **Profile Photos** — upload, crop, zoom, and rotate your profile photo in-app
- **Auth** — Google sign-in and email/password with forgot-password flow
- **PWA** — installable on Android and iOS, works offline for reads

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, TailwindCSS 3 |
| Routing | React Router 6 |
| Data Fetching | TanStack Query 5 |
| State | Zustand 5 |
| Backend | Express 5, Node.js |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 5 |
| Auth | Firebase Auth (Google + Email/Password) |
| Push | Firebase Cloud Messaging (FCM) |
| Images | Cloudinary |
| PWA | vite-plugin-pwa |

---

## Project Structure

```
HisabKitab/
├── Web/                    # React + Vite frontend
│   └── src/
│       ├── pages/          # Home, Balances, Analytics, Profile, Settings, Auth
│       ├── components/     # Shared UI components
│       ├── hooks/          # Data hooks (expenses, splits, categories…)
│       ├── store/          # Zustand auth store
│       └── lib/            # Axios client, Firebase, TanStack Query config
│
└── Backend/                # Express API server
    └── src/
        ├── modules/        # auth, user, expense, category, paymentType, person, splits
        ├── middleware/     # JWT auth, Multer upload
        ├── config/         # Firebase Admin, Cloudinary
        └── lib/            # Prisma singleton, FCM notify helper
```

---

## Local Development

### Prerequisites

- Node.js 20+
- A PostgreSQL database (Supabase free tier works)
- Firebase project (Auth + FCM enabled)
- Cloudinary account

### 1. Clone & install

```bash
git clone https://github.com/VibeCoderXD-Basiq360/HisabKitab.git
cd HisabKitab

cd Backend && npm install
cd ../Web && npm install
```

### 2. Environment variables

**Backend** — copy `Backend/.env.example` to `Backend/.env`:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
# Firebase Admin SDK service account JSON (stringify the whole file)
FIREBASE_SERVICE_ACCOUNT='{...}'
```

**Frontend** — copy `Web/.env.example` to `Web/.env.local`:

```env
VITE_API_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...
```

### 3. Database setup

```bash
cd Backend
npx prisma migrate deploy
```

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
Payer adds expense → tags people → splits created (PENDING)
         │
Ower marks as paid → split → PAYMENT_REQUESTED (FCM to payer)
         │
Payer accepts → CONFIRMED (split expense created in ower's account, FCM sent)
Payer rejects → back to PENDING (FCM sent)
```

Equal-split formula: `amount ÷ (number of people + 1)` — the +1 accounts for the payer's own share.

---

## API Overview

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/register` `POST /auth/login` |
| User | `GET/PATCH /user/profile` `POST /user/profile-image` |
| Expenses | `GET/POST /expenses` `GET/PATCH/DELETE /expenses/:id` |
| Categories | `GET/POST /categories` `PATCH/DELETE /categories/:id` |
| Payment Types | `GET/POST /payment-types` `PATCH/DELETE /payment-types/:id` |
| People | `GET/POST /people` `PATCH/DELETE /people/:id` |
| Splits | `GET /splits` `POST /splits/:expenseId` `PATCH /splits/:id/mark-paid` `PATCH /splits/:id/confirm` `PATCH /splits/:id/reject` |

All endpoints (except auth) require a `Bearer <JWT>` token in the `Authorization` header.

---

## License

MIT
