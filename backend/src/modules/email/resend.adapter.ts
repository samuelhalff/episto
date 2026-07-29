import { Resend } from "resend";
import { env } from "../../shared/config/index.js";

let _resend: Resend | undefined;

function getResend(): Resend {
  if (_resend) return _resend;
  _resend = new Resend(env().RESEND_API_KEY);
  return _resend;
}

/**
 * Resend's idempotency keys are capped at 256 characters. A key we cannot send
 * is worth less than the email: dropping it costs us one duplicate-send window,
 * whereas passing it costs an `invalid_idempotency_key` — a permanent error,
 * which would fail the email outright over a bookkeeping detail.
 */
const MAX_IDEMPOTENCY_KEY_LENGTH = 256;

/**
 * A provider rejection, carrying the one thing the caller actually needs to
 * decide: is another attempt worth making?
 *
 * The adapter used to collapse Resend's structured error into a bare `Error`,
 * so an address the provider will *never* accept was retried for the queue's
 * full ~4h15m budget before anyone was told. Retry budget is for outages, not
 * for payloads that are wrong.
 */
export class EmailProviderError extends Error {
  /** True when retrying cannot help — the request itself is the problem. */
  readonly permanent: boolean;
  /** Resend's error code (`validation_error`, `rate_limit_exceeded`, …). */
  readonly providerCode: string | undefined;

  constructor(
    message: string,
    options: { permanent: boolean; providerCode?: string | undefined },
  ) {
    super(message);
    this.name = "EmailProviderError";
    this.permanent = options.permanent;
    this.providerCode = options.providerCode;
  }
}

/**
 * Resend error codes where another attempt cannot change the outcome.
 *
 * Codes and their HTTP statuses are taken from the installed SDK's
 * `RESEND_ERROR_CODES_BY_KEY` (resend 4.8.0) — 400/401/403/404/405/422 plus
 * the one 409 that means "this key was already used with a *different* body",
 * which will keep meaning that forever.
 *
 * Anything not listed here — including codes a future Resend adds — is treated
 * as retryable on purpose. Mistaking a transient failure for a permanent one
 * loses a customer's email; mistaking a permanent one for transient only wastes
 * queue time, and the cumulative attempt cap in the outbox stops that too.
 */
const PERMANENT_PROVIDER_ERROR_CODES: ReadonlySet<string> = new Set([
  "invalid_idempotency_key", // 400
  "invalid_idempotent_request", // 409 — same key, different payload
  "missing_api_key", // 401
  "invalid_api_Key", // 403 (sic — the SDK spells it this way)
  "invalid_from_address", // 403
  "validation_error", // 403
  "not_found", // 404
  "method_not_allowed", // 405
  "missing_required_field", // 422
  "invalid_access", // 422
  "invalid_parameter", // 422 — bad recipient, bad attachment
  "invalid_region", // 422
]);

/** Retryable unless the provider named a reason that will not change. */
export function isPermanentEmailError(err: unknown): boolean {
  return err instanceof EmailProviderError && err.permanent;
}

export interface TransactionalEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | undefined;
  /**
   * Passed to Resend as `Idempotency-Key`. Resend remembers it for 24h and
   * returns the original result instead of sending again, which closes the
   * window where we hand the email over and then crash before recording it.
   */
  idempotencyKey?: string | undefined;
  attachments?:
    | Array<{
        filename: string;
        content: Buffer | string;
        contentType?: string | undefined;
      }>
    | undefined;
}

/**
 * Send a transactional email via Resend.
 * Returns the Resend message ID on success.
 *
 * Throws `EmailProviderError` for anything Resend reports as a structured
 * error. Transport failures (DNS, sockets, aborted fetches) propagate as-is and
 * are therefore treated as retryable, which is what they are.
 */
export async function sendEmail(email: TransactionalEmail): Promise<string> {
  const config = env();
  const resend = getResend();
  const formattedFrom = `${config.APP_DISPLAY_NAME} <${config.EMAIL_FROM}>`;
  const attachments = email.attachments?.map((attachment) => ({
    filename: attachment.filename,
    content: attachment.content,
    ...(attachment.contentType ? { contentType: attachment.contentType } : {}),
  }));

  const idempotencyKey =
    email.idempotencyKey && email.idempotencyKey.length <= MAX_IDEMPOTENCY_KEY_LENGTH
      ? email.idempotencyKey
      : undefined;

  const result = await resend.emails.send(
    {
      from: formattedFrom,
      to: email.to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      replyTo: email.replyTo ?? config.SUPPORT_EMAIL,
      ...(attachments ? { attachments } : {}),
    },
    idempotencyKey ? { idempotencyKey } : {},
  );

  if (result.error) {
    const code = result.error.name as string | undefined;
    throw new EmailProviderError(
      `Resend API error: ${result.error.name} — ${result.error.message}`,
      {
        permanent: code !== undefined && PERMANENT_PROVIDER_ERROR_CODES.has(code),
        providerCode: code,
      },
    );
  }

  return result.data?.id ?? "unknown";
}
