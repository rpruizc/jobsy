import type { RawJob } from "../types.js";
import { bucketLocation, isRemoteLocation, isSeattleLocation } from "../seattle.js";

// bluedoor aggregates 60k+ company boards. No key needed for search/source feeds.
// We use it two ways: per-studio feeds (for studios it covers) and the
// cross-studio discovery sweep (see src/discover.ts).
const BASE = "https://api.bluedoor.sh/job-postings/v1";

export interface BluedoorJob {
  job_id: string;
  title: string;
  location_text?: string | null;
  city?: string | null;
  region?: string | null;
  department?: string | null;
  workplace_type?: string | null;
  source_url?: string | null;
  apply_url?: string | null;
  source_posted_at?: string | null;
  last_changed_at?: string | null;
}

function locationOf(j: BluedoorJob): string {
  if (j.location_text && j.location_text.trim()) return j.location_text.trim();
  const parts = [j.city, j.region].filter((x): x is string => Boolean(x && x.trim()));
  return parts.join(", ");
}

export function normalizeBluedoor(j: BluedoorJob, studio: string): RawJob {
  let locationText = locationOf(j);
  // workplace_type is a useful extra remote signal the location text may omit.
  if (j.workplace_type === "remote" && !isRemoteLocation(locationText)) {
    locationText = locationText ? `${locationText} (Remote)` : "Remote";
  }
  return {
    id: `bluedoor:${j.job_id}`,
    title: j.title.trim(),
    studio,
    url: j.apply_url ?? j.source_url ?? "",
    locationText,
    bucket: bucketLocation(locationText),
    isSeattle: isSeattleLocation(locationText),
    isRemote: isRemoteLocation(locationText) || j.workplace_type === "remote",
    department: j.department ?? null,
    postedAt: j.source_posted_at ?? j.last_changed_at ?? null,
    source: "bluedoor",
  };
}

/** All jobs for one studio's board, by bluedoor source id. */
export async function fetchBluedoorSource(sourceId: string, studio: string): Promise<RawJob[]> {
  const out: RawJob[] = [];
  let cursor: string | undefined;
  do {
    const url = new URL(`${BASE}/sources/${sourceId}/jobs`);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`bluedoor source ${sourceId}: HTTP ${res.status}`);
    const body = (await res.json()) as { data?: BluedoorJob[]; meta?: { next_cursor?: string } };
    for (const j of body.data ?? []) out.push(normalizeBluedoor(j, studio));
    cursor = body.meta?.next_cursor;
  } while (cursor);
  return out;
}

/** Raw cross-studio search, used by the discovery sweep. */
export async function searchBluedoor(params: Record<string, string>): Promise<BluedoorJob[]> {
  const url = new URL(`${BASE}/jobs/search`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`bluedoor search: HTTP ${res.status}`);
  const body = (await res.json()) as { data?: BluedoorJob[] };
  return body.data ?? [];
}
