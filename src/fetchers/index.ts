import type { RawJob, Studio } from "../types.js";
import { fetchGreenhouse } from "./greenhouse.js";
import { fetchLever } from "./lever.js";
import { fetchBambooHr } from "./bamboohr.js";
import { fetchBluedoorSource } from "./bluedoor.js";

export interface FetchResult {
  studio: Studio;
  jobs: RawJob[];
  /** Set when the studio has no automated feed (kind: "manual"). */
  manual: boolean;
  error: string | null;
}

/** Fetch one studio's jobs via whichever ATS it's pinned to. */
export async function fetchStudio(studio: Studio): Promise<FetchResult> {
  const s = studio.source;
  try {
    switch (s.kind) {
      case "greenhouse":
        return { studio, jobs: await fetchGreenhouse(s.account, studio.name), manual: false, error: null };
      case "lever":
        return { studio, jobs: await fetchLever(s.account, studio.name), manual: false, error: null };
      case "bamboohr":
        return { studio, jobs: await fetchBambooHr(s.account, studio.name), manual: false, error: null };
      case "bluedoor":
        return { studio, jobs: await fetchBluedoorSource(s.sourceId, studio.name), manual: false, error: null };
      case "manual":
        return { studio, jobs: [], manual: true, error: null };
    }
  } catch (err) {
    return { studio, jobs: [], manual: false, error: err instanceof Error ? err.message : String(err) };
  }
}
