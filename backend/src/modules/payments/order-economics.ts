/**
 * Per-order contribution margin (CM1) — the single source of truth.
 *
 * Metric contract (see docs/07-operations/admin-analytics-dashboard-plan.md §9):
 * CM1 is computed ONLY from values frozen per order at checkout — never from
 * mutable pricing constants — so historical economics can never be rewritten:
 *
 *   - `totalCents`          gross, VAT-inclusive amount actually charged
 *                           (post-promo) — `payment_attempts.breakdown.totalCents`
 *   - `providerQuotedCents` Swiss Post/ePost postage cost episto pays
 *                           — `payment_attempts.breakdown.providerQuotedCents`
 *   - `stripeFeeCents`      ACTUAL payment fee from the Stripe balance
 *                           transaction when available; otherwise an explicit,
 *                           effective-dated estimate (flagged `feeEstimated`).
 *
 * Definition:
 *   vat          = round(total * 0.081 / 1.081)      // Swiss VAT, inclusive
 *   net          = total - vat                        // revenue ex-VAT
 *   contribution = net - providerQuotedCents - stripeFeeCents
 *
 * VAT is excluded (it is remitted to the tax authority, not kept). This is a
 * per-CAPTURED-order figure; refunds are reported separately at the aggregate
 * level using actual refunded amounts — never netted into per-order CM1 here.
 *
 * Output is "estimated CM1" whenever `feeEstimated` is true. Label it as
 * estimated in any UI until the actual Stripe fee is persisted and reconciled.
 */
import { computeReceiptAmounts } from "./receipt-amounts.js";

// Stripe Switzerland standard card pricing, effective 2026-07 (fallback only —
// prefer the actual balance-transaction fee). Update deliberately if Stripe's
// published Swiss rate changes; the constant is only used when no actual fee is
// stored for an order.
export const STRIPE_FEE_ESTIMATE_BP = 290; // 2.9%
export const STRIPE_FEE_ESTIMATE_FIXED_CENTS = 30; // CHF 0.30

export function estimateStripeFeeCents(totalCents: number): number {
  if (totalCents <= 0) return 0;
  return (
    Math.round((totalCents * STRIPE_FEE_ESTIMATE_BP) / 10_000) +
    STRIPE_FEE_ESTIMATE_FIXED_CENTS
  );
}

export interface OrderContribution {
  totalCents: number;
  vatCents: number;
  netCents: number;
  providerQuotedCents: number;
  stripeFeeCents: number;
  /** True when stripeFeeCents is the fallback estimate, not the actual fee. */
  feeEstimated: boolean;
  /** CM1 in cents: net − postage − payment fee. May be negative. */
  contributionCents: number;
}

export function computeOrderContributionCents(input: {
  totalCents: number;
  providerQuotedCents: number;
  /** Actual Stripe fee (from the balance transaction) when known. */
  actualStripeFeeCents?: number | null;
}): OrderContribution {
  const totalCents = Math.max(0, Math.round(input.totalCents));
  const providerQuotedCents = Math.max(0, Math.round(input.providerQuotedCents));
  const { vatCents, netCents } = computeReceiptAmounts(totalCents);

  const feeEstimated =
    input.actualStripeFeeCents === undefined || input.actualStripeFeeCents === null;
  const stripeFeeCents = feeEstimated
    ? estimateStripeFeeCents(totalCents)
    : Math.max(0, Math.round(input.actualStripeFeeCents as number));

  const contributionCents = netCents - providerQuotedCents - stripeFeeCents;

  return {
    totalCents,
    vatCents,
    netCents,
    providerQuotedCents,
    stripeFeeCents,
    feeEstimated,
    contributionCents,
  };
}
