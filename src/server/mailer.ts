// Email delivery via Resend's HTTP API (https://resend.com). No SDK needed —
// just a key. Set as secrets:
//   fly secrets set RESEND_API_KEY=re_xxx MAIL_FROM="Jobsy <login@yourdomain.com>"
//
// The `from` address must be on a domain you've verified in Resend. For quick
// testing, Resend's "onboarding@resend.dev" works but only delivers to the
// email that owns the Resend account.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const from = process.env.MAIL_FROM ?? "Jobsy <onboarding@resend.dev>";

export const mailerConfigured = Boolean(RESEND_API_KEY);

/**
 * Email a sign-in code. When no Resend key is set (local dev), log the code to
 * the server console instead — the email address is never logged.
 */
export async function sendLoginCode(email: string, code: string, key: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.log(`[dev: no RESEND_API_KEY] sign-in code for "${key}": ${code}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your Jobsy sign-in code",
      text: `Your Jobsy sign-in code is ${code}.\n\nIt expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`resend ${res.status}: ${body.slice(0, 200)}`);
  }
}
