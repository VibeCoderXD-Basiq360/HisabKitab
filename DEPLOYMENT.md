# HisabKitab — Deployment Guide (Vercel + Render)

**Frontend:** Vercel (static PWA)  
**Backend:** Render (Node.js web service)  
**Database:** Supabase PostgreSQL (already hosted — no change needed)

---

## Prerequisites

- GitHub repo pushed and up to date
- Supabase `DATABASE_URL` (session pooler URL from Supabase dashboard)
- Firebase project credentials (Admin SDK service account JSON)
- Cloudinary credentials
- Gemini API key (optional — only for OCR)
- Gmail app password for SMTP (optional — only for email OTP)

---

## Step 1 — Add `vercel.json` (one-time code change)

The frontend calls `/api/*` relative to itself. On Vercel (static host) those
requests need to be proxied to Render. Add this file at the repo root:

**`vercel.json`** (create this file):

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://YOUR_RENDER_SERVICE.onrender.com/api/:path*"
    }
  ]
}
```

> Fill in the Render URL after Step 2. Commit the file once you have it.

---

## Step 2 — Deploy Backend to Render

### 2a. Create the service

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub account and select the **HisabKitab** repo
3. Configure:

| Setting | Value |
|---|---|
| **Name** | `hisabkitab-api` |
| **Root Directory** | `Backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npx prisma generate` |
| **Start Command** | `node src/index.js` |
| **Instance Type** | Free (or Starter $7/mo to avoid cold starts) |

### 2b. Set environment variables

In Render → your service → **Environment** tab, add each of these:

**Database & Auth**
```
DATABASE_URL          = <Supabase session pooler URL>
JWT_SECRET            = <long random string — generate with: openssl rand -base64 48>
JWT_EXPIRES_IN        = 7d
```

**Firebase Admin SDK**  
(from Firebase Console → Project Settings → Service Accounts → Generate new private key)
```
FIREBASE_PROJECT_ID   = hisabkitab-2025
FIREBASE_CLIENT_EMAIL = firebase-adminsdk-xxxxx@hisabkitab-2025.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY  = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```
> Paste the private key exactly as-is including `\n` sequences. Render stores it as a secret.

**Cloudinary**
```
CLOUDINARY_CLOUD_NAME = dk1tp9ssa
CLOUDINARY_API_KEY    = <from Cloudinary dashboard>
CLOUDINARY_API_SECRET = <from Cloudinary dashboard>
```

**CORS — set this to your Vercel URL (fill in after Step 3)**
```
CLIENT_URL            = https://hisabkitab.vercel.app
```

**OCR (optional)**
```
GEMINI_API_KEY        = <from aistudio.google.com — free>
```

**Email OTP (optional)**
```
SMTP_HOST             = smtp.gmail.com
SMTP_PORT             = 587
SMTP_SECURE           = false
SMTP_USER             = hisabkitab.notify@gmail.com
SMTP_PASS             = <Gmail app password>
SMTP_FROM             = HisabKitab <hisabkitab.notify@gmail.com>
```

### 2c. Deploy

Click **Create Web Service**. Render builds and deploys automatically.  
Wait for the build log to show `Server running on port ...`.

Copy your Render URL — it looks like `https://hisabkitab-api.onrender.com`.

---

## Step 3 — Deploy Frontend to Vercel

### 3a. Update `vercel.json`

Fill in the Render URL from Step 2c into `vercel.json` and commit + push:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://hisabkitab-api.onrender.com/api/:path*"
    }
  ]
}
```

### 3b. Create the Vercel project

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import the **HisabKitab** repo from GitHub
3. Configure:

| Setting | Value |
|---|---|
| **Root Directory** | `Web` |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

### 3c. Set environment variables

In Vercel → your project → **Settings → Environment Variables**, add:

```
VITE_FIREBASE_API_KEY            = <Firebase web app apiKey>
VITE_FIREBASE_AUTH_DOMAIN        = hisabkitab-2025.firebaseapp.com
VITE_FIREBASE_PROJECT_ID         = hisabkitab-2025
VITE_FIREBASE_STORAGE_BUCKET     = hisabkitab-2025.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID = <from Firebase console>
VITE_FIREBASE_APP_ID             = <from Firebase console>
```

> These come from Firebase Console → Project Settings → General → Your apps → Web app config.

### 3d. Deploy

Click **Deploy**. Vercel builds and assigns a URL like `https://hisabkitab.vercel.app`.

---

## Step 4 — Wire them together

### 4a. Update CORS on Render

Go back to Render → Environment, set:
```
CLIENT_URL = https://hisabkitab.vercel.app
```
Render redeploys automatically on env var save.

### 4b. Update Firebase authorized domains

1. Firebase Console → Authentication → Settings → Authorized domains
2. Add `hisabkitab.vercel.app`
3. If using a custom domain, add that too

### 4c. Update Supabase allowed origins (if restricted)

Supabase Dashboard → Settings → API → check that your Render IP / all origins are allowed.  
(Supabase free tier allows all by default — no action needed.)

---

## Step 5 — Post-deploy smoke test

Open `https://hisabkitab.vercel.app` and verify:

- [ ] Sign in with Google
- [ ] Add an expense → appears in list
- [ ] Open `/accounts` — account balances load
- [ ] Open `/cart` — shopping cart works
- [ ] Open `/settings/export` → generate PDF
- [ ] Upload a receipt photo (tests Cloudinary)
- [ ] Open the app on mobile → "Add to Home Screen" works (PWA)
- [ ] Disable network → add expense → re-enable → syncs (offline queue)

---

## Custom Domain (optional)

**Vercel:**  
Project → Settings → Domains → Add `hisabkitab.in` → follow DNS instructions.

**Render:**  
Service → Settings → Custom Domains → Add `api.hisabkitab.in`.  
Update `vercel.json` destination and `CLIENT_URL` accordingly.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| API calls return 404 on Vercel | Check `vercel.json` is committed and the Render URL is correct |
| CORS error in browser | Ensure `CLIENT_URL` on Render matches the exact Vercel origin (no trailing slash) |
| Firebase login fails | Add Vercel domain to Firebase authorized domains |
| Render build fails on Prisma | Confirm `npx prisma generate` is in the build command; schema is in `Backend/prisma/` |
| Cold start delay (~30s) | Upgrade Render to Starter ($7/mo) to keep the instance always-on |
| `FIREBASE_PRIVATE_KEY` malformed | The key must have literal `\n` — paste as-is from the JSON file |

---

## Free Tier Limits

| Service | Limit | Notes |
|---|---|---|
| Render (Free) | 750 hrs/mo, spins down after 15 min idle | First request after idle takes ~30s |
| Vercel (Hobby) | 100 GB bandwidth/mo | More than enough for personal use |
| Supabase (Free) | 500 MB DB, 5 GB bandwidth | Pause after 1 week inactivity — upgrade to Pro ($25/mo) to avoid |
| Cloudinary (Free) | 25 GB storage, 25 GB bandwidth | Fine for personal use |
| Gemini API (Free) | 15 req/min, 1500 req/day | Fine for OCR |

---

## Environment Variables Quick Reference

### Backend (Render)

| Variable | Required | Source |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase → Connect → Session pooler |
| `JWT_SECRET` | ✅ | Generate randomly |
| `JWT_EXPIRES_IN` | ✅ | `7d` |
| `FIREBASE_PROJECT_ID` | ✅ | Firebase Console |
| `FIREBASE_CLIENT_EMAIL` | ✅ | Firebase service account JSON |
| `FIREBASE_PRIVATE_KEY` | ✅ | Firebase service account JSON |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary dashboard |
| `CLIENT_URL` | ✅ | Your Vercel URL |
| `GEMINI_API_KEY` | optional | aistudio.google.com |
| `SMTP_HOST` | optional | `smtp.gmail.com` |
| `SMTP_PORT` | optional | `587` |
| `SMTP_SECURE` | optional | `false` |
| `SMTP_USER` | optional | Gmail address |
| `SMTP_PASS` | optional | Gmail app password |
| `SMTP_FROM` | optional | Display name + address |

### Frontend (Vercel)

| Variable | Required | Source |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase web app config |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase web app config |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase web app config |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase web app config |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase web app config |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase web app config |
