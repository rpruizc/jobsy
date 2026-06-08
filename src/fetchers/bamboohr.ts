import type { RawJob } from "../types.js";
import { bucketLocation, isRemoteLocation, isSeattleLocation } from "../seattle.js";

// BambooHR exposes a public careers JSON list, no key required:
//   https://{account}.bamboohr.com/careers/list
interface BambooJob {
  id: string;
  jobOpeningName: string;
  departmentLabel?: string | null;
  employmentStatusLabel?: string | null;
  isRemote?: boolean | null;
  location?: { city?: string | null; state?: string | null } | null;
  atsLocation?: { country?: string | null; state?: string | null; province?: string | null; city?: string | null } | null;
}

function locationOf(j: BambooJob): string {
  const a = j.location ?? {};
  const b = j.atsLocation ?? {};
  const parts = [a.city ?? b.city, a.state ?? b.state ?? b.province, b.country].filter(
    (x): x is string => Boolean(x && x.trim()),
  );
  return [...new Set(parts)].join(", ");
}

export async function fetchBambooHr(account: string, studio: string): Promise<RawJob[]> {
  const url = `https://${account}.bamboohr.com/careers/list`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`bamboohr ${account}: HTTP ${res.status}`);
  const body = (await res.json()) as { result?: BambooJob[] };
  const jobs = body.result ?? [];

  return jobs.map((j): RawJob => {
    let locationText = locationOf(j);
    if (j.isRemote && !isRemoteLocation(locationText)) {
      locationText = locationText ? `${locationText} (Remote)` : "Remote";
    }
    return {
      id: `bamboohr:${account}:${j.id}`,
      title: j.jobOpeningName.trim(),
      studio,
      url: `https://${account}.bamboohr.com/careers/${j.id}`,
      locationText,
      bucket: bucketLocation(locationText),
      isSeattle: isSeattleLocation(locationText),
      isRemote: isRemoteLocation(locationText) || Boolean(j.isRemote),
      department: j.departmentLabel ?? null,
      postedAt: null, // BambooHR's list endpoint doesn't expose a post date
      source: "bamboohr",
    };
  });
}
