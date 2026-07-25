import { sql } from "drizzle-orm";
import type { getDb } from "../../db/index.js";

export interface DashboardFunnelReport {
  visitsCur: number;
  visitsPrev: number;
  draftsStartedCur: number;
  draftsStartedPrev: number;
  draftsReadyCur: number;
  draftsReadyPrev: number;
  checkoutsStartedCur: number;
  checkoutsStartedPrev: number;
}

/** Product-event counts for the DB funnel; GA4 reporting remains separate. */
export async function dashboardFunnelData(
  db: ReturnType<typeof getDb>,
  days: number,
): Promise<DashboardFunnelReport> {
  const curStart = sql`NOW() - make_interval(days => ${days})`;
  const prevStart = sql`NOW() - make_interval(days => ${days * 2})`;
  const prevEnd = curStart;
  const result = await db.execute<{
    visits_cur: number;
    visits_prev: number;
    drafts_started_cur: number;
    drafts_started_prev: number;
    drafts_ready_cur: number;
    drafts_ready_prev: number;
    checkouts_started_cur: number;
    checkouts_started_prev: number;
  }>(sql`
    SELECT
      COUNT(DISTINCT COALESCE(session_id::text, id::text)) FILTER (
        WHERE event_name = 'marketing_page_viewed' AND created_at > ${curStart}
      )::int AS visits_cur,
      COUNT(DISTINCT COALESCE(session_id::text, id::text)) FILTER (
        WHERE event_name = 'marketing_page_viewed'
          AND created_at > ${prevStart} AND created_at <= ${prevEnd}
      )::int AS visits_prev,
      COUNT(DISTINCT COALESCE(draft_id::text, session_id::text, id::text)) FILTER (
        WHERE event_name = 'draft_entry_started' AND created_at > ${curStart}
      )::int AS drafts_started_cur,
      COUNT(DISTINCT COALESCE(draft_id::text, session_id::text, id::text)) FILTER (
        WHERE event_name = 'draft_entry_started'
          AND created_at > ${prevStart} AND created_at <= ${prevEnd}
      )::int AS drafts_started_prev,
      COUNT(DISTINCT COALESCE(draft_id::text, id::text)) FILTER (
        WHERE event_name = 'draft_first_full_draft_ready' AND created_at > ${curStart}
      )::int AS drafts_ready_cur,
      COUNT(DISTINCT COALESCE(draft_id::text, id::text)) FILTER (
        WHERE event_name = 'draft_first_full_draft_ready'
          AND created_at > ${prevStart} AND created_at <= ${prevEnd}
      )::int AS drafts_ready_prev,
      COUNT(DISTINCT COALESCE(draft_id::text, id::text)) FILTER (
        WHERE event_name = 'checkout_started' AND created_at > ${curStart}
      )::int AS checkouts_started_cur,
      COUNT(DISTINCT COALESCE(draft_id::text, id::text)) FILTER (
        WHERE event_name = 'checkout_started'
          AND created_at > ${prevStart} AND created_at <= ${prevEnd}
      )::int AS checkouts_started_prev
    FROM product_events
    WHERE created_at > ${prevStart}
  `);
  const row = result.rows[0];
  return {
    visitsCur: Number(row?.visits_cur ?? 0),
    visitsPrev: Number(row?.visits_prev ?? 0),
    draftsStartedCur: Number(row?.drafts_started_cur ?? 0),
    draftsStartedPrev: Number(row?.drafts_started_prev ?? 0),
    draftsReadyCur: Number(row?.drafts_ready_cur ?? 0),
    draftsReadyPrev: Number(row?.drafts_ready_prev ?? 0),
    checkoutsStartedCur: Number(row?.checkouts_started_cur ?? 0),
    checkoutsStartedPrev: Number(row?.checkouts_started_prev ?? 0),
  };
}
