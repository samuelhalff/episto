import type { FastifyInstance, FastifyReply } from "fastify";
import type { AdminLetterRow } from "@episto/shared";
import {
  parseDashboardPeriod,
  dashboardData,
  lettersData,
  moneyData,
  feedbackData,
  refundsData,
  serializeHardenedCsv,
  LETTERS_CSV_COLUMNS,
  type LettersQuery,
} from "./admin-dashboard.service.js";

/**
 * Admin analytics dashboard ("Pulse") endpoints. Live-computed, DB-only, gated
 * by the admin auth + IP allowlist hooks in admin.routes.ts, and rate-limited by
 * the global limiter. All shaping lives in admin-dashboard.service.ts.
 */

function noStore(reply: FastifyReply): void {
  // PII-adjacent worklists must never be cached (plan §9).
  reply.header("Cache-Control", "no-store");
}

export async function adminDashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { period?: string } }>(
    "/admin/metrics/dashboard",
    async (request, reply) => {
      noStore(reply);
      reply.send(await dashboardData(parseDashboardPeriod(request.query.period)));
    },
  );

  app.get<{ Querystring: LettersQuery }>("/admin/letters", async (request, reply) => {
    noStore(reply);
    reply.send(await lettersData(request.query));
  });

  app.get<{ Querystring: LettersQuery }>("/admin/letters.csv", async (request, reply) => {
    // Export all matching rows (no pagination) but bounded server-side.
    const first = await lettersData({ ...request.query, page: "1" });
    const allPages: AdminLetterRow[] = [...first.rows];
    for (let p = 2; p <= Math.min(first.totalPages, 400); p += 1) {
      const next = await lettersData({ ...request.query, page: String(p) });
      allPages.push(...next.rows);
    }
    noStore(reply);
    reply.header("Content-Type", "text/csv; charset=utf-8");
    reply.header("Content-Disposition", 'attachment; filename="episto-letters.csv"');
    reply.send(serializeHardenedCsv(allPages, LETTERS_CSV_COLUMNS));
  });

  app.get<{ Querystring: { period?: string } }>(
    "/admin/money",
    async (request, reply) => {
      noStore(reply);
      reply.send(await moneyData(parseDashboardPeriod(request.query.period)));
    },
  );

  app.get<{ Querystring: { period?: string } }>(
    "/admin/feedback",
    async (request, reply) => {
      noStore(reply);
      reply.send(await feedbackData(parseDashboardPeriod(request.query.period)));
    },
  );

  app.get("/admin/refunds", async (_request, reply) => {
    noStore(reply);
    reply.send(await refundsData());
  });
}
