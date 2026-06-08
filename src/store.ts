import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { Job, RawJob } from "./types.js";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const SEEN_FILE = join(DATA_DIR, "seen.json");
const SNAPSHOT_FILE = join(DATA_DIR, "jobs.json");

/** Map of job id -> ISO timestamp we first saw it. */
type Seen = Record<string, string>;

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

/**
 * Stamp each job with first-seen and whether it's new this run, then persist
 * the updated seen-set. A job is "new" the first run it appears in.
 */
export async function reconcile(raw: RawJob[], nowIso: string): Promise<Job[]> {
  const seen = await readJson<Seen>(SEEN_FILE, {});
  const firstRun = Object.keys(seen).length === 0;

  const jobs = raw.map((j): Job => {
    const existing = seen[j.id];
    const isNew = existing === undefined && !firstRun;
    const firstSeenAt = existing ?? nowIso;
    seen[j.id] = firstSeenAt;
    return { ...j, firstSeenAt, isNew };
  });

  await writeFile(SEEN_FILE, JSON.stringify(seen, null, 2));
  return jobs;
}

/** What the dashboard reads. */
export interface Snapshot {
  generatedAt: string;
  jobs: Job[];
  studios: Array<{ name: string; hq: string; kind: string; count: number; error: string | null }>;
}

export async function writeSnapshot(snapshot: Snapshot): Promise<void> {
  await writeFile(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));
}

export async function readSnapshot(): Promise<Snapshot | null> {
  return readJson<Snapshot | null>(SNAPSHOT_FILE, null);
}
