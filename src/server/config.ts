// The login roster maps a short key (shown in the UI) to a recipient email
// (never sent to the client, never in the repo). Set it as a secret:
//   fly secrets set LOGIN_RECIPIENTS="R:a@x.com,D:b@x.com,H:c@x.com,P:d@x.com,G:e@x.com"
//
// Keys are the only thing the browser ever sees.
const recipients = new Map<string, string>();
for (const pair of (process.env.LOGIN_RECIPIENTS ?? "").split(",")) {
  const idx = pair.indexOf(":");
  if (idx === -1) continue;
  const key = pair.slice(0, idx).trim().toUpperCase();
  const email = pair.slice(idx + 1).trim();
  if (key && email) recipients.set(key, email);
}

/** The login keys to show in the picker (e.g. ["R","D","H","P","G"]). */
export const loginKeys = [...recipients.keys()];

export const loginConfigured = recipients.size > 0;

/** Resolve a login key to its email. Undefined if the key isn't on the roster. */
export function emailForKey(key: string): string | undefined {
  return recipients.get(key.trim().toUpperCase());
}

export function authSummary(): string {
  return loginConfigured
    ? `email sign-in for ${recipients.size} key(s): ${loginKeys.join(", ")}`
    : "LOCKED — set LOGIN_RECIPIENTS to enable sign-in";
}
