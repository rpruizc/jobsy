import { Router } from "express";
import { requireUser } from "../auth.js";
import { search } from "../bluedoor.js";
import { parseSearchParams } from "../searchParams.js";

export const searchRouter = Router();

// Search is gated behind auth — this is a personal/account product, not a
// public crawl surface.
searchRouter.get("/", requireUser, async (req, res) => {
  const params = parseSearchParams(req.query as Record<string, unknown>);
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  try {
    const result = await search(params, cursor);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Search failed" });
  }
});
