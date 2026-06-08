import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db.js";
import type { PublicUser } from "../types.js";

const SESSION_TTL_DAYS = 30;
const COOKIE = "jobsy_sid";

// --- Password hashing (scrypt, no external dependency) ---

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// --- Sessions: random token in the cookie, only its hash stored server-side ---

const sha256 = (s: string): string => createHash("sha256").update(s).digest("hex");

const insertSession = db.prepare(
  "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', ?))",
);
const findSession = db.prepare(
  `SELECT u.id, u.email FROM sessions s
   JOIN users u ON u.id = s.user_id
   WHERE s.id = ? AND s.expires_at > datetime('now')`,
);
const deleteSession = db.prepare("DELETE FROM sessions WHERE id = ?");

export function createSession(res: Response, userId: number): void {
  const token = randomBytes(32).toString("hex");
  insertSession.run(sha256(token), userId, `+${SESSION_TTL_DAYS} days`);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function destroySession(req: Request, res: Response): void {
  const token = req.cookies?.[COOKIE];
  if (token) deleteSession.run(sha256(token));
  res.clearCookie(COOKIE);
}

export function currentUser(req: Request): PublicUser | null {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  const row = findSession.get(sha256(token)) as PublicUser | undefined;
  return row ?? null;
}

/** Express middleware: 401 unless a valid session is present. */
export function requireUser(req: Request, res: Response, next: NextFunction): void {
  const user = currentUser(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in" });
    return;
  }
  res.locals.user = user;
  next();
}
