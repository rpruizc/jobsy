// Registration allowlist. Only emails listed in ALLOWED_EMAILS (comma-separated,
// case-insensitive) may create an account. Fail closed: if the variable is unset
// or empty, registration is disabled entirely.
//
// Set it as a Fly secret so the emails stay out of the repo:
//   fly secrets set ALLOWED_EMAILS="you@example.com,son@example.com"
const allowedEmails = new Set(
  (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export const registrationOpen = allowedEmails.size > 0;

export function isEmailAllowed(email: string): boolean {
  return allowedEmails.has(email.trim().toLowerCase());
}

export function allowlistSummary(): string {
  return registrationOpen
    ? `registration limited to ${allowedEmails.size} allowlisted email(s)`
    : "registration CLOSED (set ALLOWED_EMAILS to permit sign-ups)";
}
