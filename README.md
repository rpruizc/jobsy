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

- **Passwordless sign-in** — no signup, no passwords. You pick your initial from
  a fixed roster (R/D/H/P/G), and a one-time 6-digit code is emailed to you.
  Enter it and you're in (secure HTTP-only cookie session). The emails behind the
  letters live only in a server secret — never in the browser or the repo.
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

### Sign-in setup (two secrets)

Sign-in is a passwordless email code for a fixed roster. Two pieces of config,
both **secrets** so nothing sensitive is in the repo:

**1. The roster** — maps each login letter to a recipient email. Letters are all
the browser ever sees; emails stay server-side.

```bash
fly secrets set LOGIN_RECIPIENTS="R:a@x.com,D:b@x.com,H:c@x.com,P:d@x.com,G:e@x.com" -a jobsy
```

**2. Email delivery** — codes are sent through [Resend](https://resend.com).
Create an API key, verify a sending domain, then:

```bash
fly secrets set -a jobsy \
  RESEND_API_KEY=re_your_key \
  MAIL_FROM='Jobsy <login@yourdomain.com>'
```

`MAIL_FROM` must be on a domain you've verified in Resend. For a quick test
without a domain, omit `MAIL_FROM` (defaults to `onboarding@resend.dev`) — but
Resend will only deliver to the email that owns the Resend account.

It **fails closed**: with no `LOGIN_RECIPIENTS`, the picker is empty and nobody
can sign in. Until `RESEND_API_KEY` is set, codes are logged to the server
(`fly logs`) instead of emailed — handy for local dev, where:

```bash
LOGIN_RECIPIENTS="R:me@x.com" npm run dev   # code prints to the console
```

Each code is 6 digits, single-use, expires in 10 minutes, and locks after 5
wrong tries.

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
    db.ts                  better-sqlite3 schema (users, sessions, login_codes,
                           saved_searches)
    config.ts              login roster (LOGIN_RECIPIENTS) — letters public,
                           emails secret
    auth.ts                cookie sessions + get-or-create user by login letter
    otp.ts                 6-digit code: issue, verify, single-use, lockout
    mailer.ts              SMTP send (nodemailer); logs the code if SMTP unset
    bluedoor.ts            search client: filter mapping, employer derivation,
                           "named only" provider merge, freshness counting
    searchParams.ts        validates/sanitizes untrusted filter input
    routes/
      auth.ts              options / request-code / verify-code / logout / me
      search.ts            GET /api/search  (auth-gated proxy)
      saved.ts             saved-search CRUD + "new since last viewed"
public/                    vanilla SPA (no build step): auth gate, filters,
                           results, saved-search sidebar
Dockerfile, fly.toml       container + Fly config
```

**Data model.** `users` (login letter only — no email, no password), `sessions`
(sha256 of the cookie token, 30-day expiry), `login_codes` (hashed 6-digit code
per key, with expiry + attempt count), `saved_searches` (per-user filter JSON +
`last_viewed_at`, the timestamp that powers the "new since" diff). Timestamps are
stored as ISO-8601
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
