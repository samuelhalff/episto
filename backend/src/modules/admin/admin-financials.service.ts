import { sql, type SQL } from "drizzle-orm";
import { getDb, type Db } from "../../db/index.js";
import type {
  AdminFinancialsPeriod,
  AdminFinancialsResponse,
  AdminFinancialsDeliveryRow,
  AdminFinancialsPricingRow,
  AdminFinancialsVatRow,
  AdminFinancialsTrendPoint,
  AdminFixedCostsResponse,
} from "@episto/shared";
import { computeOrderContributionCents } from "../payments/order-economics.js";
import { num } from "./admin-dashboard.compute.js";
import {
  FINANCIALS_TIMEZONE,
  buildPnl,
  currentYearMonth,
  trendGranularity,
  vatShareCents,
} from "./admin-financials.compute.js";

export {
  parseFinancialsPeriod,
  currentYearMonth,
  normalizeYearMonth,
  buildPnl,
  vatShareCents,
} from "./admin-financials.compute.js";

/**
 * Half-open [start, end) window for a financials period in Europe/Zurich.
 * today/7d/30d are trailing windows ending "now"; month is the current calendar
 * month; ytd is Jan 1 of the current year — both anchored in Zurich local time.
 */
function periodWindow(period: AdminFinancialsPeriod): { start: SQL; end: SQL } {
  const end = sql`NOW()`;
  switch (period) {
    case "today":
      return { start: sql`NOW() - make_interval(days => 1)`, end };
    case "7d":
      return { start: sql`NOW() - make_interval(days => 7)`, end };
    case "30d":
      return { start: sql`NOW() - make_interval(days => 30)`, end };
    case "month":
      return {
        start: sql`date_trunc('month', NOW() AT TIME ZONE ${FINANCIALS_TIMEZONE}) AT TIME ZONE ${FINANCIALS_TIMEZONE}`,
        end,
      };
    case "ytd":
    default:
      return {
        start: sql`date_trunc('year', NOW() AT TIME ZONE ${FINANCIALS_TIMEZONE}) AT TIME ZONE ${FINANCIALS_TIMEZONE}`,
        end,
      };
  }
}

// ---------------------------------------------------------------------------
// Fixed operating costs (manual monthly input)
// ---------------------------------------------------------------------------

export async function fixedCostsData(
  yearMonth: string,
  db: Db = getDb(),
): Promise<AdminFixedCostsResponse> {
  const rows = await db.execute<{
    amount_cents: number;
    note: string | null;
    updated_at: string;
  }>(sql`
    SELECT amount_cents, note, updated_at::text AS updated_at
    FROM monthly_fixed_costs WHERE year_month = ${yearMonth}
  `);
  const row = rows.rows[0];
  return {
    yearMonth,
    amountCents: row ? num(row.amount_cents) : null,
    note: row?.note ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}

export async function setFixedCosts(
  input: {
    yearMonth: string;
    amountCents: number;
    note: string | null;
  },
  db: Db = getDb(),
): Promise<AdminFixedCostsResponse> {
  await db.execute(sql`
    INSERT INTO monthly_fixed_costs (year_month, amount_cents, note, updated_at)
    VALUES (${input.yearMonth}, ${input.amountCents}, ${input.note}, NOW())
    ON CONFLICT (year_month) DO UPDATE
      SET amount_cents = EXCLUDED.amount_cents,
          note = EXCLUDED.note,
          updated_at = NOW()
  `);
  return fixedCostsData(input.yearMonth, db);
}

// ---------------------------------------------------------------------------
// P&L
//
// One pass over captured orders (joined to their frozen receipt) is aggregated
// in JS so every contribution figure — the headline CM1, per-delivery,
// per-segment, and per-bucket — is the exact SUM of per-order
// computeOrderContributionCents. Category CM1s therefore reconcile to the total
// with no rounding drift (plan §9: trustworthy money above all).
// ---------------------------------------------------------------------------

interface CapturedOrderRow extends Record<string, unknown> {
  total_cents: number;
  provider_quoted_cents: number;
  markup_cents: number;
  net_cents: number;
  delivery_type: string | null;
  promo_code: string | null;
  discount_cents: number;
  bucket: string;
}

function pricingSegment(row: CapturedOrderRow): "full_price" | "promo" | "free" {
  if (num(row.total_cents) === 0) return "free";
  if (row.promo_code != null || num(row.discount_cents) > 0) return "promo";
  return "full_price";
}

export async function financialsData(
  period: AdminFinancialsPeriod,
  db: Db = getDb(),
): Promise<AdminFinancialsResponse> {
  const { start, end } = periodWindow(period);
  const yearMonth = currentYearMonth();
  const gran = trendGranularity(period);
  const bucketExpr =
    gran === "week"
      ? sql`to_char(date_trunc('week', (p.updated_at AT TIME ZONE ${FINANCIALS_TIMEZONE})), 'YYYY-MM-DD')`
      : sql`to_char((p.updated_at AT TIME ZONE ${FINANCIALS_TIMEZONE})::date, 'YYYY-MM-DD')`;

  const [totals, refundsAgg, orders, fixedRow] = await Promise.all([
    // Frozen receipt totals for the window (gross/vat by rate). This is the
    // authoritative revenue basis and includes every captured order's receipt.
    db.execute<{ rate_bp: number; net: number; vat: number; gross: number }>(sql`
      SELECT vat_rate_bp AS rate_bp,
             COALESCE(SUM(net_cents), 0)::int AS net,
             COALESCE(SUM(vat_cents), 0)::int AS vat,
             COALESCE(SUM(total_cents), 0)::int AS gross
      FROM receipts WHERE created_at >= ${start} AND created_at < ${end}
      GROUP BY vat_rate_bp
      ORDER BY vat_rate_bp
    `),
    // Actual refunded amounts, reported by refund date (plan §9).
    db.execute<{ refunds: number }>(sql`
      SELECT COALESCE(SUM(amount_cents), 0)::int AS refunds FROM payment_attempts
      WHERE state IN ('refunded', 'partially_refunded')
        AND updated_at >= ${start} AND updated_at < ${end}
    `),
    // One row per captured order with its frozen breakdown + receipt segment.
    db.execute<CapturedOrderRow>(sql`
      SELECT
        COALESCE((p.breakdown->>'totalCents')::int, p.amount_cents) AS total_cents,
        COALESCE((p.breakdown->>'providerQuotedCents')::int, 0) AS provider_quoted_cents,
        COALESCE((p.breakdown->>'swissMailMarkupCents')::int, 0) AS markup_cents,
        COALESCE(r.net_cents, 0) AS net_cents,
        r.delivery_type AS delivery_type,
        r.promo_code AS promo_code,
        COALESCE(r.discount_cents, 0) AS discount_cents,
        ${bucketExpr} AS bucket
      FROM payment_attempts p
      LEFT JOIN receipts r ON r.payment_attempt_id = p.id
      WHERE p.state = 'captured' AND p.updated_at >= ${start} AND p.updated_at < ${end}
    `),
    db.execute<{ amount_cents: number }>(sql`
      SELECT amount_cents FROM monthly_fixed_costs WHERE year_month = ${yearMonth}
    `),
  ]);

  const vatByRate: AdminFinancialsVatRow[] = totals.rows.map((r) => ({
    rateBp: num(r.rate_bp),
    netCents: num(r.net),
    vatCents: num(r.vat),
    grossCents: num(r.gross),
  }));
  const grossRevenueCents = vatByRate.reduce((a, r) => a + r.grossCents, 0);
  const vatCents = vatByRate.reduce((a, r) => a + r.vatCents, 0);
  const refundsCents = num(refundsAgg.rows[0]?.refunds);

  // Single pass over captured orders → exact per-order CM1 aggregation.
  let postageCostCents = 0;
  let paymentFeesCents = 0;
  let paymentFeesEstimated = false;
  let markupCents = 0;
  const delivery = new Map<string, { orders: number; gross: number; cm1: number }>();
  const pricing = new Map<string, { orders: number; gross: number; cm1: number }>();
  const trendMap = new Map<string, { net: number; cm1: number }>();

  for (const row of orders.rows) {
    const totalCents = num(row.total_cents);
    const providerQuotedCents = num(row.provider_quoted_cents);
    const contribution = computeOrderContributionCents({
      totalCents,
      providerQuotedCents,
    });
    const cm1 = contribution.contributionCents;

    postageCostCents += providerQuotedCents;
    paymentFeesCents += contribution.stripeFeeCents;
    if (contribution.feeEstimated) paymentFeesEstimated = true;
    markupCents += num(row.markup_cents);

    const dt = row.delivery_type === "registered" ? "registered" : "standard";
    const dAgg = delivery.get(dt) ?? { orders: 0, gross: 0, cm1: 0 };
    dAgg.orders += 1;
    dAgg.gross += totalCents;
    dAgg.cm1 += cm1;
    delivery.set(dt, dAgg);

    const seg = pricingSegment(row);
    const pAgg = pricing.get(seg) ?? { orders: 0, gross: 0, cm1: 0 };
    pAgg.orders += 1;
    pAgg.gross += totalCents;
    pAgg.cm1 += cm1;
    pricing.set(seg, pAgg);

    const tAgg = trendMap.get(row.bucket) ?? { net: 0, cm1: 0 };
    tAgg.net += num(row.net_cents);
    tAgg.cm1 += cm1;
    trendMap.set(row.bucket, tAgg);
  }

  const fixedOpexCents =
    fixedRow.rows.length > 0 ? num(fixedRow.rows[0]?.amount_cents) : null;

  const pnl = buildPnl({
    grossRevenueCents,
    vatCents,
    refundsCents,
    postageCostCents,
    paymentFeesCents,
    paymentFeesEstimated: orders.rows.length === 0 ? true : paymentFeesEstimated,
    fixedOpexCents,
  });

  const byDelivery: AdminFinancialsDeliveryRow[] = (
    ["standard", "registered"] as const
  ).flatMap((dt) => {
    const agg = delivery.get(dt);
    if (!agg) return [];
    return {
      deliveryType: dt,
      orders: agg.orders,
      grossCents: agg.gross,
      contributionCents: agg.cm1,
    };
  });

  const byPricing: AdminFinancialsPricingRow[] = (
    ["full_price", "promo", "free"] as const
  ).flatMap((seg) => {
    const agg = pricing.get(seg);
    if (!agg) return [];
    return {
      segment: seg,
      orders: agg.orders,
      grossCents: agg.gross,
      contributionCents: agg.cm1,
    };
  });

  const trend: AdminFinancialsTrendPoint[] = [...trendMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([bucket, agg]) => ({
      date: bucket,
      netRevenueCents: agg.net,
      contributionCents: agg.cm1,
      // Fixed opex is a single monthly figure, not distributable per bucket, so
      // per-bucket operating result stays null (the headline result carries it).
      operatingResultCents: null,
    }));

  const refundedVatCents = vatShareCents(refundsCents);

  return {
    period,
    yearMonth,
    pnl,
    byDelivery,
    componentSplit: {
      serviceMarkupCents: markupCents,
      postageCents: postageCostCents,
    },
    byPricing,
    vat: {
      rows: vatByRate,
      collectedCents: vatCents,
      refundedVatCents,
      netCents: vatCents - refundedVatCents,
    },
    trend,
    trendGranularity: gran,
    generatedAt: new Date().toISOString(),
  };
}
