import { timingSafeEqual } from "node:crypto";

// The admin token is the master key for minting invite codes. Set it as a Fly
// secret so it stays out of the repo:
//   fly secrets set ADMIN_TOKEN="$(openssl rand -base64 24)"
//
// Registration is invite-only and fails closed: with no admin token, no invites
// can be minted, so nobody can sign up.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";

export const adminEnabled = ADMIN_TOKEN.length >= 16;

/** Constant-time check of an incoming admin token against the configured one. */
export function verifyAdminToken(token: string | undefined): boolean {
  if (!adminEnabled || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authSummary(): string {
  return adminEnabled
    ? "invite-only — mint codes via POST /api/admin/invites with the admin token"
    : "invite-only and LOCKED — set ADMIN_TOKEN to mint invite codes";
}
