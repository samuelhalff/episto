import { describe, expect, it } from "vitest";
import {
  computeOrderContributionCents,
  estimateStripeFeeCents,
} from "../src/modules/payments/order-economics.js";

describe("order economics — CM1", () => {
  it("estimates the Stripe fee as 2.9% + CHF 0.30", () => {
    expect(estimateStripeFeeCents(455)).toBe(Math.round(455 * 0.029) + 30); // 13 + 30 = 43
    expect(estimateStripeFeeCents(915)).toBe(Math.round(915 * 0.029) + 30); // 27 + 30 = 57
    expect(estimateStripeFeeCents(0)).toBe(0);
  });

  it("computes CM1 for a standard letter from frozen values (estimated fee)", () => {
    // Standard CHF 4.55: postage 165, markup 290. VAT-inclusive.
    const cm = computeOrderContributionCents({
      totalCents: 455,
      providerQuotedCents: 165,
    });
    expect(cm.vatCents).toBe(Math.round(455 * (0.081 / 1.081))); // 34
    expect(cm.netCents).toBe(455 - cm.vatCents); // 421
    expect(cm.feeEstimated).toBe(true);
    expect(cm.stripeFeeCents).toBe(43);
    // 421 - 165 - 43 = 213
    expect(cm.contributionCents).toBe(cm.netCents - 165 - 43);
    expect(cm.contributionCents).toBe(213);
  });

  it("uses the actual Stripe fee when provided and flags it non-estimated", () => {
    const cm = computeOrderContributionCents({
      totalCents: 915,
      providerQuotedCents: 625,
      actualStripeFeeCents: 61,
    });
    expect(cm.feeEstimated).toBe(false);
    expect(cm.stripeFeeCents).toBe(61);
    expect(cm.contributionCents).toBe(cm.netCents - 625 - 61);
  });

  it("excludes VAT from contribution (VAT is remitted, not kept)", () => {
    const cm = computeOrderContributionCents({
      totalCents: 455,
      providerQuotedCents: 165,
    });
    // contribution must never include the VAT component
    expect(cm.contributionCents).toBe(
      cm.totalCents - cm.vatCents - 165 - cm.stripeFeeCents,
    );
  });

  it("handles a free (fully-discounted) order as zero revenue / negative or zero CM1", () => {
    const cm = computeOrderContributionCents({ totalCents: 0, providerQuotedCents: 165 });
    expect(cm.vatCents).toBe(0);
    expect(cm.netCents).toBe(0);
    expect(cm.stripeFeeCents).toBe(0);
    // free order still incurs postage cost → negative contribution
    expect(cm.contributionCents).toBe(-165);
  });

  it("can produce negative CM1 (guards against 'revenue = profit')", () => {
    const cm = computeOrderContributionCents({
      totalCents: 455,
      providerQuotedCents: 400,
    });
    expect(cm.contributionCents).toBeLessThan(0);
  });
});
