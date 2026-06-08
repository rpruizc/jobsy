import type { SearchParams } from "../types.js";

const WORKPLACE = new Set(["remote", "hybrid", "on_site"]);
const EMPLOYMENT = new Set([
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "internship",
  "per_diem",
  "volunteer",
]);

function str(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Build a clean SearchParams from untrusted query/body input. */
export function parseSearchParams(input: Record<string, unknown>): SearchParams {
  const params: SearchParams = {};
  const q = str(input.q);
  const location = str(input.location);
  const workplaceType = str(input.workplaceType);
  const employmentType = str(input.employmentType);
  const salaryMin = num(input.salaryMin);
  const postedWithinHours = num(input.postedWithinHours);
  const namedOnly = input.namedOnly === true || input.namedOnly === "true" || input.namedOnly === "1";

  if (q) params.q = q.slice(0, 200);
  if (location) params.location = location.slice(0, 100);
  if (workplaceType && WORKPLACE.has(workplaceType)) params.workplaceType = workplaceType;
  if (employmentType && EMPLOYMENT.has(employmentType)) params.employmentType = employmentType;
  if (salaryMin) params.salaryMin = salaryMin;
  if (postedWithinHours) params.postedWithinHours = Math.min(postedWithinHours, 24 * 90);
  if (namedOnly) params.namedOnly = true;
  return params;
}
