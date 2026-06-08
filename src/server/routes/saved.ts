import { Router, type Response } from "express";
import { db } from "../db.js";
import { requireUser } from "../auth.js";
import { countNewSince, search } from "../bluedoor.js";
import { parseSearchParams } from "../searchParams.js";
import type { PublicUser, SavedSearch, SearchParams } from "../../types.js";

export const savedRouter = Router();
savedRouter.use(requireUser);

const listStmt = db.prepare(
  "SELECT id, name, params_json, last_viewed_at, created_at FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC",
);
const insertStmt = db.prepare(
  "INSERT INTO saved_searches (user_id, name, params_json) VALUES (?, ?, ?)",
);
const getStmt = db.prepare("SELECT id, name, params_json, last_viewed_at FROM saved_searches WHERE id = ? AND user_id = ?");
const touchStmt = db.prepare(
  "UPDATE saved_searches SET last_viewed_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND user_id = ?",
);
const deleteStmt = db.prepare("DELETE FROM saved_searches WHERE id = ? AND user_id = ?");

interface Row {
  id: number;
  name: string;
  params_json: string;
  last_viewed_at: string;
  created_at?: string;
}

const user = (res: Response): PublicUser => res.locals.user as PublicUser;

// List saved searches, each with a "new since you last looked" count.
savedRouter.get("/", async (_req, res) => {
  const rows = listStmt.all(user(res).id) as Row[];
  const out = await Promise.all(
    rows.map(async (r): Promise<SavedSearch> => {
      const params = JSON.parse(r.params_json) as SearchParams;
      let newCount = 0;
      try {
        newCount = await countNewSince(params, r.last_viewed_at);
      } catch {
        /* leave at 0 if bluedoor is unreachable */
      }
      return {
        id: r.id,
        name: r.name,
        params,
        lastViewedAt: r.last_viewed_at,
        createdAt: r.created_at ?? r.last_viewed_at,
        newCount,
      };
    }),
  );
  res.json({ saved: out });
});

savedRouter.post("/", (req, res) => {
  const name = typeof req.body?.name === "string" ? req.body.name.trim().slice(0, 80) : "";
  if (!name) {
    res.status(400).json({ error: "Name your saved search." });
    return;
  }
  const params = parseSearchParams((req.body?.params ?? {}) as Record<string, unknown>);
  const info = insertStmt.run(user(res).id, name, JSON.stringify(params));
  res.json({ id: Number(info.lastInsertRowid) });
});

// Open a saved search: run it, return results split into new vs. the rest,
// then mark it viewed so the badge resets.
savedRouter.post("/:id/view", async (req, res) => {
  const row = getStmt.get(Number(req.params.id), user(res).id) as Row | undefined;
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const params = JSON.parse(row.params_json) as SearchParams;
  const since = row.last_viewed_at;
  try {
    // Fetch the general fresh list and the "new since you last looked" set
    // explicitly (the latter using first_seen_after so it's accurate, not a
    // re-sort of a sample). Dedupe the new ones out of the main list.
    const [all, fresh] = await Promise.all([search(params), search(params, undefined, since)]);
    const newJobs = fresh.jobs;
    const newIds = new Set(newJobs.map((j) => j.id));
    const jobs = all.jobs.filter((j) => !newIds.has(j.id));
    touchStmt.run(row.id, user(res).id);
    res.json({ name: row.name, params, since, newJobs, jobs, total: all.total });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Search failed" });
  }
});

savedRouter.delete("/:id", (req, res) => {
  deleteStmt.run(Number(req.params.id), user(res).id);
  res.json({ ok: true });
});
