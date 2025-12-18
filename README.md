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
- `POST /api/auth/google` (verify Google ID token, return session JWT)
- `GET /api/me`
- `GET/PATCH /api/guests`
- `GET /api/activities`
- `POST /api/proofs/upload-url` (signed upload URL)
- `POST /api/proofs/confirm`
- `POST /api/gemini/*` (Gemini calls run server-side)

### Required Vercel Environment Variables

Set these in the Vercel dashboard (Project → Settings → Environment Variables):

- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client id (public, used by the browser for Google Sign-In)
- `GOOGLE_CLIENT_ID`: Google OAuth client id (Web)
- `SECRET_KEY`: used to sign session JWTs
- `ADMIN_EMAILS`: comma-separated list of admin emails (include Ataliba’s email here)
- `GEMINI_API_KEY`: server-side Gemini API key
- `GOOGLE_SERVICE_ACCOUNT_JSON`: **stringified** service account JSON with Firestore + Storage permissions
- `CLOUD_STORAGE_BUCKET`: bucket name for payment proofs (e.g. `my-bucket`)
- `ALLOWED_ORIGINS`: comma-separated list of allowed origins (e.g. your Vercel URL)

### Notes
- The frontend no longer injects Gemini keys; it calls `/api/gemini/*`.
- Firestore/Storage require a service account on Vercel (`GOOGLE_SERVICE_ACCOUNT_JSON`).
