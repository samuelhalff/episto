import { Resend } from "resend";
import { env } from "../../shared/config/index.js";

let _resend: Resend | undefined;

function getResend(): Resend {
  if (_resend) return _resend;
  _resend = new Resend(env().RESEND_API_KEY);
  return _resend;
}

export interface TransactionalEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | undefined;
}

/**
 * Send a transactional email via Resend.
 * Returns the Resend message ID on success.
 */
export async function sendEmail(email: TransactionalEmail): Promise<string> {
  const config = env();
  const resend = getResend();

  const result = await resend.emails.send({
    from: config.EMAIL_FROM,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: email.replyTo ?? "support@swissmail.ch",
  });

  if (result.error) {
    throw new Error(
      `Resend API error: ${result.error.name} — ${result.error.message}`,
    );
  }

  return result.data?.id ?? "unknown";
}
