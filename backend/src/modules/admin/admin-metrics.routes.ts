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
} from "@swiss-mail/shared";

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

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export async function adminMetricsRoutes(app: FastifyInstance): Promise<void> {
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
