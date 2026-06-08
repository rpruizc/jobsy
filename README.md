# 🛰️ Jobsy

A personal, **fresh-first job search** web app. Accounts, filterable search over
1.6M+ live postings, and **saved searches that tell you what's new since you last
looked**. The pitch: not where you browse jobs — where you catch them first.

Built on the [bluedoor job postings API](https://bluedoor.sh/apis/job-postings/docs),
which pulls straight from company ATSes (Greenhouse, Lever, Ashby…), so postings
are real and carry an honest "first seen" timestamp — no ghost jobs, no
recruiter reposts dated as new.

![Jobsy](https://img.shields.io/badge/stack-Express%20%2B%20SQLite%20%2B%20vanilla%20JS-blue)

---

## What it does

- **Accounts** — email + password, secure HTTP-only cookie sessions (scrypt
  hashing, no third-party auth service to configure). Registration is
  **invite-only** via an email allowlist (see below).
- **Filtered search** — keyword, location, remote/hybrid/on-site, salary floor,
  employment type, and a freshness window (last 24h / 48h / 7d / 30d). Results
  are sorted newest-first with accurate "3h ago" badges.
- **Saved searches that watch** — save a filter; the next time you open it,
  Jobsy shows the jobs that appeared *since your last visit* at the top, using
  the API's `first_seen_after`. The sidebar shows a live "N new" badge per
  search.
- **Named employers only** (on by default) — some ATSes (ADP, Oracle) hide the
  employer. This mode queries only the name-bearing providers and caps results
  per company so a single staffing agency can't flood the list.

### Honest limitations
- bluedoor records carry no clean company name; Jobsy derives the employer from
  the ATS URL (`greenhouse.io/figma` → Figma). When it can't, it says "Employer
  not disclosed" rather than guessing.
- A few high-volume staffing agencies still appear. The per-company cap limits
  their dominance but can't remove them.

---

## Run it locally

```bash
npm install
npm run dev        # http://localhost:8080, restarts on change
# or: npm start
```

Open the app, create an account, search, and hit **★ Save**. Data lands in a
local SQLite file at `data/jobsy.db` (gitignored).

```bash
npm run typecheck  # tsc --noEmit
```

No API key required — bluedoor's search endpoints are public.

### Registration allowlist (invite-only)

Only emails in the `ALLOWED_EMAILS` env var (comma-separated, case-insensitive)
may create an account. It **fails closed**: if unset, nobody can register. Login
for existing accounts is unaffected.

```bash
# Local dev: allow yourself
ALLOWED_EMAILS="me@example.com" npm run dev

# Fly: set it as a secret (keeps emails out of the repo), then redeploy
fly secrets set ALLOWED_EMAILS="you@example.com,son@example.com"
```

Set this **before** the first person registers, or they'll get a 403.

---

## Deploy to Fly.io

The app is a single container that serves the API and the frontend. SQLite lives
on a Fly volume so accounts and saved searches survive deploys.

```bash
fly launch --no-deploy            # creates the app; keep the Dockerfile + fly.toml
fly volumes create jobsy_data --region sea --size 1
fly deploy
```

`fly launch` may rename the app — update `app =` in `fly.toml` to match. The
volume name must stay `jobsy_data` (see `[mounts]` in `fly.toml`). The container
listens on `8080`, runs in production mode (secure cookies over HTTPS), and
health-checks at `/healthz`.

The Docker image was verified locally: it builds, compiles `better-sqlite3`,
serves auth + search, and persists the DB to the mounted volume.

---

## How it's built

```
src/
  types.ts                 shared shapes (Job, SearchParams, SavedSearch…)
  server/
    index.ts               Express app: API routes + static frontend
    db.ts                  better-sqlite3 schema (users, sessions, saved_searches)
    auth.ts                scrypt hashing, cookie sessions, requireUser middleware
    bluedoor.ts            search client: filter mapping, employer derivation,
                           "named only" provider merge, freshness counting
    searchParams.ts        validates/sanitizes untrusted filter input
    routes/
      auth.ts              register / login / logout / me
      search.ts            GET /api/search  (auth-gated proxy)
      saved.ts             saved-search CRUD + "new since last viewed"
public/                    vanilla SPA (no build step): auth gate, filters,
                           results, saved-search sidebar
Dockerfile, fly.toml       container + Fly config
```

**Data model.** `users` (email + scrypt hash), `sessions` (sha256 of the cookie
token, 30-day expiry), `saved_searches` (per-user filter JSON + `last_viewed_at`,
the timestamp that powers the "new since" diff). Timestamps are stored as ISO-8601
UTC so they compare directly against the API's `first_seen_at`.

**Why the search is gated behind auth:** this is a personal/account product, not
a public crawl surface.

## Ideas for next

- **Push alerts** — bluedoor offers webhooks (free API key via email OTP); fire a
  notification when a saved search gets new matches instead of waiting for a
  visit.
- **Applied tracker** — mark jobs applied and hide them.
- **OAuth sign-in** and shareable saved searches.
- **Pagination / infinite scroll** on the results list.
