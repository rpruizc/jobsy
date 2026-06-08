import type { Studio } from "./types.js";

/**
 * The watchlist. This is the heart of the tool and the thing you maintain.
 *
 * Each studio is pinned to its ATS (hiring platform), which is the only stable,
 * exact identifier — company names are unreliable in every job dataset.
 *
 * To add a studio:
 *   1. Find its careers page. The URL tells you the ATS:
 *        boards.greenhouse.io/SLUG        -> { kind: "greenhouse", account: "SLUG" }
 *        jobs.lever.co/SLUG               -> { kind: "lever", account: "SLUG" }
 *        SLUG.bamboohr.com / others       -> see if bluedoor has it (npm run discover)
 *   2. If you can't find a feed, add it as `manual` with the careers URL. The
 *      radar will still list it so you remember to check it by hand.
 *
 * Boards marked ✓ were verified live when this list was seeded.
 */
export const STUDIOS: Studio[] = [
  // --- Wired up: real machine-readable feeds (verified live) ---
  { name: "Nintendo of America", hq: "Redmond, WA", source: { kind: "greenhouse", account: "nintendo" } }, // ✓ ~58 jobs
  { name: "Studio Wildcard", hq: "Redmond, WA", source: { kind: "bamboohr", account: "studiowildcard" } }, // ✓ ~7 jobs (ARK)
  { name: "Cat Daddy Games", hq: "Kirkland, WA", source: { kind: "greenhouse", account: "catdaddy" } }, // ✓ 2K mobile studio
  { name: "Seismic Squirrel", hq: "Issaquah, WA", source: { kind: "bamboohr", account: "seismicsquirrel" } }, // ✓
  { name: "Bungie", hq: "Bellevue, WA", source: { kind: "greenhouse", account: "bungie" } }, // ✓ (low volume right now)
  { name: "Undead Labs", hq: "Seattle, WA", source: { kind: "greenhouse", account: "undeadlabsllc" } }, // ✓ (Xbox first-party)

  // --- Known PNW studios with no feed wired yet. Find the ATS slug and move them up.
  //     (Sucker Punch, Rec Room, Pokémon use ATSes I couldn't pin to a public feed.) ---
  { name: "Sucker Punch Productions", hq: "Bellevue, WA", source: { kind: "manual", careersUrl: "https://www.suckerpunch.com/careers/" } },
  { name: "Rec Room", hq: "Seattle, WA", source: { kind: "manual", careersUrl: "https://recroom.com/careers" } },
  { name: "The Pokémon Company Intl.", hq: "Bellevue, WA", source: { kind: "manual", careersUrl: "https://careers.pokemon.com/" } },
  { name: "Valve", hq: "Bellevue, WA", source: { kind: "manual", careersUrl: "https://www.valvesoftware.com/en/jobs" } },
  { name: "ArenaNet", hq: "Bellevue, WA", source: { kind: "manual", careersUrl: "https://arena.net/careers" } },
  { name: "Xbox Game Studios", hq: "Redmond, WA", source: { kind: "manual", careersUrl: "https://careers.xbox.com/" } },
  { name: "Halo Studios (343)", hq: "Redmond, WA", source: { kind: "manual", careersUrl: "https://www.halowaypoint.com/careers" } },
  { name: "ProbablyMonsters", hq: "Bellevue, WA", source: { kind: "manual", careersUrl: "https://probablymonsters.com/careers/" } },
  { name: "Wizards of the Coast", hq: "Renton, WA", source: { kind: "manual", careersUrl: "https://careers.wizards.com/" } },
  { name: "Polyarc", hq: "Bellevue, WA", source: { kind: "manual", careersUrl: "https://polyarcgames.com/careers/" } },
  { name: "Amazon Games", hq: "Seattle, WA", source: { kind: "manual", careersUrl: "https://www.amazongames.com/en-us/jobs" } },
  { name: "Hidden Path Entertainment", hq: "Bellevue, WA", source: { kind: "manual", careersUrl: "https://hiddenpath.com/careers/" } },
];
