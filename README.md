<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Nível X — Gestão de Reencontro

This is a Vite + React app. It includes:
- A browser-only “mock backend” (localStorage) for quick iteration
- A Vercel serverless backend scaffold (`/api`) for Google services (Firestore + Cloud Storage + Gemini)

## Security note (important)

Do **not** commit secrets to Git. If you pasted/committed OAuth secrets or API keys anywhere, **rotate them immediately** in Google Cloud and Vercel.

## Run locally

**Prerequisites:** Node.js

```bash
npm install
npm run dev
```

### Local API development

Gemini features now call server-side routes under `/api/*`. To run those locally, prefer:

```bash
npx vercel dev
```

## Deploy on Vercel + Google services

This repo includes Vercel Functions under `api/`:
- `POST /api/auth/login` (simple username login, return session JWT)
- `GET /api/me`
- `GET/PATCH /api/guests`
- `GET /api/activities`
- `POST /api/proofs/*` (proof uploads/downloads)
- `POST /api/traces/*` (trace posts + optional image upload)

### Required Vercel Environment Variables

Set these in the Vercel dashboard (Project → Settings → Environment Variables):

- `SECRET_KEY`: used to sign session JWTs
- `ADMIN_NAMES`: comma-separated list of admin names (default: `ataliba`)
- `POSTGRES_URL` / Vercel Postgres variables (auto-managed by Vercel Postgres integration)
- `BLOB_READ_WRITE_TOKEN` (auto-managed by Vercel Blob integration)
- `ALLOWED_ORIGINS`: comma-separated list of allowed origins (optional)

### Notes
- The frontend no longer injects Gemini keys; it calls `/api/gemini/*`.
- Firestore/Storage require a service account on Vercel (`GOOGLE_SERVICE_ACCOUNT_JSON`).

### Template

See `env.example` for a key-only template (no secret values).
