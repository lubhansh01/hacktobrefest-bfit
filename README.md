# Hacktoberfest Dehradun 2026

Registration and event-management portal for Hacktoberfest at BFIT College, Dehradun.
React + Vite on the front, Supabase (Postgres, Auth, Realtime) for data, and a small
Express server for transactional email.

## Run locally

**Prerequisites:** Node.js, and a Supabase project.

1. `npm install`
2. `cp .env.example .env` and fill in:
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — from your project's API settings
   - the `SMTP_*` values, if you want outgoing email
3. Apply the database schema (see below).
4. `npm run dev`

## Database

`supabase/schema.sql` is the whole thing: tables, row-level security, the realtime
publication, and the RPCs. Apply it through the Supabase SQL editor, the CLI, or the
Supabase MCP server's `apply_migration`. It is idempotent, so re-running it is safe.

Enable **Google** under Authentication → Providers, and add your app's URL to the
allowed redirect URLs.

Seed the tracks once the schema is in place:

```
VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx seed_tracks.ts
```

### Checking the schema

Authorisation lives in RLS policies, so it is worth testing before an event rather than
during one. `supabase/schema.check.sql` asserts the policies and RPCs behave — that a
signed-out visitor cannot list teams, that a team leader cannot edit a rival's entry or
promote themselves to admin, that activating a round deactivates the others, and so on.

```
npm run db:check    # needs psql and a local Postgres on :55433
```

It runs against a throwaway local database using `supabase/auth_stub.sql` to stand in
for Supabase's `auth` schema. Never apply the stub to a real project.

## Roles

| Role | How someone gets it |
|---|---|
| `admin` | the hardcoded super-admin address, or `role = 'admin'` in `profiles` |
| `event_team` | a row in `event_team`, with a per-permission JSON map |
| `mentor` | a row in `mentors` |
| `user` | everyone else |

Roles are resolved server-side by the `sync_my_profile()` RPC, which the client calls on
sign-in. The browser reads its role; it never assigns one.
