import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import type { AdminRetentionInfo } from "@swiss-mail/shared";

export async function adminRetentionRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin/retention", async (_request, reply) => {
    const db = getDb();
    const config = env();

    const contentDays = config.CONTENT_RETENTION_DAYS;
    const sessionHours = config.SESSION_TTL_HOURS;
    const pdfHours = config.PDF_RETENTION_HOURS_POST_DISPATCH;
    const auditDays = config.METADATA_RETENTION_YEARS * 365;

    const [expiredSessions, expiredContent, expiredPdfs, recentCleanups] =
      await Promise.all([
        db.execute<{ count: number }>(sql`
          SELECT COUNT(*)::int AS count FROM sessions
          WHERE expires_at IS NOT NULL AND expires_at <= NOW()
        `),
        db.execute<{ count: number }>(sql`
          SELECT COUNT(*)::int AS count FROM draft_letters
          WHERE status = 'closed'
            AND subject != '[REDACTED]'
            AND updated_at < NOW() - ${sql.raw(`INTERVAL '${contentDays} days'`)}
        `),
        db.execute<{ count: number }>(sql`
          SELECT COUNT(*)::int AS count FROM file_assets
          WHERE kind = 'rendered_pdf'
            AND status = 'active'
            AND created_at < NOW() - ${sql.raw(`INTERVAL '${pdfHours} hours'`)}
        `),
        db.execute<{ event_type: string; count: number; ran_at: string }>(sql`
          SELECT
            event_type,
            COUNT(*)::int AS count,
            MAX(created_at)::text AS ran_at
          FROM support_events
          WHERE event_type IN ('retention_cleanup', 'data_cleared', 'data_deletion_executed')
            AND created_at > NOW() - INTERVAL '7 days'
          GROUP BY event_type
          ORDER BY ran_at DESC
        `),
      ]);

    const response: AdminRetentionInfo = {
      contentRetentionDays: contentDays,
      sessionTtlHours: sessionHours,
      pdfRetentionHours: pdfHours,
      auditRetentionDays: auditDays,
      recentCleanups: recentCleanups.rows.map((r) => ({
        type: r.event_type,
        count: Number(r.count),
        ranAt: r.ran_at,
      })),
      pendingExpirations: {
        expiredSessions: Number(expiredSessions.rows[0]?.count ?? 0),
        expiredContent: Number(expiredContent.rows[0]?.count ?? 0),
        expiredPdfs: Number(expiredPdfs.rows[0]?.count ?? 0),
      },
      generatedAt: new Date().toISOString(),
    };
    reply.send(response);
  });
}
