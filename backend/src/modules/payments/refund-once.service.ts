import type { Db } from "../../db/index.js";
import { createLogger } from "../../shared/logging/index.js";
import {
  createRefund,
  listRefundsForCharge,
  type StripeRefundData,
} from "./adapters/stripe.adapter.js";
import { syncRefundsForCharge } from "./refund-ledger.service.js";

const logger = createLogger("refund-once");

/**
 * One idempotency namespace for every full refund of a payment.
 *
 * There used to be two — `dispatch-reject-refund:` for the automatic path and
 * `admin-full-refund:` for the manual one. Different keys mean Stripe treats
 * them as different requests, so a support agent retrying a refund the dispatch
 * worker had already made would have created a second one. The user's money is
 * only refunded once; ours would have gone out twice.
 */
function fullRefundKey(paymentAttemptId: string): string {
  return `full-refund:${paymentAttemptId}`;
}

export interface RefundOnceInput {
  paymentAttemptId: string;
  stripePaymentIntentId: string;
  stripeChargeId: string | null;
  reason: string;
  metadata?: Record<string, string>;
}

export interface RefundOnceResult {
  refund: StripeRefundData | null;
  alreadyRefunded: boolean;
}

/**
 * Refund a payment in full, at most once, from any caller.
 *
 * A shared idempotency key covers a retry within Stripe's 24-hour window. Past
 * that the key is gone, so Stripe itself is asked first: it is the ledger of
 * record, and a charge that already carries a refund must never be refunded
 * again — our own `payment_attempts.state` is not enough, because the failure
 * that leaves it reading `captured` after a successful Stripe refund is exactly
 * the failure a human then retries.
 */
export async function refundPaymentOnce(
  db: Db,
  input: RefundOnceInput,
): Promise<RefundOnceResult> {
  if (input.stripeChargeId) {
    const existing = await listRefundsForCharge(input.stripeChargeId);
    if (existing.length > 0) {
      logger.warn(
        {
          paymentAttemptId: input.paymentAttemptId,
          refundCount: existing.length,
        },
        "Refund requested for a charge Stripe has already refunded; re-syncing instead of refunding again",
      );
      try {
        await syncRefundsForCharge(db, input.stripeChargeId);
      } catch (err) {
        // The ledger projection can be caught up by the webhook. What matters
        // here is that we did not create a second refund.
        logger.error(
          {
            paymentAttemptId: input.paymentAttemptId,
            err: err instanceof Error ? err.message : "Unknown error",
          },
          "Failed to re-sync an already-refunded charge",
        );
      }
      return { refund: existing[0] ?? null, alreadyRefunded: true };
    }
  }

  const refund = await createRefund(input.stripePaymentIntentId, {
    reason: input.reason,
    idempotencyKey: fullRefundKey(input.paymentAttemptId),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });

  return { refund, alreadyRefunded: false };
}
