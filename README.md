# 🎮 Jobsy

A personal job radar for **Seattle-area video game studios**. It watches each
studio's hiring page, pulls every opening, flags what's **new since you last
checked**, and shows it all in one clean dashboard — so you find the job before
it's buried under 300 applicants.

Built around the idea that the biggest edge a new grad has is *being early*.

---

## Quick start

```bash
npm install
npm run radar       # fetch all studios, detect new jobs, print a digest
npm run dashboard   # browse them at http://localhost:4173
```

Run `npm run radar` whenever you want a fresh pull (e.g. each morning). New
postings get a **NEW** badge until you've seen them.

```bash
npm run discover    # mine bluedoor for game studios you haven't added yet
npm run typecheck   # tsc --noEmit
```

No API keys required. Everything uses public endpoints.

---

## How it works

Job datasets are bad at two things this tool works around:

1. **Company names are unreliable.** Searching "Valve" returns plumbing
   companies. So every studio is pinned to its **ATS** (hiring platform) instead
   — the exact, stable identifier.
2. **Location tagging is inconsistent.** Big studios post roles as "Remote" with
   no state. So Jobsy pulls each studio's *full* feed and decides the
   Seattle/Remote bucket itself (see [`src/seattle.ts`](src/seattle.ts)).

### Two data layers

- **Direct ATS feeds** — the source of truth for studios on a known platform.
  Public, keyless JSON APIs:
  - Greenhouse: `boards-api.greenhouse.io/v1/boards/{slug}/jobs`
  - Lever: `api.lever.co/v0/postings/{slug}?mode=json`
  - BambooHR: `{slug}.bamboohr.com/careers/list`
- **bluedoor** ([API docs](https://bluedoor.sh/apis/job-postings/docs)) — a
  60k-company aggregator used for *discovery* (`npm run discover`) and for
  studios it covers that aren't on a platform we fetch directly.

### Honesty about coverage

bluedoor's game-studio coverage is partial, and not every studio exposes a
machine-readable feed. Jobsy never hides that: studios it can't fetch
automatically are listed as **"check by hand"** in the coverage panel and the
CLI digest, with a link to their careers page. You always know what's covered
and what isn't.

---

## Maintaining the watchlist

The watchlist in [`src/studios.ts`](src/studios.ts) is the heart of the tool —
this is the part you curate. To add a studio, find its careers page; the URL
tells you the ATS:

| Careers URL contains        | Add this                                  |
| --------------------------- | ----------------------------------------- |
| `boards.greenhouse.io/ACME` | `{ kind: "greenhouse", account: "ACME" }` |
| `jobs.lever.co/ACME`        | `{ kind: "lever", account: "ACME" }`      |
| `ACME.bamboohr.com`         | `{ kind: "bamboohr", account: "ACME" }`   |
| (can't find a feed)         | `{ kind: "manual", careersUrl: "..." }`   |

Then re-run `npm run radar`. Use `npm run discover` to get suggestions for
studios already visible in bluedoor (it found Cat Daddy Games and Seismic
Squirrel that way).

Studios seeded with verified live feeds: Nintendo of America, Studio Wildcard
(ARK), Cat Daddy Games, Seismic Squirrel, Bungie, Undead Labs. A dozen more
(Valve, ArenaNet, Xbox Game Studios, Halo Studios, Wizards of the Coast,
Polyarc, Amazon Games, and others) are seeded as "manual" — find their ATS slug
and promote them.

---

## Project layout

```
src/
  studios.ts        the watchlist you curate
  seattle.ts        location bucketing (Seattle / Remote / Elsewhere)
  types.ts          shared shapes
  store.ts          tracks first-seen job ids -> "new" detection
  radar.ts          orchestrates fetch + reconcile + snapshot
  cli.ts            `npm run radar` — fetch + terminal digest
  discover.ts       `npm run discover` — find new studios via bluedoor
  server.ts         `npm run dashboard` — local web UI
  fetchers/         one module per ATS (greenhouse, lever, bamboohr, bluedoor)
public/             the dashboard (vanilla, no build step)
data/               local state: seen.json + jobs.json (gitignored)
```

## Ideas for v2

- **Alerts:** with a free bluedoor key (email OTP), subscribe to webhooks so new
  matching jobs push to you instead of you polling.
- **Entry-level filter:** rank roles by title keywords (junior / associate /
  new grad / I) — useful for a first job out of school.
- **Applied tracker:** mark jobs as applied and hide them.
- **Schedule it:** a cron/launchd job that runs `npm run radar` each morning.
