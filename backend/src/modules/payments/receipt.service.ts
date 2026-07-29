import { eq, sql } from "drizzle-orm";
import { buildOrderReference, PaymentBreakdownSchema } from "@episto/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { createLogger } from "../../shared/logging/index.js";
import {
  renderReceiptDocumentHtml,
  type ReceiptLineItem,
  type ReceiptLocale,
} from "../rendering/receipt-document.js";
import { renderPdfBufferFromHtml } from "../rendering/render.service.js";
import { uploadObject } from "../files/adapters/s3.adapter.js";
import { withOrphanCleanup } from "../files/file.service.js";
import { computeReceiptAmounts, formatReceiptNumber } from "./receipt-amounts.js";
import {
  dispatchRecordedEmail,
  recordTransactionalEmail,
} from "../email/email-outbox.js";
import { buildPaymentReceiptEmail } from "./receipt-notifications.js";

const logger = createLogger("receipt-service");

function receiptStorageKey(paymentAttemptId: string): string {
  return `receipts/${paymentAttemptId}.pdf`;
}

/**
 * Issue an immutable Swiss VAT receipt for a captured payment attempt.
 *
 * Idempotent: if a receipt row already exists for the payment attempt this is a
 * no-op. Defensive: designed to be fire-and-forget from the payment/webhook
 * flow — it swallows nothing itself (callers `.catch`/try-catch and log), but is
 * written so a receipt failure never corrupts the payment state. The receipt PDF
 * is stored referenced only by the `receipts` table + its S3 key (NOT a
 * `file_assets` row) so it survives retention cleanup indefinitely.
 */
/**
 * Fire-and-forget, idempotent receipt issuance from a capture point. Never
 * throws into the payment flow — a receipt failure is logged, not propagated.
 */
export function issueReceiptSafe(db: Db, paymentAttemptId: string): void {
  void issueReceiptForCapturedPayment(db, paymentAttemptId).catch((err: unknown) => {
    logger.error(
      { err, paymentAttemptId },
      "Failed to issue receipt for captured payment",
    );
  });
}

export async function issueReceiptForCapturedPayment(
  db: Db,
  paymentAttemptId: string,
): Promise<void> {
  // Idempotency: never issue a second receipt for the same payment attempt.
  const [existing] = await db
    .select({ id: schema.receipts.id })
    .from(schema.receipts)
    .where(eq(schema.receipts.paymentAttemptId, paymentAttemptId))
    .limit(1);
  if (existing) {
    return;
  }

  const [payment] = await db
    .select({
      id: schema.paymentAttempts.id,
      draftId: schema.paymentAttempts.draftId,
      amountCents: schema.paymentAttempts.amountCents,
      currency: schema.paymentAttempts.currency,
      breakdown: schema.paymentAttempts.breakdown,
      stripePaymentIntentId: schema.paymentAttempts.stripePaymentIntentId,
    })
    .from(schema.paymentAttempts)
    .where(eq(schema.paymentAttempts.id, paymentAttemptId))
    .limit(1);

  if (!payment) {
    logger.error({ paymentAttemptId }, "Cannot issue receipt: payment attempt not found");
    return;
  }

  const [draft] = await db
    .select({
      deliveryType: schema.draftLetters.deliveryType,
      locale: schema.draftLetters.locale,
    })
    .from(schema.draftLetters)
    .where(eq(schema.draftLetters.id, payment.draftId))
    .limit(1);

  const locale = (draft?.locale ?? "de-CH") as ReceiptLocale;
  const deliveryType = draft?.deliveryType ?? null;

  const parsedBreakdown = PaymentBreakdownSchema.safeParse(payment.breakdown);
  const breakdown = parsedBreakdown.success ? parsedBreakdown.data : null;

  const discountCents = breakdown?.promo?.discountCents ?? 0;
  const promoCode = breakdown?.promo?.code ?? null;

  const amounts = computeReceiptAmounts(payment.amountCents, discountCents);

  const lineItems: ReceiptLineItem[] = (breakdown?.lineItems ?? []).map((item) => ({
    label: item.label,
    amountCents: item.amountCents,
  }));

  // Reserve the next sequential receipt number.
  const numberResult = await db.execute<{ nextval: string }>(
    sql`SELECT nextval('receipt_number_seq') AS nextval`,
  );
  const sequence = Number(numberResult.rows[0]?.nextval ?? 0);
  const receiptNumber = formatReceiptNumber(sequence);

  const config = env();
  const orderRef = buildOrderReference(payment.draftId);

  const html = renderReceiptDocumentHtml({
    locale,
    receiptNumber,
    issuedAt: new Date(),
    orderRef,
    currency: payment.currency,
    netCents: amounts.netCents,
    vatCents: amounts.vatCents,
    totalCents: amounts.totalCents,
    discountCents,
    promoCode,
    deliveryType,
    // Method omitted rather than guessed: a Stripe intent may be card, TWINT or
    // Link, and misstating it on a receipt is worse than leaving it off (it is
    // not a legally required field). Populate with the real charge method later.
    paymentMethod: null,
    lineItems,
    legalEntity: {
      name: config.LEGAL_ENTITY_NAME,
      addressLine1: config.LEGAL_ENTITY_ADDRESS_LINE_1,
      addressLine2: config.LEGAL_ENTITY_ADDRESS_LINE_2,
      country: config.LEGAL_ENTITY_COUNTRY,
      uidVat: config.LEGAL_ENTITY_UID_VAT,
    },
    supportEmail: config.SUPPORT_EMAIL,
  });

  const { pdfBuffer } = await renderPdfBufferFromHtml(html, {
    margins: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
  });

  const storageKey = receiptStorageKey(paymentAttemptId);

  // Receipts are deliberately outside `file_assets`, so the orphan sweep never
  // touches the `receipts/` prefix — which means a PDF written without its row
  // would be kept forever with nothing pointing at it. Compensate here instead.
  //
  // The receipt row and the promise to email it are ONE commit. This is not
  // tidiness: the row is also the idempotency guard at the top of this
  // function, so if the two committed separately and the process died between
  // them, every retry — including Stripe's webhook redelivery — would find the
  // receipt and return immediately. The customer would be permanently owed
  // their VAT receipt and the order-access link that is their only route back
  // to the letter they paid for, with nothing anywhere recording the debt.
  // Either both exist, or neither does and the retry genuinely re-runs.
  const recorded = await withOrphanCleanup(db, storageKey, logger, async () => {
    await uploadObject(storageKey, pdfBuffer, "application/pdf");

    return db.transaction(async (tx) => {
      const inserted = await tx
        .insert(schema.receipts)
        .values({
          paymentAttemptId,
          receiptNumber,
          netCents: amounts.netCents,
          vatCents: amounts.vatCents,
          totalCents: amounts.totalCents,
          vatRateBp: amounts.vatRateBp,
          currency: payment.currency,
          discountCents,
          promoCode,
          deliveryType,
          orderRef,
          storageKey,
        })
        .onConflictDoNothing({ target: schema.receipts.paymentAttemptId })
        .returning({ id: schema.receipts.id });

      // A concurrent racer that lost the onConflictDoNothing gets no row back
      // and must not promise a second email.
      if (inserted.length === 0) return null;

      // Built inside the transaction because it reads the receipt row that was
      // only just inserted. Everything it does here is cheap and local: four
      // indexed reads and an HMAC signature. The one part that is not — reading
      // the PDF back out of object storage — is skipped by handing it the
      // buffer we rendered a moment ago.
      const email = await buildPaymentReceiptEmail(tx, {
        paymentAttemptId,
        pdfBuffer,
      });
      // Null means the email cannot be addressed at all (no session email, no
      // order-access token). The receipt itself is still owed and still
      // commits; buildPaymentReceiptEmail has logged why.
      if (!email) return null;

      return await recordTransactionalEmail(tx, email);
    });
  });

  // Committed. Only now may the job exist — a worker that picked it up before
  // the commit would look up an outbox id that is not there yet, and one that
  // picked it up after a rollback would look up an id that never will be.
  //
  // A failure here is the ordinary case the outbox was built for: the row is
  // `pending`, the stall sweep re-drives it, and the operator sees it on
  // /admin/email-outbox in the meantime. It must not propagate into the
  // payment flow.
  if (recorded) {
    try {
      await dispatchRecordedEmail(recorded);
    } catch (err) {
      logger.error(
        { err, paymentAttemptId, outboxId: recorded.outboxId },
        "Receipt email was recorded but could not be queued; the stall sweep will re-drive it",
      );
    }
  }
}
