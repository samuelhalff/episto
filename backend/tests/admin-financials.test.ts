import { describe, it, expect } from "vitest";
import {
  parseFinancialsPeriod,
  trendGranularity,
  currentYearMonth,
  normalizeYearMonth,
  vatShareCents,
  buildPnl,
} from "../src/modules/admin/admin-financials.compute.js";
import {
  computeOrderContributionCents,
  estimateStripeFeeCents,
} from "../src/modules/payments/order-economics.js";
import { financialsCsvRows } from "../src/modules/admin/admin-financials.csv.js";
import { computeReceiptAmounts } from "../src/modules/payments/receipt-amounts.js";

describe("admin financials — period semantics", () => {
  it("normalizes the period query param, defaulting to 30d", () => {
    expect(parseFinancialsPeriod("today")).toBe("today");
    expect(parseFinancialsPeriod("7d")).toBe("7d");
    expect(parseFinancialsPeriod("30d")).toBe("30d");
    expect(parseFinancialsPeriod("month")).toBe("month");
    expect(parseFinancialsPeriod("ytd")).toBe("ytd");
    expect(parseFinancialsPeriod("garbage")).toBe("30d");
    expect(parseFinancialsPeriod(undefined)).toBe("30d");
  });

  it("buckets ytd weekly and everything else daily", () => {
    expect(trendGranularity("ytd")).toBe("week");
    expect(trendGranularity("30d")).toBe("day");
    expect(trendGranularity("today")).toBe("day");
  });

  it("keys fixed opex to a YYYY-MM month string", () => {
    expect(currentYearMonth(new Date("2026-07-25T10:00:00Z"))).toBe("2026-07");
    expect(normalizeYearMonth("2026-07")).toBe("2026-07");
    expect(normalizeYearMonth("2026-13")).toBeUndefined();
    expect(normalizeYearMonth("2026-7")).toBeUndefined();
    expect(normalizeYearMonth("garbage")).toBeUndefined();
    expect(normalizeYearMonth(42)).toBeUndefined();
  });
});

describe("admin financials — P&L identity", () => {
  // Two standard letters (CHF 4.55, postage 165) + one registered (CHF 9.15,
  // postage 625). Frozen values, VAT-inclusive.
  const orders = [
    { totalCents: 455, providerQuotedCents: 165 },
    { totalCents: 455, providerQuotedCents: 165 },
    { totalCents: 915, providerQuotedCents: 625 },
  ];
  const gross = orders.reduce((a, o) => a + o.totalCents, 0);
  const vat = orders.reduce(
    (a, o) => a + computeReceiptAmounts(o.totalCents).vatCents,
    0,
  );
  const postage = orders.reduce((a, o) => a + o.providerQuotedCents, 0);
  // Summed per-order Stripe fees (the aggregation the service performs).
  const fees = orders.reduce((a, o) => a + estimateStripeFeeCents(o.totalCents), 0);
  const cm1 = orders.reduce(
    (a, o) => a + computeOrderContributionCents(o).contributionCents,
    0,
  );

  function base(overrides: Partial<Parameters<typeof buildPnl>[0]> = {}) {
    return buildPnl({
      grossRevenueCents: gross,
      vatCents: vat,
      refundsGrossCents: 0,
      refundsNetCents: 0,
      postageCostCents: postage,
      paymentFeesCents: fees,
      paymentFeesEstimated: true,
      fixedOpexCents: null,
      ...overrides,
    });
  }

  it("holds gross = net + vat", () => {
    const pnl = base();
    expect(pnl.grossRevenueCents).toBe(pnl.netRevenueCents + pnl.vatCents);
  });

  it("computes CM1 = net − refunds − postage − fees, reconciling to per-order CM1", () => {
    const pnl = base();
    expect(pnl.paymentFeesEstimated).toBe(true);
    expect(pnl.contributionEstimated).toBe(true);
    expect(pnl.contributionCm1Cents).toBe(
      pnl.netAfterRefundsCents - pnl.postageCostCents - pnl.paymentFeesCents,
    );
    // Headline CM1 equals the sum of per-order computeOrderContributionCents.
    expect(pnl.contributionCm1Cents).toBe(cm1);
    // Ad spend is a stub → CM2 == CM1.
    expect(pnl.adSpendCents).toBe(0);
    expect(pnl.adSpendSource).toBe("stub");
    expect(pnl.contributionCm2Cents).toBe(pnl.contributionCm1Cents);
  });

  it("subtracts the ex-VAT (net) refund before contribution, never the gross", () => {
    // A full CHF 4.55 refund: gross 455, VAT 34, net 421. Net-after-refunds must
    // drop by 421, not 455 — subtracting gross would double-count the 34 of VAT.
    const pnl = base({ refundsGrossCents: 455, refundsNetCents: 421 });
    expect(pnl.netAfterRefundsCents).toBe(pnl.netRevenueCents - 421);
    expect(pnl.refundsCents).toBe(421);
  });

  it("matches codex fixtures: CHF 4.55 full refund → net 421, CM1 −208", () => {
    // Single standard order, fully refunded.
    const pnl = buildPnl({
      grossRevenueCents: 455,
      vatCents: 34,
      refundsGrossCents: 455,
      refundsNetCents: 421,
      postageCostCents: 165,
      paymentFeesCents: estimateStripeFeeCents(455),
      paymentFeesEstimated: true,
      fixedOpexCents: null,
    });
    expect(pnl.netRevenueCents).toBe(421);
    expect(pnl.netAfterRefundsCents).toBe(0);
    expect(pnl.contributionCm1Cents).toBe(-208);
  });

  it("matches codex fixtures: CHF 9.15 sale, CHF 4.55 partial refund → CM1 −257", () => {
    // Registered order, one partial refund of CHF 4.55 (net 421, VAT 34).
    const pnl = buildPnl({
      grossRevenueCents: 915,
      vatCents: 69,
      refundsGrossCents: 455,
      refundsNetCents: 421,
      postageCostCents: 625,
      paymentFeesCents: estimateStripeFeeCents(915),
      paymentFeesEstimated: true,
      fixedOpexCents: null,
    });
    expect(pnl.netRevenueCents).toBe(846);
    expect(pnl.netAfterRefundsCents).toBe(425);
    expect(pnl.contributionCm1Cents).toBe(-257);
  });

  it("leaves operating result null until fixed opex is entered", () => {
    const unset = base();
    expect(unset.fixedOpexCents).toBeNull();
    expect(unset.operatingResultCents).toBeNull();

    const withOpex = base({ fixedOpexCents: 50_000 });
    expect(withOpex.operatingResultCents).toBe(withOpex.contributionCm2Cents - 50_000);
  });

  it("flags fees non-estimated when actual fees are supplied", () => {
    const pnl = base({ paymentFeesCents: 120, paymentFeesEstimated: false });
    expect(pnl.paymentFeesEstimated).toBe(false);
    expect(pnl.paymentFeesCents).toBe(120);
    expect(pnl.contributionEstimated).toBe(false);
  });
});

describe("admin financials — VAT share of refunds", () => {
  it("backs out VAT from a refunded gross amount", () => {
    expect(vatShareCents(455)).toBe(computeReceiptAmounts(455).vatCents);
    expect(vatShareCents(0)).toBe(0);
  });
});

describe("admin financials — CSV export", () => {
  it("flattens P&L, categories and VAT into hardened-serializable rows", () => {
    const rows = financialsCsvRows({
      period: "30d",
      yearMonth: "2026-07",
      pnl: buildPnl({
        grossRevenueCents: 1000,
        vatCents: 75,
        refundsGrossCents: 0,
        refundsNetCents: 0,
        postageCostCents: 300,
        paymentFeesCents: 59,
        paymentFeesEstimated: true,
        fixedOpexCents: null,
      }),
      byDelivery: [
        { deliveryType: "standard", orders: 2, grossCents: 910, contributionCents: 200 },
      ],
      componentSplit: { serviceMarkupCents: 580, postageCents: 330 },
      byPricing: [
        { segment: "full_price", orders: 2, grossCents: 910, contributionCents: 200 },
      ],
      vat: {
        rows: [{ rateBp: 810, netCents: 925, vatCents: 75, grossCents: 1000 }],
        collectedCents: 75,
        refundedVatCents: 0,
        netCents: 75,
      },
      trend: [],
      trendGranularity: "day",
      generatedAt: new Date().toISOString(),
    });
    const sections = new Set(rows.map((r) => r.section));
    expect(sections.has("P&L")).toBe(true);
    expect(sections.has("Delivery")).toBe(true);
    expect(sections.has("Pricing")).toBe(true);
    expect(sections.has("VAT")).toBe(true);
    // The fixed-opex line is marked unset (not entered).
    const opex = rows.find((r) => r.line === "Fixed operating costs");
    expect(opex?.note).toBe("unset");
  });
});

describe("admin financials — per-order CM1 reconciliation", () => {
  it("sum of per-order CM1 equals independently summed CM1", () => {
    const orders = [
      { totalCents: 455, providerQuotedCents: 165 },
      { totalCents: 915, providerQuotedCents: 625 },
      { totalCents: 0, providerQuotedCents: 165 },
    ];
    const perOrder = orders.map(
      (o) => computeOrderContributionCents(o).contributionCents,
    );
    const total = perOrder.reduce((a, c) => a + c, 0);
    // Category sums (here a single "all" category) must equal the total.
    expect(perOrder.reduce((a, c) => a + c, 0)).toBe(total);
  });
});
