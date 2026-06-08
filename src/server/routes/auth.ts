import { Router } from "express";
import { db } from "../db.js";
import { createSession, currentUser, destroySession, hashPassword, verifyPassword } from "../auth.js";
import { claimInvite, findUnusedInvite, hashCode } from "../invites.js";
import type { PublicUser } from "../../types.js";

export const authRouter = Router();

const findByEmail = db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?");
const insertUser = db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)");

// Very small in-memory throttle so login isn't trivially brute-forceable.
const attempts = new Map<string, { count: number; until: number }>();
function throttled(key: string): boolean {
  const rec = attempts.get(key);
  return rec ? rec.count >= 8 && Date.now() < rec.until : false;
}
function noteFailure(key: string): void {
  const rec = attempts.get(key) ?? { count: 0, until: 0 };
  rec.count += 1;
  rec.until = Date.now() + 15 * 60_000;
  attempts.set(key, rec);
}

function validCredentials(email: unknown, password: unknown): email is string {
  return (
    typeof email === "string" &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) &&
    typeof password === "string" &&
    password.length >= 8 &&
    password.length <= 200
  );
}

// Register requires a single-use invite code. The code is only consumed if the
// account is actually created — the whole thing runs in one transaction, so a
// failed signup (e.g. duplicate email) doesn't burn the invite.
const registerTxn = db.transaction((email: string, passwordHash: string, codeHash: string): number => {
  if (!findUnusedInvite.get(codeHash)) {
    throw Object.assign(new Error("invite"), { kind: "invite" });
  }
  const info = insertUser.run(email, passwordHash); // throws on duplicate email (UNIQUE)
  const userId = Number(info.lastInsertRowid);
  const claimed = claimInvite.run(userId, codeHash);
  if (claimed.changes !== 1) throw Object.assign(new Error("invite"), { kind: "invite" });
  return userId;
});

authRouter.post("/register", (req, res) => {
  const { email, password, invite } = req.body ?? {};
  if (!validCredentials(email, password)) {
    res.status(400).json({ error: "Enter a valid email and a password of at least 8 characters." });
    return;
  }
  if (typeof invite !== "string" || invite.trim() === "") {
    res.status(400).json({ error: "An invite code is required to sign up." });
    return;
  }
  const normEmail = email.toLowerCase();
  if (findByEmail.get(normEmail)) {
    res.status(409).json({ error: "That email is already registered." });
    return;
  }
  try {
    const userId = registerTxn(normEmail, hashPassword(password), hashCode(invite.trim()));
    createSession(res, userId);
    res.json({ user: { id: userId, email: normEmail } satisfies PublicUser });
  } catch (err) {
    if (err && typeof err === "object" && "kind" in err && err.kind === "invite") {
      res.status(403).json({ error: "Invalid or already-used invite code." });
      return;
    }
    if (err instanceof Error && /UNIQUE/.test(err.message)) {
      res.status(409).json({ error: "That email is already registered." });
      return;
    }
    res.status(500).json({ error: "Could not create account." });
  }
});

authRouter.post("/login", (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Email and password required." });
    return;
  }
  const normEmail = email.toLowerCase();
  if (throttled(normEmail)) {
    res.status(429).json({ error: "Too many attempts. Try again in 15 minutes." });
    return;
  }
  const row = findByEmail.get(normEmail) as { id: number; email: string; password_hash: string } | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) {
    noteFailure(normEmail);
    res.status(401).json({ error: "Wrong email or password." });
    return;
  }
  attempts.delete(normEmail);
  createSession(res, row.id);
  res.json({ user: { id: row.id, email: row.email } satisfies PublicUser });
});

authRouter.post("/logout", (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  res.json({ user: currentUser(req) });
});
