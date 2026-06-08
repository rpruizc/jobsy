import type { Job, Studio } from "./types.js";
import { fetchStudio, type FetchResult } from "./fetchers/index.js";
import { reconcile, writeSnapshot, type Snapshot } from "./store.js";

/** Run callbacks with a small concurrency cap so we don't hammer the APIs. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export interface RadarRun {
  snapshot: Snapshot;
  results: FetchResult[];
}

/** Fetch every watched studio, detect new postings, and write the snapshot. */
export async function runRadar(studios: Studio[], nowIso: string): Promise<RadarRun> {
  const results = await mapLimit(studios, 5, fetchStudio);

  const raw = results.flatMap((r) => r.jobs);
  const jobs = await reconcile(raw, nowIso);

  // Re-attach reconciled jobs to studios for accurate per-studio counts.
  const byStudio = new Map<string, Job[]>();
  for (const j of jobs) {
    const list = byStudio.get(j.studio) ?? [];
    list.push(j);
    byStudio.set(j.studio, list);
  }

  const snapshot: Snapshot = {
    generatedAt: nowIso,
    jobs,
    studios: results.map((r) => ({
      name: r.studio.name,
      hq: r.studio.hq,
      kind: r.studio.source.kind,
      count: byStudio.get(r.studio.name)?.length ?? 0,
      error: r.error,
    })),
  };

  await writeSnapshot(snapshot);
  return { snapshot, results };
}
