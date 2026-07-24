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
import { computeReceiptAmounts, formatReceiptNumber } from "./receipt-amounts.js";

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
  await uploadObject(storageKey, pdfBuffer, "application/pdf");

  await db
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
    .onConflictDoNothing({ target: schema.receipts.paymentAttemptId });
}
