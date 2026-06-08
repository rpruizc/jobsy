import type { RawJob } from "../types.js";
import { bucketLocation, isRemoteLocation, isSeattleLocation } from "../seattle.js";

// Greenhouse exposes every board publicly, no key required:
//   https://boards-api.greenhouse.io/v1/boards/{account}/jobs
interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  updated_at?: string;
  location?: { name?: string };
  departments?: Array<{ name?: string }>;
}

export async function fetchGreenhouse(account: string, studio: string): Promise<RawJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(account)}/jobs`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`greenhouse ${account}: HTTP ${res.status}`);
  const body = (await res.json()) as { jobs?: GreenhouseJob[] };
  const jobs = body.jobs ?? [];

  return jobs.map((j): RawJob => {
    const locationText = j.location?.name?.trim() ?? "";
    const department = j.departments?.find((d) => d.name)?.name ?? null;
    return {
      id: `greenhouse:${account}:${j.id}`,
      title: j.title.trim(),
      studio,
      url: j.absolute_url,
      locationText,
      bucket: bucketLocation(locationText),
      isSeattle: isSeattleLocation(locationText),
      isRemote: isRemoteLocation(locationText),
      department,
      postedAt: j.updated_at ?? null,
      source: "greenhouse",
    };
  });
}
