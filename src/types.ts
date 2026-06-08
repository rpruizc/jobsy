// Shared shapes across the server and the client.

/** A job posting, normalized from bluedoor into what the UI needs. */
export interface Job {
  id: string;
  title: string;
  /** Best-effort employer label derived from the ATS source URL (may be null). */
  company: string | null;
  location: string;
  url: string;
  workplaceType: string | null; // remote | hybrid | on_site
  employmentType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  salaryRaw: string | null;
  /** When bluedoor first saw the posting — our honest freshness signal. */
  firstSeenAt: string | null;
  /** When the employer says it was posted, if provided. */
  postedAt: string | null;
}

/** The filters a search accepts. Everything optional; empty = broad search. */
export interface SearchParams {
  q?: string;
  location?: string; // free-text city/region
  workplaceType?: string; // remote | hybrid | on_site
  employmentType?: string; // full_time | part_time | contract | internship | ...
  salaryMin?: number;
  /** Only jobs first seen within this many hours (freshness filter). */
  postedWithinHours?: number;
  /** Restrict to ATS sources that disclose the employer name. */
  namedOnly?: boolean;
}

export interface SearchResponse {
  jobs: Job[];
  total: number | null;
  nextCursor: string | null;
}

export interface PublicUser {
  id: number;
  /** The login letter (R/D/H/P/G) — the user's whole identity. */
  key: string;
}

export interface SavedSearch {
  id: number;
  name: string;
  params: SearchParams;
  lastViewedAt: string;
  createdAt: string;
  /** Count of jobs first seen since lastViewedAt — the "N new" badge. */
  newCount?: number;
}
