import type {
  AdminFinancialsPeriod,
  AdminPnlLine,
  AdminPnlWaterfall,
} from "@episto/shared";
import { computeReceiptAmounts } from "../payments/receipt-amounts.js";

// ---------------------------------------------------------------------------
// Financials (P&L) — pure helpers.
//
// Everything here is deterministic and DB-free so it can be unit-tested against
// fixtures. Time/period semantics mirror the dashboard: Europe/Zurich, trailing
// windows for today/7d/30d, plus calendar-month and year-to-date. All money is
// CHF cents. The P&L is assembled ONLY from frozen per-order values plus one
// manual input (monthly fixed opex).
// ---------------------------------------------------------------------------

export const FINANCIALS_TIMEZONE = "Europe/Zurich";

export function parseFinancialsPeriod(period: string | undefined): AdminFinancialsPeriod {
  switch (period) {
    case "today":
    case "7d":
    case "30d":
    case "month":
    case "ytd":
      return period;
    default:
      return "30d";
  }
}

/** Trend buckets: daily for short windows, weekly for the longer ones. */
export function trendGranularity(period: AdminFinancialsPeriod): "day" | "week" {
  return period === "ytd" ? "week" : "day";
}

/**
 * The current calendar month ("YYYY-MM") in Europe/Zurich for a given instant.
 * Used to key manual fixed-cost input; the actual period window may be wider or
 * narrower, but opex is always attributed to the anchor month.
 */
export function currentYearMonth(now: Date = new Date()): string {
  // en-CA gives YYYY-MM-DD; slice to YYYY-MM. timeZone keeps us on Zurich days.
  const ymd = now.toLocaleDateString("en-CA", { timeZone: FINANCIALS_TIMEZONE });
  return ymd.slice(0, 7);
}

const YEAR_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Validate a "YYYY-MM" string, returning it or undefined when malformed. */
export function normalizeYearMonth(value: unknown): string | undefined {
  return typeof value === "string" && YEAR_MONTH_RE.test(value) ? value : undefined;
}

/** VAT share of an arbitrary VAT-inclusive amount (e.g. a refund). */
export function vatShareCents(totalCents: number): number {
  return computeReceiptAmounts(Math.max(0, Math.round(totalCents))).vatCents;
}

export interface PnlInputs {
  grossRevenueCents: number;
  vatCents: number;
  /**
   * Total gross (VAT-inclusive) refunds for the window — what customers actually
   * got back. Shown on the "Refunds" line for cash context.
   */
  refundsGrossCents: number;
  /**
   * Net (ex-VAT) portion of those refunds. This is what reduces contribution:
   * net-after-refunds = net revenue − refundsNet. Subtracting the *gross* refund
   * from ex-VAT net revenue would double-count the refunded VAT. The refunded VAT
   * is reclaimed and nets against remitted VAT in the VAT section instead.
   */
  refundsNetCents: number;
  postageCostCents: number;
  /**
   * Payment fees for the period — the SUM of per-order Stripe fees, so the
   * headline CM1 reconciles exactly to the per-order/category CM1 sums (no
   * double-counting of the fixed component). Estimated until actual balance-
   * transaction fees are persisted.
   */
  paymentFeesCents: number;
  /** True while payment fees are the fallback estimate, not actual Stripe fees. */
  paymentFeesEstimated: boolean;
  /** Manual monthly fixed opex, or null when unset. */
  fixedOpexCents: number | null;
}

/**
 * Assemble the full P&L waterfall from aggregate frozen values. Callers pass the
 * summed per-order payment fees so CM1 = net − refunds − postage − Σfees matches
 * the per-order contribution used for the category breakdowns exactly. CM1/CM2
 * stay "estimated" until actual Stripe balance-transaction fees are persisted.
 */
export function buildPnl(inputs: PnlInputs): AdminPnlWaterfall {
  const grossRevenueCents = Math.round(inputs.grossRevenueCents);
  const vatCents = Math.round(inputs.vatCents);
  const netRevenueCents = grossRevenueCents - vatCents;
  const refundsGrossCents = Math.round(inputs.refundsGrossCents);
  const refundsNetCents = Math.round(inputs.refundsNetCents);
  // Contribution is an ex-VAT quantity: subtract the ex-VAT refund only.
  const netAfterRefundsCents = netRevenueCents - refundsNetCents;
  const postageCostCents = Math.round(inputs.postageCostCents);

  const feeEstimated = inputs.paymentFeesEstimated;
  const paymentFeesCents = Math.max(0, Math.round(inputs.paymentFeesCents));

  const contributionCm1Cents = netAfterRefundsCents - postageCostCents - paymentFeesCents;

  const adSpendCents = 0;
  const contributionCm2Cents = contributionCm1Cents - adSpendCents;

  const fixedOpexCents = inputs.fixedOpexCents;
  const operatingResultCents =
    fixedOpexCents == null ? null : contributionCm2Cents - fixedOpexCents;

  const cmLabel = feeEstimated ? "Contribution (est. CM1)" : "Contribution (CM1)";
  const cm2Label = feeEstimated ? "Contribution (est. CM2)" : "Contribution (CM2)";

  const lines: AdminPnlLine[] = [
    {
      key: "gross",
      label: "Gross revenue",
      amountCents: grossRevenueCents,
      kind: "revenue",
    },
    {
      key: "vat",
      label: "VAT (remitted)",
      amountCents: -vatCents,
      kind: "cost",
      note: "collected, not income",
    },
    { key: "net", label: "Net revenue", amountCents: netRevenueCents, kind: "subtotal" },
    {
      key: "refunds",
      label: "Refunds",
      amountCents: -refundsNetCents,
      kind: "cost",
      ...(refundsGrossCents > refundsNetCents
        ? { note: `CHF ${(refundsGrossCents / 100).toFixed(2)} gross incl. VAT` }
        : {}),
    },
    {
      key: "netAfterRefunds",
      label: "Net after refunds",
      amountCents: netAfterRefundsCents,
      kind: "subtotal",
    },
    {
      key: "postage",
      label: "Swiss Post postage",
      amountCents: -postageCostCents,
      kind: "cost",
      note: "pass-through COGS",
    },
    {
      key: "fees",
      label: "Payment fees",
      amountCents: -paymentFeesCents,
      kind: "cost",
      estimated: feeEstimated,
    },
    {
      key: "cm1",
      label: cmLabel,
      amountCents: contributionCm1Cents,
      kind: "result",
      estimated: feeEstimated,
    },
    {
      key: "adSpend",
      label: "Ad spend",
      amountCents: -adSpendCents,
      kind: "cost",
      note: "no campaigns yet",
    },
    {
      key: "cm2",
      label: cm2Label,
      amountCents: contributionCm2Cents,
      kind: "result",
      estimated: feeEstimated,
    },
    {
      key: "fixedOpex",
      label: "Fixed operating costs",
      amountCents: -(fixedOpexCents ?? 0),
      kind: "cost",
      unset: fixedOpexCents == null,
      ...(fixedOpexCents == null ? { note: "not entered for this month" } : {}),
    },
    {
      key: "operatingResult",
      label: "Operating result",
      amountCents: operatingResultCents ?? contributionCm2Cents,
      kind: "result",
      unset: operatingResultCents == null,
      estimated: feeEstimated,
    },
  ];

  return {
    grossRevenueCents,
    vatCents,
    netRevenueCents,
    refundsCents: refundsNetCents,
    netAfterRefundsCents,
    postageCostCents,
    paymentFeesCents,
    paymentFeesEstimated: feeEstimated,
    contributionCm1Cents,
    contributionEstimated: feeEstimated,
    adSpendCents,
    adSpendSource: "stub",
    contributionCm2Cents,
    fixedOpexCents,
    operatingResultCents,
    lines,
  };
}
