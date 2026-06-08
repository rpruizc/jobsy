import type { LocationBucket } from "./types.js";

// Greater-Seattle place names. Lowercased, matched as substrings except "wa",
// which we match as a standalone token to avoid false hits like "Warsaw".
const SEATTLE_PLACES = [
  "seattle",
  "bellevue",
  "redmond",
  "kirkland",
  "renton",
  "bothell",
  "everett",
  "tacoma",
  "issaquah",
  "sammamish",
  "lynnwood",
  "tukwila",
  "washington",
  "puget sound",
  "pacific northwest",
];

const REMOTE_HINTS = ["remote", "anywhere", "distributed", "work from home", "wfh"];

function hasWaToken(text: string): boolean {
  // " wa", "wa,", "(wa", "/wa" etc. — a standalone WA, not part of a word.
  return /\bwa\b/.test(text);
}

export function isSeattleLocation(locationText: string): boolean {
  const t = locationText.toLowerCase();
  if (SEATTLE_PLACES.some((p) => t.includes(p))) return true;
  return hasWaToken(t);
}

export function isRemoteLocation(locationText: string): boolean {
  const t = locationText.toLowerCase();
  return REMOTE_HINTS.some((p) => t.includes(p));
}

/**
 * Bucket a job by location. Seattle wins over remote (a "Seattle (Remote OK)"
 * role is still local), remote wins over a far-away office, and a blank
 * location is "unknown" rather than silently dropped.
 */
export function bucketLocation(locationText: string): LocationBucket {
  const seattle = isSeattleLocation(locationText);
  const remote = isRemoteLocation(locationText);
  if (seattle) return "seattle";
  if (remote) return "remote";
  if (locationText.trim() === "") return "unknown";
  return "elsewhere";
}
