/**
 * Stripe refund reconciliation into the immutable payment_refunds ledger.
 *
 * The ledger — not payment_attempts.state — is the money source of truth.
 * State is derived after every sync. VAT is allocated CUMULATIVELY across a
 * payment's successful refunds (ordered by stripe_created_at, stripe_refund_id)
 * so many partials sum to exactly the original receipt VAT with no rounding
 * drift on a full refund.
 */
import { and, eq, sql } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import {
  listRefundsForCharge,
  type StripeRefundData,
} from "./adapters/stripe.adapter.js";
import { createLogger } from "../../shared/logging/index.js";
import { enqueueRefundConfirmedEmailSafe } from "./refund-notifications.js";

const logger = createLogger("refund-ledger");

export type DerivedPaymentState =
  | "captured"
  | "refund_pending"
  | "partially_refunded"
  | "refunded";

/** Derive the cached payment state from the original amount + the refund set. */
export function deriveRefundState(
  originalAmountCents: number,
  refunds: Array<{ status: string; amountCents: number }>,
): DerivedPaymentState {
  const successfulGross = refunds
    .filter((r) => r.status === "succeeded")
    .reduce((s, r) => s + r.amountCents, 0);
  const hasPending = refunds.some(
    (r) => r.status === "pending" || r.status === "requires_action",
  );
  if (hasPending) return "refund_pending";
  if (successfulGross >= originalAmountCents) return "refunded";
  if (successfulGross > 0) return "partially_refunded";
  return "captured";
}

/**
 * Cumulative VAT allocation for successful refunds. Input MUST already be sorted
 * by (stripe_created_at, stripe_refund_id). Returns net/vat per refund id.
 */
export function allocateRefundVat(
  successfulRefundsInOrder: Array<{ refundId: string; amountCents: number }>,
  receipt: { vatCents: number; vatRateBp: number },
): Map<string, { netCents: number; vatCents: number }> {
  const out = new Map<string, { netCents: number; vatCents: number }>();
  let runningGross = 0;
  let prevCumVat = 0;
  for (const r of successfulRefundsInOrder) {
    runningGross += r.amountCents;
    const cumVat = Math.min(
      receipt.vatCents,
      Math.round((runningGross * receipt.vatRateBp) / (10_000 + receipt.vatRateBp)),
    );
    const vatCents = cumVat - prevCumVat;
    out.set(r.refundId, { vatCents, netCents: r.amountCents - vatCents });
    prevCumVat = cumVat;
  }
  return out;
}

function sortRefunds(refunds: StripeRefundData[]): StripeRefundData[] {
  return [...refunds].sort((a, b) => {
    const t = a.stripeCreatedAt.getTime() - b.stripeCreatedAt.getTime();
    return t !== 0 ? t : a.refundId.localeCompare(b.refundId);
  });
}

/**
 * Reconcile ALL of a charge's refunds into the ledger and derive payment state.
 * Idempotent: safe to call from webhook, admin action, and reconciliation.
 * Returns the derived state, or null when the charge maps to no known payment.
 */
export async function syncRefundsForCharge(
  db: Db,
  chargeId: string,
): Promise<DerivedPaymentState | null> {
  const refunds = sortRefunds(await listRefundsForCharge(chargeId));

  /**
   * Refunds that crossed into `succeeded` during *this* sync, so the customer
   * is told once. Collected inside the transaction and sent after it commits:
   * an email enqueued from inside a transaction that later rolls back is a
   * message about money that never moved.
   */
  const newlySucceeded: Array<{ stripeRefundId: string; amountCents: number }> = [];
  let notifyPaymentId: string | null = null;

  const derived = await db.transaction(async (tx) => {
    const [payment] = await tx
      .select({
        id: schema.paymentAttempts.id,
        amountCents: schema.paymentAttempts.amountCents,
      })
      .from(schema.paymentAttempts)
      .where(eq(schema.paymentAttempts.stripeChargeId, chargeId))
      .for("update")
      .limit(1);

    if (!payment) {
      logger.warn({ chargeId }, "Refund sync: no payment matches charge — left unlinked");
      return null;
    }

    notifyPaymentId = payment.id;

    const priorStatus = new Map<string, string>();
    for (const row of await tx
      .select({
        stripeRefundId: schema.paymentRefunds.stripeRefundId,
        status: schema.paymentRefunds.status,
      })
      .from(schema.paymentRefunds)
      .where(eq(schema.paymentRefunds.paymentAttemptId, payment.id))) {
      priorStatus.set(row.stripeRefundId, row.status);
    }

    const [receipt] = await tx
      .select({
        vatCents: schema.receipts.vatCents,
        vatRateBp: schema.receipts.vatRateBp,
      })
      .from(schema.receipts)
      .where(eq(schema.receipts.paymentAttemptId, payment.id))
      .limit(1);

    const successful = refunds.filter((r) => r.status === "succeeded");
    const grossSuccessful = successful.reduce((s, r) => s + r.amountCents, 0);
    if (grossSuccessful > payment.amountCents) {
      logger.error(
        { chargeId, paymentId: payment.id, grossSuccessful, amount: payment.amountCents },
        "Refund sync: successful refunds exceed original amount — integrity alert",
      );
    }

    const allocation = receipt
      ? allocateRefundVat(
          successful.map((r) => ({ refundId: r.refundId, amountCents: r.amountCents })),
          receipt,
        )
      : new Map();

    for (const r of refunds) {
      const alloc = r.status === "succeeded" ? allocation.get(r.refundId) : undefined;
      const refundedAt = r.status === "succeeded" ? r.stripeCreatedAt : null;
      if (r.status === "succeeded" && priorStatus.get(r.refundId) !== "succeeded") {
        newlySucceeded.push({ stripeRefundId: r.refundId, amountCents: r.amountCents });
      }
      const failedAt = r.status === "failed" ? r.stripeCreatedAt : null;
      await tx
        .insert(schema.paymentRefunds)
        .values({
          paymentAttemptId: payment.id,
          stripeRefundId: r.refundId,
          stripeChargeId: r.chargeId || chargeId,
          stripeBalanceTransactionId: r.balanceTransactionId,
          amountCents: r.amountCents,
          currency: r.currency,
          status: r.status,
          refundNetCents: alloc?.netCents ?? null,
          refundVatCents: alloc?.vatCents ?? null,
          stripeFeeCents: r.feeCents,
          failureReason: r.failureReason,
          stripeCreatedAt: r.stripeCreatedAt,
          refundedAt,
          failedAt,
          lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schema.paymentRefunds.stripeRefundId,
          set: {
            // Immutable fields are never updated; refresh lifecycle + tax split.
            status: r.status,
            stripeBalanceTransactionId: r.balanceTransactionId,
            refundNetCents: alloc?.netCents ?? null,
            refundVatCents: alloc?.vatCents ?? null,
            stripeFeeCents: r.feeCents,
            failureReason: r.failureReason,
            // Set once, never move backward.
            refundedAt: sql`COALESCE(${schema.paymentRefunds.refundedAt}, ${refundedAt})`,
            failedAt: sql`COALESCE(${schema.paymentRefunds.failedAt}, ${failedAt})`,
            lastSyncedAt: new Date(),
            updatedAt: new Date(),
          },
        });
    }

    const derived = deriveRefundState(payment.amountCents, refunds);
    await tx
      .update(schema.paymentAttempts)
      .set({ state: derived, updatedAt: new Date() })
      .where(
        and(
          eq(schema.paymentAttempts.id, payment.id),
          // Never move a terminal `refunded` backward on a stale/out-of-order event.
          sql`${schema.paymentAttempts.state} <> 'refunded'`,
        ),
      );
    return derived;
  });

  if (notifyPaymentId) {
    for (const refund of newlySucceeded) {
      enqueueRefundConfirmedEmailSafe(db, {
        paymentAttemptId: notifyPaymentId,
        ...refund,
      });
    }
  }

  return derived;
}
