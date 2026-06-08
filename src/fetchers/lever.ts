import type { RawJob } from "../types.js";
import { bucketLocation, isRemoteLocation, isSeattleLocation } from "../seattle.js";

// Lever exposes every posting list publicly, no key required:
//   https://api.lever.co/v0/postings/{account}?mode=json
interface LeverJob {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  createdAt?: number; // epoch ms
  categories?: { location?: string; team?: string; department?: string };
}

export async function fetchLever(account: string, studio: string): Promise<RawJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(account)}?mode=json`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`lever ${account}: HTTP ${res.status}`);
  const jobs = (await res.json()) as LeverJob[];

  return jobs.map((j): RawJob => {
    const locationText = j.categories?.location?.trim() ?? "";
    const department = j.categories?.department ?? j.categories?.team ?? null;
    return {
      id: `lever:${account}:${j.id}`,
      title: j.text.trim(),
      studio,
      url: j.applyUrl ?? j.hostedUrl,
      locationText,
      bucket: bucketLocation(locationText),
      isSeattle: isSeattleLocation(locationText),
      isRemote: isRemoteLocation(locationText),
      department,
      postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
      source: "lever",
    };
  });
}
