import { randomBytes, createHash } from "node:crypto";
import { db } from "./db.js";

/** Invite codes are hashed before storage, same as passwords. */
export const hashCode = (code: string): string => createHash("sha256").update(code).digest("hex");

const insertInvite = db.prepare("INSERT INTO invites (code_hash, note) VALUES (?, ?)");
export const findUnusedInvite = db.prepare("SELECT id FROM invites WHERE code_hash = ? AND used_by IS NULL");
export const claimInvite = db.prepare(
  "UPDATE invites SET used_by = ?, used_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE code_hash = ? AND used_by IS NULL",
);

/** Mint a new single-use invite code (the plaintext is returned once). */
export function createInvite(note: string | null): string {
  const code = randomBytes(18).toString("base64url"); // 144 bits, URL-safe
  insertInvite.run(hashCode(code), note);
  return code;
}
