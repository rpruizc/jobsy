import { STUDIOS } from "./studios.js";
import { searchBluedoor, type BluedoorJob } from "./fetchers/bluedoor.js";
import { isSeattleLocation } from "./seattle.js";

// Phrases that strongly imply a video-game role (not just any job containing
// "game" or "designer"). We post-filter on the full phrase to cut the noise
// the tokenized search returns (e.g. "Interior Designer (Level 3)").
const GAME_PHRASES = [
  "gameplay",
  "game designer",
  "game design",
  "level designer",
  "technical artist",
  "tech artist",
  "game programmer",
  "gameplay engineer",
  "game engineer",
  "narrative designer",
  "encounter designer",
  "game producer",
  "vfx artist",
  "character artist",
  "environment artist",
  "game qa",
];

const KNOWN = new Set<string>();
for (const s of STUDIOS) {
  if (s.source.kind === "greenhouse") KNOWN.add(`greenhouse/${s.source.account}`);
  if (s.source.kind === "lever") KNOWN.add(`lever/${s.source.account}`);
}

/** Pull the ATS board slug out of a source URL, so we can suggest it as a feed. */
function boardKey(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const seg = u.pathname.split("/").filter(Boolean);
    if (host.includes("greenhouse.io")) return `greenhouse/${seg[seg.indexOf("jobs") > 0 ? 0 : 0] ?? ""}`;
    if (host.includes("lever.co")) return `lever/${seg[0] ?? ""}`;
    if (host.endsWith("bamboohr.com")) return `bamboohr/${host.split(".")[0]}`;
    return host; // unknown ATS — show the host so you can investigate
  } catch {
    return null;
  }
}

function matchesGamePhrase(title: string): boolean {
  const t = title.toLowerCase();
  return GAME_PHRASES.some((p) => t.includes(p));
}

async function main(): Promise<void> {
  console.log("\n🔎 Discovering Seattle-area game studios not on your watchlist...\n");

  const found = new Map<string, { board: string; example: string; count: number }>();

  for (const phrase of GAME_PHRASES) {
    // Search WA-region jobs for this phrase, plus a remote pass (studios post remote).
    const batches = await Promise.all([
      searchBluedoor({ q: phrase, region: "WA", limit: "50" }),
      searchBluedoor({ q: phrase, workplace_type: "remote", limit: "50" }),
    ]).catch(() => [[], []] as BluedoorJob[][]);

    for (const j of batches.flat()) {
      if (!matchesGamePhrase(j.title)) continue; // drop tokenizer false positives
      const loc = j.location_text ?? [j.city, j.region].filter(Boolean).join(", ");
      // Keep WA-ish or remote results; skip clearly-elsewhere noise.
      if (!isSeattleLocation(loc) && j.region !== "WA") continue;

      const key = boardKey(j.source_url);
      if (!key || KNOWN.has(key)) continue;

      const prev = found.get(key);
      if (prev) prev.count++;
      else found.set(key, { board: key, example: `${j.title} — ${loc}`, count: 1 });
    }
  }

  if (found.size === 0) {
    console.log("No new studios surfaced this pass. (bluedoor's game-studio coverage is sparse —");
    console.log("the curated list in src/studios.ts is doing the heavy lifting.)\n");
    return;
  }

  const ranked = [...found.values()].sort((a, b) => b.count - a.count);
  console.log("Candidate studios to add to src/studios.ts (board · sample role):\n");
  for (const f of ranked) {
    console.log(`  ${f.board.padEnd(34)} ${f.count} role(s)`);
    console.log(`      e.g. ${f.example}`);
  }
  console.log("\nVerify a candidate, then add it to STUDIOS with its { kind, account }.\n");
}

main().catch((err) => {
  console.error("discover failed:", err);
  process.exit(1);
});
