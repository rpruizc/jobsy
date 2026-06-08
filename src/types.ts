// Core data shapes for the radar.

/** Where a studio's jobs are fetched from. */
export type SourceKind = "greenhouse" | "lever" | "bamboohr" | "bluedoor" | "manual";

/**
 * A studio we watch. The board is keyed on its ATS (hiring platform), not the
 * company name — names are unreliable, the ATS slug is exact and stable.
 *
 * `manual` studios have no machine-readable feed wired up yet. The radar still
 * lists them so you know to check their careers page by hand, and so it's
 * obvious what's missing from automated coverage.
 */
export interface Studio {
  name: string;
  /** Home base, for your own reference. */
  hq: string;
  source:
    | { kind: "greenhouse"; account: string }
    | { kind: "lever"; account: string }
    | { kind: "bamboohr"; account: string }
    | { kind: "bluedoor"; sourceId: string }
    | { kind: "manual"; careersUrl: string };
}

/** A location bucket we compute ourselves — the APIs can't be trusted for this. */
export type LocationBucket = "seattle" | "remote" | "elsewhere" | "unknown";

/** A job posting, normalized across every source. */
export interface Job {
  /** Stable across runs: `${source}:${account}:${nativeId}`. Used to detect new jobs. */
  id: string;
  title: string;
  studio: string;
  url: string;
  locationText: string;
  bucket: LocationBucket;
  isSeattle: boolean;
  isRemote: boolean;
  department: string | null;
  /** ISO timestamp the studio posted it, when the source tells us. */
  postedAt: string | null;
  source: SourceKind;
  /** ISO timestamp we first saw it. Filled in by the store. */
  firstSeenAt: string;
  /** True if this run is the first time we've seen the job. */
  isNew: boolean;
}

/** What a fetcher returns before the store stamps first-seen / new. */
export type RawJob = Omit<Job, "firstSeenAt" | "isNew">;
