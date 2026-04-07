import type { FastifyInstance } from "fastify";
import { sql, eq } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { notFoundError } from "../../shared/errors/index.js";
import { recordSupportEvent } from "./index.js";
import type {
  AdminSessionListResponse,
  AdminSessionListItem,
} from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SessionFilters {
  status: "all" | "active" | "expired";
  page: number;
  pageSize: number;
  fromDate: string | null;
  toDate: string | null;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!ISO_DATE_RE.test(value)) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return value;
}

export function parseSessionFilters(query: Record<string, unknown>): SessionFilters {
  const status = ["all", "active", "expired"].includes(query.status as string)
    ? (query.status as SessionFilters["status"])
    : "all";
  const page = Math.max(1, Number(query.page) || 1);
  const rawSize = Number(query.pageSize) || 50;
  const pageSize = Math.min(100, Math.max(1, rawSize));
  const fromDate = parseDate(query.fromDate);
  const toDate = parseDate(query.toDate);
  return { status, page, pageSize, fromDate, toDate };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export async function adminSessionsRoutes(app: FastifyInstance): Promise<void> {

  // GET /admin/sessions — paginated session list with filters
  app.get<{ Querystring: Record<string, string> }>(
    "/admin/sessions",
    async (request, reply) => {
      const db = getDb();
      const filters = parseSessionFilters(request.query);
      const offset = (filters.page - 1) * filters.pageSize;

      const statusCond =
        filters.status === "active" ? sql`AND s.expires_at > NOW()` :
        filters.status === "expired" ? sql`AND (s.expires_at IS NOT NULL AND s.expires_at <= NOW())` :
        sql.raw("");

      const fromCond = filters.fromDate
        ? sql`AND s.created_at >= ${filters.fromDate}::timestamptz`
        : sql.raw("");

      const toCond = filters.toDate
        ? sql`AND s.created_at <= ${filters.toDate}::timestamptz`
        : sql.raw("");

      const [rows, countResult] = await Promise.all([
        db.execute<{
          id: string;
          locale: string | null;
          email: string | null;
          created_at: string;
          last_activity_at: string | null;
          draft_count: number;
          latest_draft_status: string | null;
          payment_state: string | null;
        }>(sql`
          SELECT
            s.id,
            s.locale,
            s.email,
            s.created_at::text,
            (SELECT MAX(d.updated_at) FROM draft_letters d WHERE d.session_id = s.id)::text AS last_activity_at,
            (SELECT COUNT(*) FROM draft_letters d WHERE d.session_id = s.id)::int AS draft_count,
            (SELECT d.status FROM draft_letters d WHERE d.session_id = s.id ORDER BY d.updated_at DESC LIMIT 1) AS latest_draft_status,
            (SELECT p.state FROM payment_attempts p WHERE p.session_id = s.id ORDER BY p.updated_at DESC LIMIT 1) AS payment_state
          FROM sessions s
          WHERE 1=1 ${statusCond} ${fromCond} ${toCond}
          ORDER BY s.created_at DESC
          LIMIT ${filters.pageSize} OFFSET ${offset}
        `),
        db.execute<{ count: string }>(sql`
          SELECT COUNT(*)::int AS count FROM sessions s
          WHERE 1=1 ${statusCond} ${fromCond} ${toCond}
        `),
      ]);

      const sessions: AdminSessionListItem[] = rows.rows.map((r) => ({
        id: r.id,
        locale: r.locale,
        email: r.email,
        createdAt: r.created_at,
        lastActivityAt: r.last_activity_at,
        draftCount: Number(r.draft_count),
        latestDraftStatus: r.latest_draft_status,
        paymentState: r.payment_state,
      }));

      const response: AdminSessionListResponse = {
        sessions,
        total: Number(countResult.rows[0]?.count ?? 0),
        page: filters.page,
        pageSize: filters.pageSize,
      };
      reply.send(response);
    },
  );

  // POST /admin/sessions/:id/clear — clear session content (GDPR use case)
  app.post<{ Params: { id: string }; Body: { reason: string } }>(
    "/admin/sessions/:id/clear",
    async (request, reply) => {
      const db = getDb();
      const { id } = request.params;
      const { reason } = request.body ?? {};

      if (!reason || reason.length < 5) {
        return reply.status(400).send({
          error: { code: "REASON_REQUIRED", message: "Reason must be at least 5 characters" },
        });
      }

      // Verify session exists
      const [session] = await db
        .select({ id: schema.sessions.id })
        .from(schema.sessions)
        .where(eq(schema.sessions.id, id))
        .limit(1);

      if (!session) throw notFoundError("session");

      // Clear draft content (subject, body) — preserves metadata
      const cleared = await db.execute<{ id: string }>(sql`
        UPDATE draft_letters
        SET subject = '[REDACTED]', body = '[REDACTED]', updated_at = NOW()
        WHERE session_id = ${id}
          AND (subject IS DISTINCT FROM '[REDACTED]' OR body IS DISTINCT FROM '[REDACTED]')
        RETURNING id
      `);

      // Record audit event
      await recordSupportEvent(db, {
        sessionId: id,
        eventType: "data_cleared",
        actor: request.admin!.actor,
        details: {
          reason,
          draftsCleared: cleared.rows.length,
        },
      });

      reply.send({
        cleared: cleared.rows.length,
        sessionId: id,
        message: `Cleared content for ${cleared.rows.length} draft(s). Metadata preserved.`,
      });
    },
  );
}
