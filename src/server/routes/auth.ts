import { Router } from "express";
import { createSession, currentUser, destroySession, getOrCreateUser } from "../auth.js";
import { emailForKey, loginKeys } from "../config.js";
import { issueCode, verifyCode } from "../otp.js";
import { sendLoginCode } from "../mailer.js";

export const authRouter = Router();

// Rate-limit code requests per key so the picker can't be used to spam inboxes.
const recentRequests = new Map<string, number[]>();
function tooManyRequests(key: string): boolean {
  const now = Date.now();
  const window = (recentRequests.get(key) ?? []).filter((t) => now - t < 15 * 60_000);
  window.push(now);
  recentRequests.set(key, window);
  return window.length > 5;
}

// The browser only ever learns the keys, never the emails behind them.
authRouter.get("/options", (_req, res) => {
  res.json({ options: loginKeys });
});

authRouter.post("/request-code", async (req, res) => {
  const key = String(req.body?.key ?? "").trim().toUpperCase();
  const email = emailForKey(key);
  if (!email) {
    res.status(400).json({ error: "Pick a valid option." });
    return;
  }
  if (tooManyRequests(key)) {
    res.status(429).json({ error: "Too many code requests. Try again in a little while." });
    return;
  }
  const code = issueCode(key);
  try {
    await sendLoginCode(email, code, key);
  } catch (err) {
    // Log the underlying reason (e.g. Resend rejection) without leaking it.
    console.error(`sendLoginCode failed for "${key}":`, err instanceof Error ? err.message : err);
    res.status(502).json({ error: "Couldn't send the code right now. Try again." });
    return;
  }
  res.json({ ok: true });
});

authRouter.post("/verify-code", (req, res) => {
  const key = String(req.body?.key ?? "").trim().toUpperCase();
  const code = String(req.body?.code ?? "").trim();
  if (!emailForKey(key)) {
    res.status(400).json({ error: "Pick a valid option." });
    return;
  }
  const result = verifyCode(key, code);
  if (result !== "ok") {
    const error =
      result === "expired"
        ? "That code expired — request a new one."
        : result === "locked"
          ? "Too many wrong tries — request a new code."
          : "Wrong code.";
    res.status(401).json({ error });
    return;
  }
  const userId = getOrCreateUser(key);
  createSession(res, userId);
  res.json({ user: { id: userId, key } });
});

authRouter.post("/logout", (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  res.json({ user: currentUser(req) });
});
