import { eq } from "drizzle-orm";
import { buildOrderReference } from "@episto/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { createLogger } from "../../shared/logging/index.js";
import { getQueue, QUEUE_NAMES, type SendEmailJob } from "../../queue/index.js";
import { issueOrderAccessToken } from "../orders/order-access-token.js";
import { downloadObjectBuffer } from "../files/adapters/s3.adapter.js";

const logger = createLogger("receipt-notifications");

/**
 * Build the context + attachment and enqueue a `payment-receipt` email for a
 * captured payment attempt.
 *
 * Loads the payment attempt + session email + receipt row (for amounts and the
 * stored PDF key), issues an order-access token for the secure letter download
 * link, downloads the receipt PDF from S3 and attaches it. Returns without
 * enqueuing if the session has no email, if required rows are missing, or if the
 * order-access token is not available.
 */
export async function enqueuePaymentReceiptEmail(
  db: Db,
  args: { paymentAttemptId: string },
): Promise<void> {
  const [payment] = await db
    .select({
      id: schema.paymentAttempts.id,
      draftId: schema.paymentAttempts.draftId,
      sessionId: schema.paymentAttempts.sessionId,
      orderAccessTokenExpiresAt: schema.paymentAttempts.orderAccessTokenExpiresAt,
    })
    .from(schema.paymentAttempts)
    .where(eq(schema.paymentAttempts.id, args.paymentAttemptId))
    .limit(1);

  if (!payment) {
    logger.warn(
      { paymentAttemptId: args.paymentAttemptId },
      "Receipt email: payment attempt not found",
    );
    return;
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
    return;
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
    return;
  }

  if (!payment.orderAccessTokenExpiresAt) {
    logger.warn(
      { paymentAttemptId: args.paymentAttemptId },
      "Receipt email: no order-access token expiry, skipping",
    );
    return;
  }

  const config = env();
  const fallbackOrigin = config.CORS_ORIGIN.split(",")[0]?.trim();
  const siteUrl = config.APP_PUBLIC_URL ?? fallbackOrigin;
  if (!siteUrl) {
    logger.warn(
      { paymentAttemptId: args.paymentAttemptId },
      "Receipt email: no site URL, skipping",
    );
    return;
  }

  const token = await issueOrderAccessToken({
    paymentAttemptId: payment.id,
    expiresAt: payment.orderAccessTokenExpiresAt,
  });

  const { buffer } = await downloadObjectBuffer(receipt.storageKey);

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

  await getQueue(QUEUE_NAMES.SEND_EMAIL).add("payment-receipt", job, {
    jobId: `payment-receipt-${args.paymentAttemptId}`,
  });
}

/**
 * Fire-and-forget wrapper: enqueue a receipt email without ever throwing into
 * the caller (the receipt/payment path). Failures are logged, not propagated.
 */
export function enqueuePaymentReceiptEmailSafe(db: Db, paymentAttemptId: string): void {
  void enqueuePaymentReceiptEmail(db, { paymentAttemptId }).catch((err: unknown) => {
    logger.error({ err, paymentAttemptId }, "Failed to enqueue payment receipt email");
  });
}
