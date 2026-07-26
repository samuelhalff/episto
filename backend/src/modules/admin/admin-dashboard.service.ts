import { sql } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { dashboardFunnelData } from "./admin-dashboard.funnel.js";
import { loadExternalAnalytics } from "./admin-analytics.adapters.js";
import type {
  AdminDashboardPeriod,
  AdminDashboardResponse,
  AdminDashboardDailyPoint,
  AdminMoneyResponse,
  AdminFeedbackResponse,
  AdminRefundsResponse,
  AdminDispatchState,
} from "@episto/shared";
import {
  DASHBOARD_TIMEZONE,
  LOW_VOLUME_THRESHOLD,
  periodDays,
  buildMetric,
  buildFunnelSteps,
  dispatchSuccessRate,
  sumContributionCents,
  num,
  BREAKDOWN_TOTAL_SQL,
  BREAKDOWN_PROVIDER_SQL,
  type CapturedOrderRow,
} from "./admin-dashboard.compute.js";

// Re-export the shared surface so routes and tests import from one place.
export {
  parseDashboardPeriod,
  periodDays,
  buildMetric,
  buildFunnelSteps,
  dispatchSuccessRate,
  sumContributionCents,
  hardenCsvCell,
  serializeHardenedCsv,
  parsePositiveInt,
  pickEnum,
  LOW_VOLUME_THRESHOLD,
} from "./admin-dashboard.compute.js";
export {
  lettersData,
  LETTERS_CSV_COLUMNS,
  type LettersQuery,
} from "./admin-dashboard.letters.js";

export async function dashboardData(
  period: AdminDashboardPeriod,
): Promise<AdminDashboardResponse> {
  const db = getDb();
  const days = periodDays(period);
  const analyticsPromise = loadExternalAnalytics(env(), days);

  // Current window: (now - days, now]. Previous window: (now - 2*days, now - days].
  const curStart = sql`NOW() - make_interval(days => ${days})`;
  const prevStart = sql`NOW() - make_interval(days => ${days * 2})`;
  const prevEnd = curStart;

  const [
    funnelReport,
    lettersPaidCur,
    lettersPaidPrev,
    capturedCur,
    capturedPrev,
    receiptsCur,
    receiptsPrev,
    refundsCur,
    refundsPrev,
    dispatchCur,
    dispatchPrev,
    series,
    deliveryMix,
    alertRefunds,
    alertDispatch,
    alertFeedback,
  ] = await Promise.all([
    dashboardFunnelData(db, days),
    db.execute<{ count: number }>(sql`
      WITH latest AS (
        SELECT DISTINCT ON (draft_id) draft_id
        FROM payment_attempts
        WHERE state = 'captured' AND updated_at > ${curStart}
        ORDER BY draft_id, updated_at DESC, id DESC
      )
      SELECT COUNT(*)::int AS count FROM latest
    `),
    db.execute<{ count: number }>(sql`
      WITH latest AS (
        SELECT DISTINCT ON (draft_id) draft_id
        FROM payment_attempts
        WHERE state = 'captured' AND updated_at > ${prevStart} AND updated_at <= ${prevEnd}
        ORDER BY draft_id, updated_at DESC, id DESC
      )
      SELECT COUNT(*)::int AS count FROM latest
    `),
    db.execute<CapturedOrderRow>(sql`
      SELECT ${BREAKDOWN_TOTAL_SQL} AS total_cents,
             ${BREAKDOWN_PROVIDER_SQL} AS provider_quoted_cents
      FROM payment_attempts
      WHERE id IN (
        SELECT DISTINCT ON (draft_id) id FROM payment_attempts
        WHERE state = 'captured' AND updated_at > ${curStart}
        ORDER BY draft_id, updated_at DESC, id DESC
      )
    `),
    db.execute<CapturedOrderRow>(sql`
      SELECT ${BREAKDOWN_TOTAL_SQL} AS total_cents,
             ${BREAKDOWN_PROVIDER_SQL} AS provider_quoted_cents
      FROM payment_attempts
      WHERE id IN (
        SELECT DISTINCT ON (draft_id) id FROM payment_attempts
        WHERE state = 'captured' AND updated_at > ${prevStart} AND updated_at <= ${prevEnd}
        ORDER BY draft_id, updated_at DESC, id DESC
      )
    `),
    db.execute<{ gross: number; vat: number }>(sql`
      SELECT COALESCE(SUM(total_cents), 0)::int AS gross,
             COALESCE(SUM(vat_cents), 0)::int AS vat
      FROM receipts WHERE created_at > ${curStart}
    `),
    db.execute<{ gross: number }>(sql`
      SELECT COALESCE(SUM(total_cents), 0)::int AS gross
      FROM receipts WHERE created_at > ${prevStart} AND created_at <= ${prevEnd}
    `),
    db.execute<{ refunds: number }>(sql`
      SELECT COALESCE(SUM(amount_cents), 0)::int AS refunds FROM payment_attempts
      WHERE state IN ('refunded', 'partially_refunded') AND updated_at > ${curStart}
    `),
    db.execute<{ refunds: number }>(sql`
      SELECT COALESCE(SUM(amount_cents), 0)::int AS refunds FROM payment_attempts
      WHERE state IN ('refunded', 'partially_refunded')
        AND updated_at > ${prevStart} AND updated_at <= ${prevEnd}
    `),
    db.execute<Record<AdminDispatchState, number>>(sql`
      SELECT
        COUNT(*) FILTER (WHERE state = 'accepted')::int AS accepted,
        COUNT(*) FILTER (WHERE state = 'reconciled')::int AS reconciled,
        COUNT(*) FILTER (WHERE state = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE state = 'unknown')::int AS unknown,
        COUNT(*) FILTER (WHERE state = 'submitted')::int AS submitted,
        COUNT(*) FILTER (WHERE state = 'queued')::int AS queued
      FROM dispatch_attempts WHERE created_at > ${curStart}
    `),
    db.execute<Record<AdminDispatchState, number>>(sql`
      SELECT
        COUNT(*) FILTER (WHERE state = 'accepted')::int AS accepted,
        COUNT(*) FILTER (WHERE state = 'reconciled')::int AS reconciled,
        COUNT(*) FILTER (WHERE state = 'rejected')::int AS rejected,
        COUNT(*) FILTER (WHERE state = 'unknown')::int AS unknown,
        COUNT(*) FILTER (WHERE state = 'submitted')::int AS submitted,
        COUNT(*) FILTER (WHERE state = 'queued')::int AS queued
      FROM dispatch_attempts
      WHERE created_at > ${prevStart} AND created_at <= ${prevEnd}
    `),
    db.execute<{ day: string; orders: number; net: number }>(sql`
      SELECT
        to_char((p.updated_at AT TIME ZONE ${DASHBOARD_TIMEZONE})::date, 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS orders,
        COALESCE(SUM(r.net_cents), 0)::int AS net
      FROM payment_attempts p
      LEFT JOIN receipts r ON r.payment_attempt_id = p.id
      WHERE p.id IN (
        SELECT DISTINCT ON (draft_id) id FROM payment_attempts
        WHERE state = 'captured' AND updated_at > ${curStart}
        ORDER BY draft_id, updated_at DESC, id DESC
      )
      GROUP BY day
      ORDER BY day
    `),
    db.execute<{ standard: number; registered: number }>(sql`
      SELECT
        COUNT(*) FILTER (WHERE delivery_type = 'standard')::int AS standard,
        COUNT(*) FILTER (WHERE delivery_type = 'registered')::int AS registered
      FROM receipts r
      WHERE r.payment_attempt_id IN (
        SELECT DISTINCT ON (draft_id) id FROM payment_attempts
        WHERE state = 'captured' AND updated_at > ${curStart}
        ORDER BY draft_id, updated_at DESC, id DESC
      )
    `),
    // Current-state alerts — intentionally NOT filtered by the period.
    db.execute<{ count: number }>(sql`
      SELECT COUNT(*)::int AS count FROM payment_attempts WHERE state = 'refund_pending'
    `),
    db.execute<{ count: number }>(sql`
      SELECT COUNT(*)::int AS count FROM dispatch_attempts
      WHERE state IN ('rejected', 'unknown')
    `),
    db.execute<{ count: number }>(sql`
      SELECT COUNT(*)::int AS count FROM support_events
      WHERE event_type = 'user_feedback'
        AND created_at > NOW() - make_interval(hours => 24)
    `),
  ]);

  const lettersCur = num(lettersPaidCur.rows[0]?.count);
  const lettersPrev = num(lettersPaidPrev.rows[0]?.count);
  const lowVolume = lettersCur + lettersPrev < LOW_VOLUME_THRESHOLD;
  const currentFunnel = {
    visits: funnelReport.visitsCur,
    draftsStarted: funnelReport.draftsStartedCur,
    draftsReady: funnelReport.draftsReadyCur,
    checkoutsStarted: funnelReport.checkoutsStartedCur,
    paid: lettersCur,
  };

  const contribCur = sumContributionCents(capturedCur.rows);
  const contribPrev = sumContributionCents(capturedPrev.rows);

  const grossCur = num(receiptsCur.rows[0]?.gross);
  const vatCur = num(receiptsCur.rows[0]?.vat);
  const grossPrev = num(receiptsPrev.rows[0]?.gross);
  const netCur = grossCur - num(refundsCur.rows[0]?.refunds);
  const netPrev = grossPrev - num(refundsPrev.rows[0]?.refunds);

  const dc = dispatchCur.rows[0];
  const dp = dispatchPrev.rows[0];
  const rateCur = dc
    ? dispatchSuccessRate({
        accepted: num(dc.accepted),
        reconciled: num(dc.reconciled),
        rejected: num(dc.rejected),
        unknown: num(dc.unknown),
        submitted: num(dc.submitted),
      })
    : null;
  const ratePrev = dp
    ? dispatchSuccessRate({
        accepted: num(dp.accepted),
        reconciled: num(dp.reconciled),
        rejected: num(dp.rejected),
        unknown: num(dp.unknown),
        submitted: num(dp.submitted),
      })
    : null;

  const dailySeries: AdminDashboardDailyPoint[] = series.rows.map((r) => ({
    date: r.day,
    orders: num(r.orders),
    netRevenueCents: num(r.net),
  }));

  const mix = deliveryMix.rows[0];

  return {
    period,
    lowVolume,
    lowVolumeThreshold: LOW_VOLUME_THRESHOLD,
    lettersPaid: buildMetric(lettersCur, lettersPrev, lowVolume),
    contributionCents: buildMetric(
      contribCur.contributionCents,
      contribPrev.contributionCents,
      lowVolume,
    ),
    contributionEstimated: contribCur.estimated,
    netRevenueCents: buildMetric(netCur, netPrev, lowVolume),
    vatCents: vatCur,
    dispatchSuccessRate: buildMetric(rateCur ?? 0, ratePrev ?? 0, lowVolume),
    trackedVisits: buildMetric(
      funnelReport.visitsCur,
      funnelReport.visitsPrev,
      lowVolume,
    ),
    draftsStarted: buildMetric(
      funnelReport.draftsStartedCur,
      funnelReport.draftsStartedPrev,
      lowVolume,
    ),
    draftsReady: buildMetric(
      funnelReport.draftsReadyCur,
      funnelReport.draftsReadyPrev,
      lowVolume,
    ),
    checkoutsStarted: buildMetric(
      funnelReport.checkoutsStartedCur,
      funnelReport.checkoutsStartedPrev,
      lowVolume,
    ),
    funnel: buildFunnelSteps(currentFunnel),
    analytics: await analyticsPromise,
    dailySeries,
    deliveryMix: {
      standard: num(mix?.standard),
      registered: num(mix?.registered),
    },
    alerts: {
      refundsPending: num(alertRefunds.rows[0]?.count),
      dispatchProblems: num(alertDispatch.rows[0]?.count),
      newFeedback24h: num(alertFeedback.rows[0]?.count),
    },
    lastUpdated: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Money tab
// ---------------------------------------------------------------------------

export async function moneyData(
  period: AdminDashboardPeriod,
): Promise<AdminMoneyResponse> {
  const db = getDb();
  const days = periodDays(period);
  const curStart = sql`NOW() - make_interval(days => ${days})`;

  const [totals, refundsAgg, promos, refundList] = await Promise.all([
    db.execute<{ gross: number; net: number; vat: number; discount: number }>(sql`
      SELECT
        COALESCE(SUM(total_cents), 0)::int AS gross,
        COALESCE(SUM(net_cents), 0)::int AS net,
        COALESCE(SUM(vat_cents), 0)::int AS vat,
        COALESCE(SUM(discount_cents), 0)::int AS discount
      FROM receipts WHERE created_at > ${curStart}
    `),
    db.execute<{ refunds: number }>(sql`
      SELECT COALESCE(SUM(amount_cents), 0)::int AS refunds FROM payment_attempts
      WHERE state IN ('refunded', 'partially_refunded') AND updated_at > ${curStart}
    `),
    db.execute<{ code: string; redemptions: number; discount: number; paid: number }>(sql`
      SELECT
        r.promo_code AS code,
        COUNT(*)::int AS redemptions,
        COALESCE(SUM(r.discount_cents), 0)::int AS discount,
        COUNT(*)::int AS paid
      FROM receipts r
      WHERE r.promo_code IS NOT NULL AND r.created_at > ${curStart}
      GROUP BY r.promo_code
      ORDER BY redemptions DESC
    `),
    db.execute<{
      ref: string;
      draft_id: string;
      amount: number;
      date: string;
      reason: string | null;
    }>(sql`
      SELECT
        COALESCE(r.order_ref, 'draft-' || LEFT(p.draft_id::text, 8)) AS ref,
        p.draft_id::text AS draft_id,
        p.amount_cents AS amount,
        p.updated_at::text AS date,
        p.refund_reason AS reason
      FROM payment_attempts p
      LEFT JOIN receipts r ON r.payment_attempt_id = p.id
      WHERE p.state IN ('refunded', 'partially_refunded') AND p.updated_at > ${curStart}
      ORDER BY p.updated_at DESC
      LIMIT 200
    `),
  ]);

  const t = totals.rows[0];
  const refundsCents = num(refundsAgg.rows[0]?.refunds);

  return {
    period,
    grossCents: num(t?.gross),
    netCents: num(t?.net) - refundsCents,
    vatCents: num(t?.vat),
    discountCents: num(t?.discount),
    refundsCents,
    promos: promos.rows.map((p) => ({
      code: p.code,
      redemptions: num(p.redemptions),
      discountCents: num(p.discount),
      attributedPaidLetters: num(p.paid),
    })),
    refunds: refundList.rows.map((r) => ({
      ref: r.ref,
      amountCents: num(r.amount),
      date: r.date,
      reason: r.reason,
      draftId: r.draft_id,
    })),
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Feedback log (chronological support_events)
// ---------------------------------------------------------------------------

function excerpt(details: unknown): string {
  if (details == null) return "";
  if (typeof details === "string") return details.slice(0, 140);
  if (typeof details === "object") {
    const rec = details as Record<string, unknown>;
    const msg = rec.message ?? rec.reason ?? rec.note ?? rec.detail;
    if (typeof msg === "string") return msg.slice(0, 140);
  }
  return "";
}

export async function feedbackData(
  period: AdminDashboardPeriod,
): Promise<AdminFeedbackResponse> {
  const db = getDb();
  const days = periodDays(period);

  const rows = await db.execute<{
    id: string;
    created_at: string;
    locale: string | null;
    draft_id: string | null;
    event_type: string;
    actor: string;
    details: unknown;
  }>(sql`
    SELECT
      se.id::text AS id,
      se.created_at::text AS created_at,
      d.locale::text AS locale,
      se.draft_id::text AS draft_id,
      se.event_type AS event_type,
      se.actor AS actor,
      se.details AS details
    FROM support_events se
    LEFT JOIN draft_letters d ON d.id = se.draft_id
    WHERE se.event_type = 'user_feedback'
      AND se.created_at > NOW() - make_interval(days => ${days})
    ORDER BY se.created_at DESC
    LIMIT 200
  `);

  return {
    rows: rows.rows.map((r) => ({
      id: r.id,
      date: r.created_at,
      locale: r.locale,
      draftId: r.draft_id,
      eventType: r.event_type,
      excerpt: excerpt(r.details),
      actor: r.actor,
    })),
    total: rows.rows.length,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Refunds worklist (current-state — ignores period, plan §9)
// ---------------------------------------------------------------------------

export async function refundsData(): Promise<AdminRefundsResponse> {
  const db = getDb();
  const rows = await db.execute<{
    ref: string;
    draft_id: string;
    amount: number;
    state: "refund_pending" | "refunded" | "partially_refunded";
    reason: string | null;
    date: string;
  }>(sql`
    SELECT
      COALESCE(r.order_ref, 'draft-' || LEFT(p.draft_id::text, 8)) AS ref,
      p.draft_id::text AS draft_id,
      p.amount_cents AS amount,
      p.state AS state,
      p.refund_reason AS reason,
      p.updated_at::text AS date
    FROM payment_attempts p
    LEFT JOIN receipts r ON r.payment_attempt_id = p.id
    WHERE p.state IN ('refund_pending', 'refunded', 'partially_refunded')
    ORDER BY
      CASE p.state WHEN 'refund_pending' THEN 0 ELSE 1 END,
      p.updated_at DESC
    LIMIT 200
  `);

  return {
    rows: rows.rows.map((r) => ({
      ref: r.ref,
      draftId: r.draft_id,
      amountCents: num(r.amount),
      state: r.state,
      reason: r.reason,
      date: r.date,
    })),
    total: rows.rows.length,
    generatedAt: new Date().toISOString(),
  };
}
