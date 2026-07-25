import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { AdminLetterRow } from "@episto/shared";
import { getDb } from "../../db/index.js";
import { getRequiredAdmin } from "../../shared/middleware/require-admin.js";
import { recordSupportEvent } from "./index.js";
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
import {
  parseFinancialsPeriod,
  financialsData,
  fixedCostsData,
  setFixedCosts,
  currentYearMonth,
  normalizeYearMonth,
} from "./admin-financials.service.js";
import { financialsCsvRows, FINANCIALS_CSV_COLUMNS } from "./admin-financials.csv.js";

/**
 * Admin analytics dashboard ("Pulse") endpoints. Live-computed, DB-only, gated
 * by the admin auth + IP allowlist hooks in admin.routes.ts, and rate-limited by
 * the global limiter. All shaping lives in admin-dashboard.service.ts.
 */

function noStore(reply: FastifyReply): void {
  // PII-adjacent worklists must never be cached (plan §9).
  reply.header("Cache-Control", "no-store");
}

async function auditDashboardAccess(
  request: FastifyRequest,
  resource: string,
): Promise<void> {
  await recordSupportEvent(getDb(), {
    eventType: "admin_dashboard_access",
    actor: getRequiredAdmin(request).actor,
    details: { resource },
  });
}

export async function adminDashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { period?: string } }>(
    "/admin/metrics/dashboard",
    async (request, reply) => {
      noStore(reply);
      await auditDashboardAccess(request, "metrics/dashboard");
      reply.send(await dashboardData(parseDashboardPeriod(request.query.period)));
    },
  );

  app.get<{ Querystring: LettersQuery }>("/admin/letters", async (request, reply) => {
    noStore(reply);
    await auditDashboardAccess(request, "letters");
    reply.send(await lettersData(request.query));
  });

  app.get<{ Querystring: LettersQuery }>("/admin/letters.csv", async (request, reply) => {
    // Export all matching rows (no pagination) but bounded server-side.
    await auditDashboardAccess(request, "letters.csv");
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
      await auditDashboardAccess(request, "money");
      reply.send(await moneyData(parseDashboardPeriod(request.query.period)));
    },
  );

  app.get<{ Querystring: { period?: string } }>(
    "/admin/feedback",
    async (request, reply) => {
      noStore(reply);
      await auditDashboardAccess(request, "feedback");
      reply.send(await feedbackData(parseDashboardPeriod(request.query.period)));
    },
  );

  app.get("/admin/refunds", async (_request, reply) => {
    noStore(reply);
    await auditDashboardAccess(_request, "refunds");
    reply.send(await refundsData());
  });

  // -------------------------------------------------------------------------
  // Financials (P&L)
  // -------------------------------------------------------------------------

  app.get<{ Querystring: { period?: string } }>(
    "/admin/metrics/financials",
    async (request, reply) => {
      noStore(reply);
      await auditDashboardAccess(request, "metrics/financials");
      reply.send(await financialsData(parseFinancialsPeriod(request.query.period)));
    },
  );

  app.get<{ Querystring: { period?: string } }>(
    "/admin/financials.csv",
    async (request, reply) => {
      await auditDashboardAccess(request, "financials.csv");
      const data = await financialsData(parseFinancialsPeriod(request.query.period));
      noStore(reply);
      reply.header("Content-Type", "text/csv; charset=utf-8");
      reply.header("Content-Disposition", 'attachment; filename="episto-financials.csv"');
      reply.send(serializeHardenedCsv(financialsCsvRows(data), FINANCIALS_CSV_COLUMNS));
    },
  );

  app.get<{ Querystring: { month?: string } }>(
    "/admin/financials/fixed-costs",
    async (request, reply) => {
      noStore(reply);
      await auditDashboardAccess(request, "financials/fixed-costs");
      const yearMonth = normalizeYearMonth(request.query.month) ?? currentYearMonth();
      reply.send(await fixedCostsData(yearMonth));
    },
  );

  app.put<{
    Body: { yearMonth?: string; amountCents?: unknown; note?: unknown };
  }>("/admin/financials/fixed-costs", async (request, reply) => {
    noStore(reply);
    await auditDashboardAccess(request, "financials/fixed-costs:update");
    const body = request.body ?? {};
    const yearMonth = normalizeYearMonth(body.yearMonth) ?? currentYearMonth();
    const amount = Number(body.amountCents);
    if (!Number.isFinite(amount) || amount < 0) {
      reply.code(400).send({ error: "amountCents must be a non-negative integer" });
      return;
    }
    const note =
      typeof body.note === "string" && body.note.trim()
        ? body.note.trim().slice(0, 500)
        : null;
    reply.send(await setFixedCosts({ yearMonth, amountCents: Math.round(amount), note }));
  });
}
