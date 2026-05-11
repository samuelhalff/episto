import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import type {
  AdminSummaryResponse,
  AdminActiveResponse,
  AdminFunnelResponse,
  AdminFunnelStep,
  AdminErrorsResponse,
  AdminLocaleResponse,
  AdminAiResponse,
  AdminSentAudienceRow,
} from "@episto/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a period query parameter to a number of days. The returned value
 * is passed through parameterized `make_interval()` calls — never interpolated
 * as a raw SQL string — so it is safe even if future code paths accept user
 * input verbatim.
 */
export function parsePeriodDays(period: string | undefined): number {
  switch (period) {
    case "today":
      return 1;
    case "30d":
      return 30;
    case "7d":
    default:
      return 7;
  }
}

function periodLabel(period: string | undefined): string {
  switch (period) {
    case "today":
      return "Today";
    case "30d":
      return "Last 30 days";
    default:
      return "Last 7 days";
  }
}

type CsvValue = string | number | null | undefined;

const SENT_AUDIENCE_CSV_COLUMNS = [
  "email",
  "locale",
  "furthestStatus",
  "sessionId",
  "draftId",
  "firstSeenAt",
  "lastSeenAt",
] as const;

export function formatAudienceStatusLabel(status: string): string {
  switch (status) {
    case "submitted":
      return "Sent / being dispatched";
    case "dispatched":
      return "Dispatched";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

function escapeCsvCell(value: CsvValue): string {
  const normalized = value == null ? "" : String(value);
  if (/["\n,]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

export function serializeAdminAudienceCsv<T extends object>(
  rows: T[],
  columns?: readonly (keyof T & string)[],
): string {
  const headers =
    columns ?? ((rows[0] ? Object.keys(rows[0]) : []) as (keyof T & string)[]);
  if (headers.length === 0) {
    return "";
  }

  return [
    headers.join(","),
    ...rows.map((row) => {
      const record = row as Record<string, CsvValue>;
      return headers.map((header) => escapeCsvCell(record[header])).join(",");
    }),
  ].join("\n");
}

async function countSentOrDispatchingAudience(): Promise<number> {
  const db = getDb();
  const rows = await db.execute<{ total: number }>(sql`
    WITH candidate AS (
      SELECT
        LOWER(BTRIM(s.email)) AS email_key,
        ROW_NUMBER() OVER (
          PARTITION BY LOWER(BTRIM(s.email))
          ORDER BY
            CASE d.status
              WHEN 'closed' THEN 3
              WHEN 'dispatched' THEN 2
              WHEN 'submitted' THEN 1
              ELSE 0
            END DESC,
            COALESCE(d.updated_at, d.created_at, s.updated_at, s.created_at) DESC
        ) AS row_number
      FROM sessions s
      JOIN draft_letters d ON d.session_id = s.id
      WHERE s.email IS NOT NULL
        AND BTRIM(s.email) <> ''
        AND d.status IN ('submitted', 'dispatched', 'closed')
    )
    SELECT COUNT(*)::int AS total
    FROM candidate
    WHERE row_number = 1
  `);

  return Number(rows.rows[0]?.total ?? 0);
}

async function listSentOrDispatchingAudience(
  limit?: number,
): Promise<AdminSentAudienceRow[]> {
  const db = getDb();
  const query =
    typeof limit === "number"
      ? sql`
          WITH candidate AS (
            SELECT
              LOWER(BTRIM(s.email)) AS email_key,
              s.email AS email,
              s.locale AS locale,
              s.id::text AS session_id,
              d.id::text AS draft_id,
              CASE d.status
                WHEN 'closed' THEN 3
                WHEN 'dispatched' THEN 2
                WHEN 'submitted' THEN 1
                ELSE 0
              END AS status_rank,
              ROW_NUMBER() OVER (
                PARTITION BY LOWER(BTRIM(s.email))
                ORDER BY
                  CASE d.status
                    WHEN 'closed' THEN 3
                    WHEN 'dispatched' THEN 2
                    WHEN 'submitted' THEN 1
                    ELSE 0
                  END DESC,
                  COALESCE(d.updated_at, d.created_at, s.updated_at, s.created_at) DESC
              ) AS row_number,
              MIN(s.created_at) OVER (PARTITION BY LOWER(BTRIM(s.email))) AS first_seen_at,
              MAX(COALESCE(d.updated_at, d.created_at, s.updated_at, s.created_at))
                OVER (PARTITION BY LOWER(BTRIM(s.email))) AS last_seen_at
            FROM sessions s
            JOIN draft_letters d ON d.session_id = s.id
            WHERE s.email IS NOT NULL
              AND BTRIM(s.email) <> ''
              AND d.status IN ('submitted', 'dispatched', 'closed')
          )
          SELECT
            email,
            locale,
            session_id,
            draft_id,
            CASE status_rank
              WHEN 3 THEN 'closed'
              WHEN 2 THEN 'dispatched'
              ELSE 'submitted'
            END AS furthest_status,
            first_seen_at::text AS first_seen_at,
            last_seen_at::text AS last_seen_at
          FROM candidate
          WHERE row_number = 1
          ORDER BY last_seen_at DESC
          LIMIT ${limit}
        `
      : sql`
          WITH candidate AS (
            SELECT
              LOWER(BTRIM(s.email)) AS email_key,
              s.email AS email,
              s.locale AS locale,
              s.id::text AS session_id,
              d.id::text AS draft_id,
              CASE d.status
                WHEN 'closed' THEN 3
                WHEN 'dispatched' THEN 2
                WHEN 'submitted' THEN 1
                ELSE 0
              END AS status_rank,
              ROW_NUMBER() OVER (
                PARTITION BY LOWER(BTRIM(s.email))
                ORDER BY
                  CASE d.status
                    WHEN 'closed' THEN 3
                    WHEN 'dispatched' THEN 2
                    WHEN 'submitted' THEN 1
                    ELSE 0
                  END DESC,
                  COALESCE(d.updated_at, d.created_at, s.updated_at, s.created_at) DESC
              ) AS row_number,
              MIN(s.created_at) OVER (PARTITION BY LOWER(BTRIM(s.email))) AS first_seen_at,
              MAX(COALESCE(d.updated_at, d.created_at, s.updated_at, s.created_at))
                OVER (PARTITION BY LOWER(BTRIM(s.email))) AS last_seen_at
            FROM sessions s
            JOIN draft_letters d ON d.session_id = s.id
            WHERE s.email IS NOT NULL
              AND BTRIM(s.email) <> ''
              AND d.status IN ('submitted', 'dispatched', 'closed')
          )
          SELECT
            email,
            locale,
            session_id,
            draft_id,
            CASE status_rank
              WHEN 3 THEN 'closed'
              WHEN 2 THEN 'dispatched'
              ELSE 'submitted'
            END AS furthest_status,
            first_seen_at::text AS first_seen_at,
            last_seen_at::text AS last_seen_at
          FROM candidate
          WHERE row_number = 1
          ORDER BY last_seen_at DESC
        `;

  const rows = await db.execute<{
    email: string;
    locale: string | null;
    session_id: string;
    draft_id: string;
    furthest_status: string;
    first_seen_at: string;
    last_seen_at: string;
  }>(query);

  return rows.rows.map((row) => ({
    email: row.email,
    locale: row.locale,
    furthestStatus: formatAudienceStatusLabel(row.furthest_status),
    sessionId: row.session_id,
    draftId: row.draft_id,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
  }));
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export async function adminMetricsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin/audience/sent-or-dispatching", async (_request, reply) => {
    const [total, rows] = await Promise.all([
      countSentOrDispatchingAudience(),
      listSentOrDispatchingAudience(200),
    ]);

    reply.send({
      total,
      rows,
      generatedAt: new Date().toISOString(),
    });
  });

  app.get("/admin/audience/sent-or-dispatching.csv", async (_request, reply) => {
    const rows = await listSentOrDispatchingAudience();
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header(
      "Content-Disposition",
      'attachment; filename="episto-sent-or-dispatching-audience.csv"',
    );
    reply.send(serializeAdminAudienceCsv(rows, SENT_AUDIENCE_CSV_COLUMNS));
  });

  // GET /admin/metrics/summary — KPI cards
  app.get<{ Querystring: { period?: string } }>(
    "/admin/metrics/summary",
    async (request, reply) => {
      const db = getDb();
      const days = parsePeriodDays(request.query.period);
      const label = periodLabel(request.query.period);

      const [sessions, letters, revenue, errors, totalDrafts] = await Promise.all([
        db.execute<{ count: number }>(sql`
            SELECT COUNT(*)::int AS count FROM sessions
            WHERE created_at > NOW() - make_interval(days => ${days})
          `),
        db.execute<{ count: number }>(sql`
            SELECT COUNT(*)::int AS count FROM dispatch_attempts
            WHERE state IN ('accepted', 'submitted')
              AND created_at > NOW() - make_interval(days => ${days})
          `),
        db.execute<{ total: number }>(sql`
            SELECT COALESCE(SUM(amount_cents), 0)::int AS total FROM payment_attempts
            WHERE state = 'captured'
              AND created_at > NOW() - make_interval(days => ${days})
          `),
        db.execute<{ count: number }>(sql`
            SELECT COUNT(*)::int AS count FROM payment_attempts
            WHERE state = 'failed'
              AND created_at > NOW() - make_interval(days => ${days})
          `),
        db.execute<{ count: number }>(sql`
            SELECT COUNT(*)::int AS count FROM draft_letters
            WHERE created_at > NOW() - make_interval(days => ${days})
          `),
      ]);

      const totalD = Number(totalDrafts.rows[0]?.count ?? 0);
      const failedCount = Number(errors.rows[0]?.count ?? 0);

      const response: AdminSummaryResponse = {
        activeSessions: Number(sessions.rows[0]?.count ?? 0),
        lettersSent: Number(letters.rows[0]?.count ?? 0),
        revenueCents: Number(revenue.rows[0]?.total ?? 0),
        errorRate: totalD > 0 ? Math.round((failedCount / totalD) * 1000) / 10 : 0,
        periodLabel: label,
        generatedAt: new Date().toISOString(),
      };
      reply.send(response);
    },
  );

  // GET /admin/metrics/active — current active sessions by stage
  app.get("/admin/metrics/active", async (_request, reply) => {
    const db = getDb();
    const cutoff = sql`make_interval(mins => 15)`;

    const [total, drafting, review, checkout, confirmation] = await Promise.all([
      db.execute<{ count: number }>(sql`
          SELECT COUNT(*)::int AS count FROM sessions
          WHERE expires_at > NOW() OR created_at > NOW() - ${cutoff}
        `),
      db.execute<{ count: number }>(sql`
          SELECT COUNT(DISTINCT s.id)::int AS count
          FROM sessions s JOIN draft_letters d ON d.session_id = s.id
          WHERE d.status IN ('collecting', 'fields_complete')
            AND d.updated_at > NOW() - ${cutoff}
        `),
      db.execute<{ count: number }>(sql`
          SELECT COUNT(DISTINCT s.id)::int AS count
          FROM sessions s JOIN draft_letters d ON d.session_id = s.id
          WHERE d.status = 'reviewed'
            AND d.updated_at > NOW() - ${cutoff}
        `),
      db.execute<{ count: number }>(sql`
          SELECT COUNT(DISTINCT s.id)::int AS count
          FROM sessions s JOIN payment_attempts p ON p.session_id = s.id
          WHERE p.state = 'pending'
            AND p.updated_at > NOW() - ${cutoff}
        `),
      db.execute<{ count: number }>(sql`
          SELECT COUNT(DISTINCT s.id)::int AS count
          FROM sessions s
          JOIN draft_letters d ON d.session_id = s.id
          JOIN dispatch_attempts da ON da.draft_id = d.id
          WHERE da.state IN ('accepted', 'submitted')
            AND da.updated_at > NOW() - ${cutoff}
        `),
    ]);

    const t = Number(total.rows[0]?.count ?? 0);
    const d = Number(drafting.rows[0]?.count ?? 0);
    const r = Number(review.rows[0]?.count ?? 0);
    const c = Number(checkout.rows[0]?.count ?? 0);
    const conf = Number(confirmation.rows[0]?.count ?? 0);

    const response: AdminActiveResponse = {
      total: t,
      byStage: {
        browsing: Math.max(0, t - d - r - c - conf),
        drafting: d,
        review: r,
        checkout: c,
        confirmation: conf,
      },
      generatedAt: new Date().toISOString(),
    };
    reply.send(response);
  });

  // GET /admin/metrics/funnel — conversion funnel
  app.get<{ Querystring: { period?: string } }>(
    "/admin/metrics/funnel",
    async (request, reply) => {
      const db = getDb();
      const days = parsePeriodDays(request.query.period);
      const label = periodLabel(request.query.period);

      const [sessions, drafts, reviewed, checkouts, paid, dispatched] = await Promise.all(
        [
          db.execute<{ count: number }>(sql`
            SELECT COUNT(*)::int AS count FROM sessions
            WHERE created_at > NOW() - make_interval(days => ${days})
          `),
          db.execute<{ count: number }>(sql`
            SELECT COUNT(*)::int AS count FROM draft_letters
            WHERE created_at > NOW() - make_interval(days => ${days})
          `),
          db.execute<{ count: number }>(sql`
            SELECT COUNT(*)::int AS count FROM draft_letters
            WHERE status NOT IN ('collecting', 'fields_complete')
              AND created_at > NOW() - make_interval(days => ${days})
          `),
          db.execute<{ count: number }>(sql`
            SELECT COUNT(*)::int AS count FROM payment_attempts
            WHERE created_at > NOW() - make_interval(days => ${days})
          `),
          db.execute<{ count: number }>(sql`
            SELECT COUNT(*)::int AS count FROM payment_attempts
            WHERE state = 'captured'
              AND created_at > NOW() - make_interval(days => ${days})
          `),
          db.execute<{ count: number }>(sql`
            SELECT COUNT(*)::int AS count FROM dispatch_attempts
            WHERE state IN ('accepted', 'submitted')
              AND created_at > NOW() - make_interval(days => ${days})
          `),
        ],
      );

      const counts = [
        { stage: "Sessions", count: Number(sessions.rows[0]?.count ?? 0) },
        {
          stage: "Draft Started",
          count: Number(drafts.rows[0]?.count ?? 0),
        },
        {
          stage: "Review Reached",
          count: Number(reviewed.rows[0]?.count ?? 0),
        },
        { stage: "Checkout", count: Number(checkouts.rows[0]?.count ?? 0) },
        { stage: "Payment OK", count: Number(paid.rows[0]?.count ?? 0) },
        {
          stage: "Dispatched",
          count: Number(dispatched.rows[0]?.count ?? 0),
        },
      ];

      const steps: AdminFunnelStep[] = counts.map((step, i) => {
        const prev = i > 0 ? counts[i - 1] : undefined;
        return {
          stage: step.stage,
          count: step.count,
          dropOffPercent:
            !prev || prev.count === 0
              ? null
              : Math.round((1 - step.count / prev.count) * 1000) / 10,
        };
      });

      const sessionCount = counts[0]?.count ?? 0;
      const dispatchCount = counts[counts.length - 1]?.count ?? 0;

      // dispatch_attempts has no session_id — join through draft_letters
      const localeRows = await db.execute<{
        locale: string;
        sessions: number;
        dispatched: number;
      }>(sql`
        SELECT
          s.locale,
          COUNT(DISTINCT s.id)::int AS sessions,
          COUNT(DISTINCT da.id)::int AS dispatched
        FROM sessions s
        LEFT JOIN draft_letters d ON d.session_id = s.id
        LEFT JOIN dispatch_attempts da ON da.draft_id = d.id
          AND da.state IN ('accepted', 'submitted')
          AND da.created_at > NOW() - make_interval(days => ${days})
        WHERE s.created_at > NOW() - make_interval(days => ${days})
          AND s.locale IS NOT NULL
        GROUP BY s.locale
      `);

      const byLocale: Record<string, number> = {};
      for (const row of localeRows.rows) {
        const sess = Number(row.sessions);
        const disp = Number(row.dispatched);
        byLocale[row.locale] = sess > 0 ? Math.round((disp / sess) * 1000) / 10 : 0;
      }

      const response: AdminFunnelResponse = {
        steps,
        overallConversionPercent:
          sessionCount > 0 ? Math.round((dispatchCount / sessionCount) * 1000) / 10 : 0,
        byLocale,
        periodLabel: label,
        generatedAt: new Date().toISOString(),
      };
      reply.send(response);
    },
  );

  // GET /admin/metrics/errors — error aggregation
  app.get<{ Querystring: { period?: string } }>(
    "/admin/metrics/errors",
    async (request, reply) => {
      const db = getDb();
      const days = parsePeriodDays(request.query.period);
      const label = periodLabel(request.query.period);

      const rows = await db.execute<{
        family: string;
        count: number;
        sessions: number;
      }>(sql`
        SELECT
          error_family AS family,
          COUNT(*)::int AS count,
          COUNT(DISTINCT session_id)::int AS sessions
        FROM product_events
        WHERE error_family IS NOT NULL
          AND created_at > NOW() - make_interval(days => ${days})
        GROUP BY error_family
        ORDER BY count DESC
        LIMIT 20
      `);

      const paymentErrors = await db.execute<{
        count: number;
        sessions: number;
      }>(sql`
        SELECT COUNT(*)::int AS count, COUNT(DISTINCT session_id)::int AS sessions
        FROM payment_attempts
        WHERE state = 'failed'
          AND created_at > NOW() - make_interval(days => ${days})
      `);

      const entries = rows.rows.map((r) => ({
        errorFamily: r.family,
        count: Number(r.count),
        affectedSessions: Number(r.sessions),
      }));

      const pf = paymentErrors.rows[0];
      if (pf && Number(pf.count) > 0) {
        entries.unshift({
          errorFamily: "payment_failed",
          count: Number(pf.count),
          affectedSessions: Number(pf.sessions),
        });
      }

      const totalErrors = entries.reduce((sum, e) => sum + e.count, 0);

      const response: AdminErrorsResponse = {
        entries,
        totalErrors,
        periodLabel: label,
        generatedAt: new Date().toISOString(),
      };
      reply.send(response);
    },
  );

  // GET /admin/metrics/locale — session distribution by locale
  app.get("/admin/metrics/locale", async (_request, reply) => {
    const db = getDb();

    const rows = await db.execute<{ locale: string; count: number }>(sql`
      SELECT locale, COUNT(*)::int AS count
      FROM sessions
      WHERE locale IS NOT NULL
        AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY locale
      ORDER BY count DESC
    `);

    const total = rows.rows.reduce((sum, r) => sum + Number(r.count), 0);
    const entries = rows.rows.map((r) => ({
      locale: r.locale,
      count: Number(r.count),
      percent: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
    }));

    const response: AdminLocaleResponse = {
      entries,
      generatedAt: new Date().toISOString(),
    };
    reply.send(response);
  });

  // GET /admin/metrics/step-friction — per-step funnel friction
  app.get<{ Querystring: { period?: string } }>(
    "/admin/metrics/step-friction",
    async (request, reply) => {
      const db = getDb();
      const days = parsePeriodDays(request.query.period);
      const label = periodLabel(request.query.period);

      const rows = await db.execute<{
        step: string;
        entered: number;
        completed: number;
        idle: number;
        abandoned: number;
        errors: number;
        median_ms: number;
      }>(sql`
        SELECT
          step,
          COUNT(*) FILTER (WHERE event_name = 'step_entered')::int AS entered,
          COUNT(*) FILTER (WHERE event_name = 'step_completed')::int AS completed,
          COUNT(*) FILTER (WHERE event_name = 'step_idle')::int AS idle,
          COUNT(*) FILTER (WHERE event_name = 'step_abandoned')::int AS abandoned,
          COUNT(*) FILTER (WHERE event_name = 'step_error')::int AS errors,
          COALESCE(
            PERCENTILE_CONT(0.5) WITHIN GROUP (
              ORDER BY duration_ms
            ) FILTER (WHERE event_name = 'step_completed'),
            0
          )::int AS median_ms
        FROM product_events
        WHERE step IS NOT NULL
          AND event_name IN ('step_entered', 'step_completed', 'step_idle', 'step_abandoned', 'step_error')
          AND created_at > NOW() - make_interval(days => ${days})
        GROUP BY step
        ORDER BY entered DESC
      `);

      const stuckRows = await db.execute<{
        session_id: string;
        draft_id: string | null;
        step: string;
        last_seen: string;
      }>(sql`
        SELECT DISTINCT ON (session_id)
          session_id::text AS session_id,
          draft_id::text AS draft_id,
          step,
          MAX(created_at)::text AS last_seen
        FROM product_events
        WHERE event_name IN ('step_entered', 'step_idle')
          AND step IS NOT NULL
          AND session_id IS NOT NULL
          AND created_at > NOW() - make_interval(days => ${days})
          AND NOT EXISTS (
            SELECT 1 FROM product_events later
            WHERE later.session_id = product_events.session_id
              AND later.event_name IN ('step_completed', 'step_abandoned')
              AND later.step = product_events.step
              AND later.created_at >= product_events.created_at
          )
        GROUP BY session_id, draft_id, step
        ORDER BY session_id, MAX(created_at) DESC
        LIMIT 50
      `);

      const steps = rows.rows.map((r) => {
        const entered = Number(r.entered);
        const completed = Number(r.completed);
        const abandoned = Number(r.abandoned);
        const dropOffPercent =
          entered > 0 ? Math.round((1 - completed / entered) * 1000) / 10 : 0;
        return {
          step: r.step,
          entered,
          completed,
          idle: Number(r.idle),
          abandoned,
          errors: Number(r.errors),
          medianDurationMs: Number(r.median_ms),
          dropOffPercent,
        };
      });

      const stuckUsers = stuckRows.rows.map((r) => ({
        sessionId: r.session_id,
        draftId: r.draft_id,
        step: r.step,
        lastSeen: r.last_seen,
      }));

      reply.send({
        steps,
        stuckUsers,
        periodLabel: label,
        generatedAt: new Date().toISOString(),
      });
    },
  );

  // GET /admin/metrics/ai — AI quality metrics
  app.get<{ Querystring: { period?: string } }>(
    "/admin/metrics/ai",
    async (request, reply) => {
      const db = getDb();
      const days = parsePeriodDays(request.query.period);
      const label = periodLabel(request.query.period);

      const rows = await db.execute<{
        total: number;
        avg_duration: number;
        refusals: number;
        regenerations: number;
      }>(sql`
        SELECT
          COUNT(*) FILTER (WHERE event_name = 'ai_generation_completed')::int AS total,
          COALESCE(AVG(duration_ms) FILTER (WHERE event_name = 'ai_generation_completed'), 0)::int AS avg_duration,
          COUNT(*) FILTER (WHERE event_name = 'ai_generation_completed' AND error_family = 'refusal')::int AS refusals,
          COUNT(*) FILTER (WHERE event_name = 'ai_generation_requested')::int AS regenerations
        FROM product_events
        WHERE event_name IN ('ai_generation_completed', 'ai_generation_requested')
          AND created_at > NOW() - make_interval(days => ${days})
      `);

      const r = rows.rows[0];
      const total = Number(r?.total ?? 0);
      const requests = Number(r?.regenerations ?? 0);

      const response: AdminAiResponse = {
        avgLatencyMs: Number(r?.avg_duration ?? 0),
        refusalRate:
          total > 0 ? Math.round((Number(r?.refusals ?? 0) / total) * 1000) / 10 : 0,
        regenerationRate:
          requests > 0 && total > 0
            ? Math.round(((requests - total) / total) * 1000) / 10
            : 0,
        totalRequests: requests,
        periodLabel: label,
        generatedAt: new Date().toISOString(),
      };
      reply.send(response);
    },
  );
}
