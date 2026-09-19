# Hacktoberfest Dehradun 2026

Event platform for Hacktoberfest Dehradun, organised by BFIT College Dehradun.
Frontend and backend deploy independently.

```
frontend/   React + Vite SPA (Supabase client). Deploy as a static site.
backend/    Express mail API. Deploy as a Node service.
supabase/   schema.sql + seed script. Run once against your Supabase project.
```

## Local development

Two terminals — they are separate apps with separate installs:

```bash
cd backend  && npm install && npm run dev   # API  on :3001
cd frontend && npm install && npm run dev   # SPA  on :5173
```

Vite proxies `/api/*` to `http://localhost:3001`, so `VITE_API_URL` stays empty
locally and the same relative paths work in both environments.

## Environment

Copy each `.env.example` to `.env` and fill it in.

| Where | Key | Notes |
|---|---|---|
| frontend | `VITE_SUPABASE_URL` | Supabase project URL |
| frontend | `VITE_SUPABASE_ANON_KEY` | Publishable key. Safe in the browser — RLS protects the data |
| frontend | `VITE_API_URL` | Empty in dev. In prod, the deployed backend origin |
| backend | `PORT` | Defaults to 3001 |
| backend | `CORS_ORIGIN` | Comma-separated frontend origins. Empty allows any (dev only) |
| backend | `SMTP_*` | Mail credentials |
| backend | `APP_URL` | Public frontend URL, used for links inside emails |

Never put a Supabase **secret** (`sb_secret_…` / service role) key in a `VITE_`
variable — those are inlined into the browser bundle.

## Deploying

**Frontend** (Vercel, Netlify, Cloudflare Pages): root `frontend`, build
`npm run build`, output `dist`. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
and `VITE_API_URL` (the backend's public URL) at build time — Vite inlines them,
so changing one needs a rebuild.

**Backend** (Cloud Run, Railway, Render, Fly): root `backend`, start
`npm run start`. Set the `SMTP_*` vars, `APP_URL`, and `CORS_ORIGIN` to the
frontend's deployed origin. Health check: `GET /healthz`.

## Database

Run `supabase/schema.sql` in the Supabase SQL editor (13 tables, RLS enabled).
Optionally seed tracks:

```bash
VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx supabase/seed_tracks.ts
```

Google sign-in needs the Google provider enabled under Authentication →
Providers, with `https://<project>.supabase.co/auth/v1/callback` registered as
the redirect URI in Google Cloud, and your frontend origin listed under
Authentication → URL Configuration.
