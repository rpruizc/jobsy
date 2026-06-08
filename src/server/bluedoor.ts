import type { Job, SearchParams, SearchResponse } from "../types.js";

const BASE = "https://api.bluedoor.sh/job-postings/v1";

// bluedoor records carry no clean employer name. The recognizable signal is the
// ATS slug in the source URL. We derive a best-effort label and humanize it;
// when the ATS hides the employer (ADP, Paylocity, etc.) we return null and the
// UI says "employer via {provider}".
const ATS_SLUG_PATTERNS: Array<{ test: RegExp; pick: (u: URL) => string | null }> = [
  { test: /greenhouse\.io$/, pick: (u) => u.pathname.split("/").filter(Boolean)[0] ?? null },
  { test: /lever\.co$/, pick: (u) => u.pathname.split("/").filter(Boolean)[0] ?? null },
  { test: /ashbyhq\.com$/, pick: (u) => u.pathname.split("/").filter(Boolean)[0] ?? null },
  { test: /smartrecruiters\.com$/, pick: (u) => u.pathname.split("/").filter(Boolean)[0] ?? null },
  { test: /\.bamboohr\.com$/, pick: (u) => u.hostname.split(".")[0] ?? null },
  { test: /\.workable\.com$/, pick: (u) => u.hostname.split(".")[0] ?? null },
  { test: /\.breezy\.hr$/, pick: (u) => u.hostname.split(".")[0] ?? null },
  // Workday: the tenant subdomain is usually the company (nvidia.wd5.myworkdayjobs.com).
  { test: /myworkdayjobs\.com$/, pick: (u) => u.hostname.split(".")[0] ?? null },
];

// Providers whose URLs reliably carry an employer name. Used by "named only".
export const NAMED_PROVIDERS = ["greenhouse", "lever", "ashby", "smartrecruiters", "bamboohr"];

const GENERIC_SLUGS = new Set(["careers", "jobs", "job", "all", "en-us", "default"]);

function humanize(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function companyFromSource(sourceUrl: string | null | undefined): string | null {
  if (!sourceUrl) return null;
  let u: URL;
  try {
    u = new URL(sourceUrl);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  for (const { test, pick } of ATS_SLUG_PATTERNS) {
    if (test.test(host)) {
      const slug = pick(u);
      if (slug && !GENERIC_SLUGS.has(slug.toLowerCase()) && !/^[0-9a-f-]{20,}$/i.test(slug)) {
        return humanize(slug);
      }
    }
  }
  return null;
}

interface BluedoorJob {
  job_id: string;
  title: string;
  location_text?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  workplace_type?: string | null;
  employment_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  salary_period?: string | null;
  salary_raw?: string | null;
  source_url?: string | null;
  apply_url?: string | null;
  provider?: string | null;
  first_seen_at?: string | null;
  source_posted_at?: string | null;
}

function locationOf(j: BluedoorJob): string {
  if (j.location_text && j.location_text.trim()) return j.location_text.trim();
  const parts = [j.city, j.region, j.country].filter((x): x is string => Boolean(x && x.trim()));
  return parts.join(", ");
}

function normalize(j: BluedoorJob): Job {
  // Only show a company when we can identify the real employer. The provider
  // name (ADP, Oracle) is NOT the employer, so we leave it null and the UI says
  // "Employer not disclosed".
  const company = companyFromSource(j.source_url);
  return {
    id: j.job_id,
    title: j.title.trim(),
    company,
    location: locationOf(j),
    url: j.apply_url ?? j.source_url ?? "",
    workplaceType: j.workplace_type ?? null,
    employmentType: j.employment_type ?? null,
    salaryMin: j.salary_min ?? null,
    salaryMax: j.salary_max ?? null,
    salaryCurrency: j.salary_currency ?? null,
    salaryPeriod: j.salary_period ?? null,
    salaryRaw: j.salary_raw ?? null,
    firstSeenAt: j.first_seen_at ?? null,
    postedAt: j.source_posted_at ?? null,
  };
}

/**
 * Translate our SearchParams into bluedoor query params. An explicit
 * `firstSeenAfter` (used to fetch the "new since you last looked" set) takes
 * precedence over the postedWithinHours filter.
 */
function toQuery(params: SearchParams, extra: Record<string, string> = {}, firstSeenAfter?: string): URLSearchParams {
  const q = new URLSearchParams({ status: "active", ...extra });
  if (params.q) q.set("q", params.q);
  if (params.location) q.set("location", params.location);
  if (params.workplaceType) q.set("workplace_type", params.workplaceType);
  if (params.employmentType) q.set("employment_type", params.employmentType);
  if (params.salaryMin) q.set("salary_min", String(params.salaryMin));

  const since =
    firstSeenAfter ??
    (params.postedWithinHours
      ? new Date(Date.now() - params.postedWithinHours * 3600_000).toISOString()
      : undefined);
  if (since) q.set("first_seen_after", since);
  return q;
}

async function fetchJobs(q: URLSearchParams): Promise<{ jobs: BluedoorJob[]; total: number | null; next: string | null }> {
  const res = await fetch(`${BASE}/jobs/search?${q}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`bluedoor search HTTP ${res.status}`);
  const body = (await res.json()) as {
    data?: BluedoorJob[];
    meta?: { total_matching?: number; next_cursor?: string };
  };
  return { jobs: body.data ?? [], total: body.meta?.total_matching ?? null, next: body.meta?.next_cursor ?? null };
}

export async function search(params: SearchParams, cursor?: string, sinceIso?: string): Promise<SearchResponse> {
  // "Named employers only": query each name-bearing provider in parallel and
  // merge by freshness. Sidesteps the ATSes that hide the employer.
  if (params.namedOnly) {
    const batches = await Promise.all(
      NAMED_PROVIDERS.map((provider) =>
        fetchJobs(toQuery(params, { provider, limit: "20" }, sinceIso)).catch(() => ({ jobs: [], total: 0, next: null })),
      ),
    );
    const seen = new Set<string>();
    const merged = batches
      .flatMap((b) => b.jobs)
      .map(normalize)
      .filter((j) => j.company && !seen.has(j.id) && seen.add(j.id))
      .sort((a, b) => (b.firstSeenAt ?? "").localeCompare(a.firstSeenAt ?? ""));
    // Cap per company so one high-volume poster (often a staffing agency) can't
    // flood the freshness ranking.
    const perCompany = new Map<string, number>();
    const jobs: Job[] = [];
    for (const j of merged) {
      const key = j.company!.toLowerCase();
      const n = perCompany.get(key) ?? 0;
      if (n >= 4) continue;
      perCompany.set(key, n + 1);
      jobs.push(j);
      if (jobs.length >= 50) break;
    }
    const total = batches.reduce((n, b) => n + (b.total ?? 0), 0) || null;
    return { jobs, total, nextCursor: null };
  }

  const q = toQuery(params, { limit: "50", include_total: "true" }, sinceIso);
  if (cursor) q.set("cursor", cursor);
  const { jobs, total, next } = await fetchJobs(q);
  return { jobs: jobs.map(normalize), total, nextCursor: next };
}

async function countMatching(q: URLSearchParams): Promise<number> {
  const res = await fetch(`${BASE}/jobs/search?${q}`, { headers: { accept: "application/json" } });
  if (!res.ok) return 0;
  const body = (await res.json()) as { meta?: { total_matching?: number } };
  return body.meta?.total_matching ?? 0;
}

/**
 * How many jobs match these params and were first seen after `sinceIso`.
 * Mirrors the source set the user will actually see: when namedOnly is on, we
 * sum across the named providers instead of counting all sources.
 */
export async function countNewSince(params: SearchParams, sinceIso: string): Promise<number> {
  const base = { limit: "1", include_total: "true" };
  if (params.namedOnly) {
    const counts = await Promise.all(
      NAMED_PROVIDERS.map((provider) =>
        countMatching(toQuery(params, { ...base, provider }, sinceIso)).catch(() => 0),
      ),
    );
    return counts.reduce((a, b) => a + b, 0);
  }
  return countMatching(toQuery(params, base, sinceIso));
}
