/**
 * The email that tells a customer their money came back.
 *
 * The renderer for `refund-confirmed` existed for months with no caller: every
 * refund path — the Stripe webhook, the dispatch-failure settlement, the admin
 * refund action — moved money and said nothing. A silent refund reads to the
 * customer exactly like a silent charge, which is how support tickets and
 * chargebacks start.
 *
 * Sent per Stripe refund, not per payment: a payment can be refunded in several
 * parts, and each part is a separate movement the customer sees on their
 * statement.
 */
import { eq } from "drizzle-orm";
import { buildOrderReference } from "@episto/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { createLogger } from "../../shared/logging/index.js";
import { getQueue, QUEUE_NAMES, type SendEmailJob } from "../../queue/index.js";

const logger = createLogger("refund-notifications");

export async function enqueueRefundConfirmedEmail(
  db: Db,
  args: { paymentAttemptId: string; stripeRefundId: string; amountCents: number },
): Promise<void> {
  const [payment] = await db
    .select({
      draftId: schema.paymentAttempts.draftId,
      sessionId: schema.paymentAttempts.sessionId,
    })
    .from(schema.paymentAttempts)
    .where(eq(schema.paymentAttempts.id, args.paymentAttemptId))
    .limit(1);

  if (!payment) {
    logger.warn(args, "Refund email: payment attempt not found");
    return;
  }

  const [session] = await db
    .select({ email: schema.sessions.email, locale: schema.sessions.locale })
    .from(schema.sessions)
    .where(eq(schema.sessions.id, payment.sessionId))
    .limit(1);

  // A session erased under a data-deletion request has no email left. That is a
  // completed request, not a failure: skip quietly.
  if (!session?.email) {
    logger.info(args, "Refund email: no session email, skipping");
    return;
  }

  const [receipt] = await db
    .select({ orderRef: schema.receipts.orderRef })
    .from(schema.receipts)
    .where(eq(schema.receipts.paymentAttemptId, args.paymentAttemptId))
    .limit(1);

  const config = env();
  const siteUrl = config.APP_PUBLIC_URL ?? config.CORS_ORIGIN.split(",")[0]?.trim() ?? "";

  const job: SendEmailJob = {
    to: session.email,
    template: "refund-confirmed",
    locale: session.locale ?? "en-CH",
    data: {
      orderRef: receipt?.orderRef || buildOrderReference(payment.draftId),
      amount: (args.amountCents / 100).toFixed(2),
      appPublicUrl: siteUrl,
      brandName: config.APP_DISPLAY_NAME,
      supportEmail: config.SUPPORT_EMAIL,
      legalEntityName: config.LEGAL_ENTITY_NAME,
      legalEntityAddress: `${config.LEGAL_ENTITY_ADDRESS_LINE_1}, ${config.LEGAL_ENTITY_ADDRESS_LINE_2}`,
      legalEntityCountry: config.LEGAL_ENTITY_COUNTRY,
      legalEntityUidVat: config.LEGAL_ENTITY_UID_VAT,
    },
  };

  // Keyed on the Stripe refund id: the ledger sync is idempotent and runs again
  // on every webhook for the same charge, so the second belt to the ledger's
  // own transition check is a jobId that cannot produce a second send.
  await getQueue(QUEUE_NAMES.SEND_EMAIL).add("refund-confirmed", job, {
    jobId: `refund-confirmed-${args.stripeRefundId}`,
  });
}

/** Never let a notification failure roll back or throw into a money path. */
export function enqueueRefundConfirmedEmailSafe(
  db: Db,
  args: { paymentAttemptId: string; stripeRefundId: string; amountCents: number },
): void {
  void enqueueRefundConfirmedEmail(db, args).catch((err: unknown) => {
    logger.error({ err, ...args }, "Failed to enqueue refund confirmation email");
  });
}
