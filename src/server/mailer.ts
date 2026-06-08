import nodemailer from "nodemailer";

// SMTP is configured via env/secrets. With Gmail, use an App Password:
//   SMTP_HOST=smtp.gmail.com  SMTP_PORT=465  SMTP_USER=you@gmail.com
//   SMTP_PASS=<app-password>  MAIL_FROM="Jobsy <you@gmail.com>"
const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT ?? 465);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.MAIL_FROM ?? user ?? "jobsy@localhost";

export const mailerConfigured = Boolean(host && user && pass);

const transport = mailerConfigured
  ? nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
  : null;

/**
 * Email a sign-in code. When SMTP isn't configured (local dev), log the code to
 * the server console instead so the flow is still testable — the email address
 * is never logged.
 */
export async function sendLoginCode(email: string, code: string, key: string): Promise<void> {
  if (!transport) {
    console.log(`[dev: no SMTP] sign-in code for "${key}": ${code}`);
    return;
  }
  await transport.sendMail({
    from,
    to: email,
    subject: "Your Jobsy sign-in code",
    text: `Your Jobsy sign-in code is ${code}.\n\nIt expires in 10 minutes. If you didn't request this, you can ignore this email.`,
  });
}
