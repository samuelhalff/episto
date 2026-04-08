import type { FastifyInstance } from "fastify";
import { eq, sql } from "drizzle-orm";
import type {
  AdminEscalationLevel,
  AdminSuspiciousCase,
  AdminSuspiciousQueueResponse,
} from "@swiss-mail/shared";
import { getDb, schema } from "../../db/index.js";
import { notFoundError, validationError } from "../../shared/errors/index.js";
import { recordSupportEvent } from "./index.js";

const SUPPORTED_ESCALATION_LEVELS = [
  "observe",
  "review",
  "manual_review",
  "incident",
] as const satisfies readonly AdminEscalationLevel[];

interface SuspiciousSignalCounts {
  failedPayments: number;
  refunds: number;
  rejectedDispatches: number;
  ambiguousDispatches: number;
}

interface SuspiciousWindow {
  firstSeenAt: string | null;
  lastSeenAt: string | null;
}

interface SuspiciousCaseRow {
  [key: string]: unknown;
  session_id: string;
  email: string | null;
  locale: string;
  session_created_at: string;
  latest_draft_id: string | null;
  latest_draft_status: string | null;
  failed_payments: number;
  failed_payments_first: string | null;
  failed_payments_last: string | null;
  refunds: number;
  refunds_first: string | null;
  refunds_last: string | null;
  rejected_dispatches: number;
  rejected_dispatches_first: string | null;
  rejected_dispatches_last: string | null;
  ambiguous_dispatches: number;
  ambiguous_dispatches_first: string | null;
  ambiguous_dispatches_last: string | null;
  escalation_level: string | null;
  escalation_note: string | null;
  escalation_updated_at: string | null;
}

export function deriveSuspiciousCategories(input: SuspiciousSignalCounts): string[] {
  const categories: string[] = [];

  if (input.failedPayments >= 3 || input.refunds >= 2) {
    categories.push("payment_abuse");
  }

  if (input.rejectedDispatches >= 2 || input.ambiguousDispatches >= 2) {
    categories.push("submission_abuse");
  }

  if (input.failedPayments >= 2 && input.ambiguousDispatches >= 1) {
    categories.push("mixed_suspicious_behavior");
  }

  return categories;
}

export function isSupportedEscalationLevel(
  value: string,
): value is AdminEscalationLevel {
  return (SUPPORTED_ESCALATION_LEVELS as readonly string[]).includes(value);
}

export function resolveSuspiciousWindow(
  windows: SuspiciousWindow[],
): { firstSeenAt: string; lastSeenAt: string } {
  const firstSeenAt = windows
    .map((window) => window.firstSeenAt)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  const lastSeenAt = windows
    .map((window) => window.lastSeenAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);

  return {
    firstSeenAt: firstSeenAt ?? new Date(0).toISOString(),
    lastSeenAt: lastSeenAt ?? new Date(0).toISOString(),
  };
}

function normalizeEscalationLevel(value: string | null): AdminEscalationLevel {
  return value && isSupportedEscalationLevel(value) ? value : "observe";
}

export async function countSuspiciousSessions(): Promise<number> {
  const db = getDb();

  const result = await db.execute<{ count: string }>(sql`
    WITH suspicious_sessions AS (
      SELECT
        s.id,
        (
          SELECT COUNT(*)::int
          FROM payment_attempts p
          WHERE p.session_id = s.id
            AND p.state = 'failed'
            AND p.created_at > NOW() - INTERVAL '30 days'
        ) AS failed_payments,
        (
          SELECT COUNT(*)::int
          FROM payment_attempts p
          WHERE p.session_id = s.id
            AND p.state IN ('refund_pending', 'refunded', 'partially_refunded')
            AND p.updated_at > NOW() - INTERVAL '30 days'
        ) AS refunds,
        (
          SELECT COUNT(*)::int
          FROM dispatch_attempts da
          JOIN draft_letters d ON d.id = da.draft_id
          WHERE d.session_id = s.id
            AND da.state = 'rejected'
            AND da.updated_at > NOW() - INTERVAL '30 days'
        ) AS rejected_dispatches,
        (
          SELECT COUNT(*)::int
          FROM dispatch_attempts da
          JOIN draft_letters d ON d.id = da.draft_id
          WHERE d.session_id = s.id
            AND da.state = 'unknown'
            AND da.updated_at > NOW() - INTERVAL '30 days'
        ) AS ambiguous_dispatches
      FROM sessions s
      WHERE s.created_at > NOW() - INTERVAL '30 days'
    )
    SELECT COUNT(*)::int AS count
    FROM suspicious_sessions
    WHERE failed_payments >= 3
       OR refunds >= 2
       OR rejected_dispatches >= 2
       OR ambiguous_dispatches >= 2
       OR (failed_payments >= 2 AND ambiguous_dispatches >= 1)
  `);

  return Number(result.rows[0]?.count ?? 0);
}

export async function adminFlagsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin/flags/suspicious", async (_request, reply) => {
    const db = getDb();

    const rows = await db.execute<SuspiciousCaseRow>(sql`
      SELECT
        s.id AS session_id,
        s.email,
        s.locale::text,
        s.created_at::text AS session_created_at,
        (
          SELECT d.id
          FROM draft_letters d
          WHERE d.session_id = s.id
          ORDER BY d.updated_at DESC
          LIMIT 1
        ) AS latest_draft_id,
        (
          SELECT d.status::text
          FROM draft_letters d
          WHERE d.session_id = s.id
          ORDER BY d.updated_at DESC
          LIMIT 1
        ) AS latest_draft_status,
        (
          SELECT COUNT(*)::int
          FROM payment_attempts p
          WHERE p.session_id = s.id
            AND p.state = 'failed'
            AND p.created_at > NOW() - INTERVAL '30 days'
        ) AS failed_payments,
        (
          SELECT MIN(p.created_at)::text
          FROM payment_attempts p
          WHERE p.session_id = s.id
            AND p.state = 'failed'
            AND p.created_at > NOW() - INTERVAL '30 days'
        ) AS failed_payments_first,
        (
          SELECT MAX(p.created_at)::text
          FROM payment_attempts p
          WHERE p.session_id = s.id
            AND p.state = 'failed'
            AND p.created_at > NOW() - INTERVAL '30 days'
        ) AS failed_payments_last,
        (
          SELECT COUNT(*)::int
          FROM payment_attempts p
          WHERE p.session_id = s.id
            AND p.state IN ('refund_pending', 'refunded', 'partially_refunded')
            AND p.updated_at > NOW() - INTERVAL '30 days'
        ) AS refunds,
        (
          SELECT MIN(p.updated_at)::text
          FROM payment_attempts p
          WHERE p.session_id = s.id
            AND p.state IN ('refund_pending', 'refunded', 'partially_refunded')
            AND p.updated_at > NOW() - INTERVAL '30 days'
        ) AS refunds_first,
        (
          SELECT MAX(p.updated_at)::text
          FROM payment_attempts p
          WHERE p.session_id = s.id
            AND p.state IN ('refund_pending', 'refunded', 'partially_refunded')
            AND p.updated_at > NOW() - INTERVAL '30 days'
        ) AS refunds_last,
        (
          SELECT COUNT(*)::int
          FROM dispatch_attempts da
          JOIN draft_letters d ON d.id = da.draft_id
          WHERE d.session_id = s.id
            AND da.state = 'rejected'
            AND da.updated_at > NOW() - INTERVAL '30 days'
        ) AS rejected_dispatches,
        (
          SELECT MIN(da.updated_at)::text
          FROM dispatch_attempts da
          JOIN draft_letters d ON d.id = da.draft_id
          WHERE d.session_id = s.id
            AND da.state = 'rejected'
            AND da.updated_at > NOW() - INTERVAL '30 days'
        ) AS rejected_dispatches_first,
        (
          SELECT MAX(da.updated_at)::text
          FROM dispatch_attempts da
          JOIN draft_letters d ON d.id = da.draft_id
          WHERE d.session_id = s.id
            AND da.state = 'rejected'
            AND da.updated_at > NOW() - INTERVAL '30 days'
        ) AS rejected_dispatches_last,
        (
          SELECT COUNT(*)::int
          FROM dispatch_attempts da
          JOIN draft_letters d ON d.id = da.draft_id
          WHERE d.session_id = s.id
            AND da.state = 'unknown'
            AND da.updated_at > NOW() - INTERVAL '30 days'
        ) AS ambiguous_dispatches,
        (
          SELECT MIN(da.updated_at)::text
          FROM dispatch_attempts da
          JOIN draft_letters d ON d.id = da.draft_id
          WHERE d.session_id = s.id
            AND da.state = 'unknown'
            AND da.updated_at > NOW() - INTERVAL '30 days'
        ) AS ambiguous_dispatches_first,
        (
          SELECT MAX(da.updated_at)::text
          FROM dispatch_attempts da
          JOIN draft_letters d ON d.id = da.draft_id
          WHERE d.session_id = s.id
            AND da.state = 'unknown'
            AND da.updated_at > NOW() - INTERVAL '30 days'
        ) AS ambiguous_dispatches_last,
        (
          SELECT se.details->>'level'
          FROM support_events se
          WHERE se.session_id = s.id
            AND se.event_type = 'escalation_marked'
          ORDER BY se.created_at DESC
          LIMIT 1
        ) AS escalation_level,
        (
          SELECT se.details->>'note'
          FROM support_events se
          WHERE se.session_id = s.id
            AND se.event_type = 'escalation_marked'
          ORDER BY se.created_at DESC
          LIMIT 1
        ) AS escalation_note,
        (
          SELECT se.created_at::text
          FROM support_events se
          WHERE se.session_id = s.id
            AND se.event_type = 'escalation_marked'
          ORDER BY se.created_at DESC
          LIMIT 1
        ) AS escalation_updated_at
      FROM sessions s
      WHERE s.created_at > NOW() - INTERVAL '30 days'
      ORDER BY s.created_at DESC
      LIMIT 200
    `);

    const cases: AdminSuspiciousCase[] = rows.rows.flatMap((row) => {
      const signals: SuspiciousSignalCounts = {
        failedPayments: Number(row.failed_payments ?? 0),
        refunds: Number(row.refunds ?? 0),
        rejectedDispatches: Number(row.rejected_dispatches ?? 0),
        ambiguousDispatches: Number(row.ambiguous_dispatches ?? 0),
      };

      const categories = deriveSuspiciousCategories(signals);
      if (categories.length === 0) {
        return [];
      }

      const windows: SuspiciousWindow[] = [];
      if (signals.failedPayments > 0) {
        windows.push({
          firstSeenAt: row.failed_payments_first,
          lastSeenAt: row.failed_payments_last,
        });
      }
      if (signals.refunds > 0) {
        windows.push({
          firstSeenAt: row.refunds_first,
          lastSeenAt: row.refunds_last,
        });
      }
      if (signals.rejectedDispatches > 0) {
        windows.push({
          firstSeenAt: row.rejected_dispatches_first,
          lastSeenAt: row.rejected_dispatches_last,
        });
      }
      if (signals.ambiguousDispatches > 0) {
        windows.push({
          firstSeenAt: row.ambiguous_dispatches_first,
          lastSeenAt: row.ambiguous_dispatches_last,
        });
      }

      const resolvedWindow = resolveSuspiciousWindow(windows);

      return [
        {
          sessionId: row.session_id,
          draftId: row.latest_draft_id,
          email: row.email,
          locale: row.locale,
          latestDraftStatus: row.latest_draft_status,
          categories,
          firstSeenAt:
            resolvedWindow.firstSeenAt === new Date(0).toISOString()
              ? row.session_created_at
              : resolvedWindow.firstSeenAt,
          lastSeenAt:
            resolvedWindow.lastSeenAt === new Date(0).toISOString()
              ? row.session_created_at
              : resolvedWindow.lastSeenAt,
          escalationLevel: normalizeEscalationLevel(row.escalation_level),
          escalationNote: row.escalation_note,
          escalationUpdatedAt: row.escalation_updated_at,
          signals,
        },
      ];
    });

    const response: AdminSuspiciousQueueResponse = {
      cases,
      total: cases.length,
      generatedAt: new Date().toISOString(),
    };

    reply.send(response);
  });

  app.post<{ Params: { id: string } }>(
    "/admin/sessions/:id/escalation",
    async (request, reply) => {
      const db = getDb();
      const { id } = request.params;
      const body = request.body as { level?: string; note?: string } | null;

      if (!body?.level || !isSupportedEscalationLevel(body.level)) {
        throw validationError("A supported escalation level is required.");
      }

      if (!body?.note || typeof body.note !== "string" || body.note.trim().length < 5) {
        throw validationError("A note is required when setting escalation (min 5 chars).");
      }

      const [session] = await db
        .select({ id: schema.sessions.id })
        .from(schema.sessions)
        .where(eq(schema.sessions.id, id))
        .limit(1);

      if (!session) {
        throw notFoundError("session");
      }

      await recordSupportEvent(db, {
        sessionId: id,
        eventType: "escalation_marked",
        actor: request.admin!.actor,
        details: {
          level: body.level,
          note: body.note.trim(),
        },
      });

      reply.send({
        ok: true,
        sessionId: id,
        level: body.level,
      });
    },
  );
}
