import { eq } from "drizzle-orm";
import { buildOrderReference } from "@episto/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { createLogger } from "../../shared/logging/index.js";
import { type SendEmailJob } from "../../queue/index.js";
import { enqueueTransactionalEmail } from "../email/email-outbox.js";
import {
  issueOrderAccessToken,
  orderAccessGeneration,
} from "../orders/order-access-token.js";
import { downloadObjectBuffer } from "../files/adapters/s3.adapter.js";

const logger = createLogger("receipt-notifications");

/**
 * Why this email is being sent — which decides how long "already sent this" lasts.
 *
 * `capture` is the automatic receipt: exactly one per generation, forever, so a
 * replayed webhook cannot mail a second copy. `customer_request` is someone
 * pressing a button because the first one did not reach them, and it must not be
 * silenced by a key the capture receipt already claimed — that would make
 * "resend my link" a button that reports success and does nothing, which is
 * precisely the recovery path a customer needs when their link stopped working.
 */
export type ReceiptEmailTrigger = "capture" | "customer_request";

/**
 * A customer-requested resend is deduplicated only within the minute it was
 * asked for. Long enough to absorb a double-click or a retried request, short
 * enough that asking again later actually sends again. Volume beyond that is the
 * route's rate limit to worry about, not this key's.
 */
export function receiptDedupeKey(
  paymentAttemptId: string,
  generation: string,
  trigger: ReceiptEmailTrigger,
): string {
  const base = `payment-receipt-${paymentAttemptId}-${generation}`;
  if (trigger === "capture") return base;
  return `${base}-request-${new Date().toISOString().slice(0, 16)}`;
}

/**
 * Everything a `payment-receipt` email needs, or null when it cannot be built.
 *
 * Separated from the enqueue so a caller can prepare the email *before* opening
 * the transaction that will record it — this function reads several rows, mints
 * a token and may fetch a PDF from object storage, none of which belongs inside
 * an open transaction.
 *
 * Loads the payment attempt + session email + receipt row (for amounts and the
 * stored PDF key), issues an order-access token for the secure letter download
 * link, and attaches the receipt PDF. Returns null — not an error — if the
 * session has no email, if required rows are missing, or if the order-access
 * token is not available: none of those is a fault worth failing a capture over,
 * and all of them are logged.
 *
 * `pdfBuffer` lets the issuing path hand over the PDF it just rendered instead
 * of paying for a download of the object it uploaded moments ago.
 */
export async function buildPaymentReceiptEmail(
  db: Db,
  args: {
    paymentAttemptId: string;
    trigger?: ReceiptEmailTrigger;
    pdfBuffer?: Buffer | undefined;
  },
): Promise<{ dedupeKey: string; job: SendEmailJob } | null> {
  const [payment] = await db
    .select({
      id: schema.paymentAttempts.id,
      draftId: schema.paymentAttempts.draftId,
      sessionId: schema.paymentAttempts.sessionId,
      orderAccessTokenExpiresAt: schema.paymentAttempts.orderAccessTokenExpiresAt,
      orderAccessTokenHash: schema.paymentAttempts.orderAccessTokenHash,
    })
    .from(schema.paymentAttempts)
    .where(eq(schema.paymentAttempts.id, args.paymentAttemptId))
    .limit(1);

  if (!payment) {
    logger.warn(
      { paymentAttemptId: args.paymentAttemptId },
      "Receipt email: payment attempt not found",
    );
    return null;
  }

  const [receipt] = await db
    .select({
      receiptNumber: schema.receipts.receiptNumber,
      totalCents: schema.receipts.totalCents,
      currency: schema.receipts.currency,
      orderRef: schema.receipts.orderRef,
      storageKey: schema.receipts.storageKey,
    })
    .from(schema.receipts)
    .where(eq(schema.receipts.paymentAttemptId, args.paymentAttemptId))
    .limit(1);

  if (!receipt) {
    logger.warn(
      { paymentAttemptId: args.paymentAttemptId },
      "Receipt email: receipt row not found",
    );
    return null;
  }

  const [session] = await db
    .select({ email: schema.sessions.email, locale: schema.sessions.locale })
    .from(schema.sessions)
    .where(eq(schema.sessions.id, payment.sessionId))
    .limit(1);

  if (!session?.email) {
    logger.info(
      { paymentAttemptId: args.paymentAttemptId },
      "Receipt email: session has no email, skipping",
    );
    return null;
  }

  if (!payment.orderAccessTokenExpiresAt || !payment.orderAccessTokenHash) {
    logger.warn(
      { paymentAttemptId: args.paymentAttemptId },
      "Receipt email: no order-access token on the payment, skipping",
    );
    return null;
  }

  const config = env();
  const fallbackOrigin = config.CORS_ORIGIN.split(",")[0]?.trim();
  const siteUrl = config.APP_PUBLIC_URL ?? fallbackOrigin;
  if (!siteUrl) {
    logger.warn(
      { paymentAttemptId: args.paymentAttemptId },
      "Receipt email: no site URL, skipping",
    );
    return null;
  }

  const token = await issueOrderAccessToken({
    paymentAttemptId: payment.id,
    expiresAt: payment.orderAccessTokenExpiresAt,
    tokenHash: payment.orderAccessTokenHash,
  });

  const buffer =
    args.pdfBuffer ?? (await downloadObjectBuffer(receipt.storageKey)).buffer;

  const job: SendEmailJob = {
    to: session.email,
    template: "payment-receipt",
    locale: session.locale ?? "en-CH",
    data: {
      orderRef: receipt.orderRef || buildOrderReference(payment.draftId),
      totalCents: receipt.totalCents,
      currency: receipt.currency,
      downloadUrl: `${siteUrl}/api/v1/orders/${token}/pdf`,
      statementRetentionDays: config.STATEMENT_RETENTION_DAYS,
      appPublicUrl: siteUrl,
      brandName: config.APP_DISPLAY_NAME,
      supportEmail: config.SUPPORT_EMAIL,
      legalEntityName: config.LEGAL_ENTITY_NAME,
      legalEntityAddress: `${config.LEGAL_ENTITY_ADDRESS_LINE_1}, ${config.LEGAL_ENTITY_ADDRESS_LINE_2}`,
      legalEntityCountry: config.LEGAL_ENTITY_COUNTRY,
      legalEntityUidVat: config.LEGAL_ENTITY_UID_VAT,
    },
    attachments: [
      {
        filename: `receipt-${receipt.receiptNumber}.pdf`,
        contentBase64: buffer.toString("base64"),
      },
    ],
  };

  // The generation is part of the dedupe key, not just the payload. A plain
  // per-payment key would be deduplicated against the receipt already sent at
  // capture, so a customer who revoked their links would be told a new one was
  // on its way and never receive it — the worst possible outcome for the one
  // action they took to protect themselves.
  return {
    dedupeKey: receiptDedupeKey(
      args.paymentAttemptId,
      orderAccessGeneration(payment.orderAccessTokenHash),
      args.trigger ?? "capture",
    ),
    job,
  };
}

/**
 * Build and enqueue in one step, on the caller's own connection.
 *
 * This is the resend path — a customer pressing "send it again" — where the
 * business fact is the request itself and a failure simply means they press the
 * button once more. The capture path does not use this; see
 * issueReceiptForCapturedPayment, which records the promise in the same
 * transaction as the receipt row.
 */
export async function enqueuePaymentReceiptEmail(
  db: Db,
  args: { paymentAttemptId: string; trigger?: ReceiptEmailTrigger },
): Promise<void> {
  const email = await buildPaymentReceiptEmail(db, args);
  if (!email) return;
  await enqueueTransactionalEmail(db, email);
}

/**
 * Fire-and-forget wrapper: enqueue a receipt email without ever throwing into
 * the caller (the receipt/payment path). Failures are logged, not propagated.
 */
export function enqueuePaymentReceiptEmailSafe(
  db: Db,
  paymentAttemptId: string,
  trigger: ReceiptEmailTrigger = "capture",
): void {
  void enqueuePaymentReceiptEmail(db, { paymentAttemptId, trigger }).catch(
    (err: unknown) => {
      logger.error({ err, paymentAttemptId }, "Failed to enqueue payment receipt email");
    },
  );
}
