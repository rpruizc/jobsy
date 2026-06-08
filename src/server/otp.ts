import { randomInt, createHash, timingSafeEqual } from "node:crypto";
import { db } from "./db.js";

const TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

const hashCode = (code: string): string => createHash("sha256").update(code).digest("hex");

const upsert = db.prepare(`
  INSERT INTO login_codes (login_key, code_hash, expires_at, attempts, created_at)
  VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now','+${TTL_MINUTES} minutes'), 0,
          strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  ON CONFLICT(login_key) DO UPDATE SET
    code_hash  = excluded.code_hash,
    expires_at = excluded.expires_at,
    attempts   = 0,
    created_at = excluded.created_at
`);
const getRow = db.prepare("SELECT code_hash, expires_at, attempts FROM login_codes WHERE login_key = ?");
const bumpAttempts = db.prepare("UPDATE login_codes SET attempts = attempts + 1 WHERE login_key = ?");
const delRow = db.prepare("DELETE FROM login_codes WHERE login_key = ?");

/** Generate and store a fresh 6-digit code for a key; returns the plaintext. */
export function issueCode(key: string): string {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  upsert.run(key, hashCode(code));
  return code;
}

export type VerifyResult = "ok" | "invalid" | "expired" | "locked";

/** Check a code. Consumes it on success; counts attempts and locks after 5. */
export function verifyCode(key: string, code: string): VerifyResult {
  const row = getRow.get(key) as { code_hash: string; expires_at: string; attempts: number } | undefined;
  if (!row) return "invalid";
  if (row.attempts >= MAX_ATTEMPTS) {
    delRow.run(key);
    return "locked";
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    delRow.run(key);
    return "expired";
  }
  const a = Buffer.from(hashCode(code));
  const b = Buffer.from(row.code_hash);
  const match = a.length === b.length && timingSafeEqual(a, b);
  if (!match) {
    bumpAttempts.run(key);
    return "invalid";
  }
  delRow.run(key); // single-use
  return "ok";
}
