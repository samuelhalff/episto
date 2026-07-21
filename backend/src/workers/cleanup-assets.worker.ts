import type { Job, Worker } from "bullmq";
import { eq, lt, sql } from "drizzle-orm";
import { createWorker, QUEUE_NAMES, type CleanupAssetsJob } from "../queue/index.js";
import { createLogger } from "../shared/logging/index.js";
import { getDb } from "../db/index.js";
import { schema } from "../db/index.js";
import { env } from "../shared/config/index.js";
import { deleteObject } from "../modules/files/adapters/s3.adapter.js";

const logger = createLogger("cleanup-assets-worker");

/**
 * Cleanup-expired-assets worker — enforces configurable retention policies.
 *
 * Trigger: Scheduled (e.g., every hour via a cron-like BullMQ repeatable job).
 * Steps:
 *   1. Find expired sessions
 *   2. Find file assets with pending_deletion status
 *   3. Delete objects from S3 and mark as deleted
 *   4. Mark dispatched PDFs as pending_deletion (PDF_RETENTION_HOURS_POST_DISPATCH after dispatch)
 *   5. Mark old non-PDF active file assets as pending_deletion (CONTENT_RETENTION_DAYS)
 */
export function startCleanupAssetsWorker(): Worker<CleanupAssetsJob> {
  return createWorker<CleanupAssetsJob>(
    QUEUE_NAMES.CLEANUP_ASSETS,
    async (job: Job<CleanupAssetsJob>) => {
      const batchSize = job.data.batchSize || 100;
      const db = getDb();
      const config = env();

      logger.info({ batchSize }, "Starting asset cleanup");

      let deletedFiles = 0;
      let expiredSessions = 0;

      // 1. Clean up expired sessions
      const now = new Date();
      const expiredSessionRows = await db
        .select({ id: schema.sessions.id })
        .from(schema.sessions)
        .where(lt(schema.sessions.expiresAt, now))
        .limit(batchSize);

      expiredSessions = expiredSessionRows.length;

      // 2. Find file assets with pending_deletion status (marked by previous runs or retention logic)
      const pendingDeletion = await db
        .select({
          id: schema.fileAssets.id,
          storageKey: schema.fileAssets.storageKey,
        })
        .from(schema.fileAssets)
        .where(eq(schema.fileAssets.status, "pending_deletion"))
        .limit(batchSize);

      // 3. Delete from S3 and update status
      for (const asset of pendingDeletion) {
        try {
          await deleteObject(asset.storageKey);
          await db
            .update(schema.fileAssets)
            .set({ status: "deleted", deletedAt: now })
            .where(eq(schema.fileAssets.id, asset.id));
          deletedFiles++;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          logger.error(
            { assetId: asset.id, storageKey: asset.storageKey, err: message },
            "Failed to delete asset from storage",
          );
          // Continue with other assets — don't fail the whole batch
        }
      }

      // 4. Mark dispatched PDF assets (rendered_pdf, signed_pdf) as pending_deletion
      //    based on PDF_RETENTION_HOURS_POST_DISPATCH after the dispatch submission time.
      const pdfRetentionHours = config.PDF_RETENTION_HOURS_POST_DISPATCH;

      const pdfResult = await db.execute<{ id: string }>(sql`
        UPDATE file_assets
        SET status = 'pending_deletion'
        WHERE id IN (
          SELECT fa.id FROM file_assets fa
          INNER JOIN dispatch_attempts da ON fa.draft_id = da.draft_id
          WHERE fa.kind IN ('rendered_pdf', 'signed_pdf')
            AND fa.status = 'active'
            AND da.submitted_at IS NOT NULL
            AND da.submitted_at < NOW() - make_interval(hours => ${pdfRetentionHours})
          LIMIT ${batchSize}
        )
        RETURNING id
      `);
      const pdfMarkedForDeletion = pdfResult.rows;

      // 5. Mark old non-PDF active file assets as pending_deletion based on CONTENT_RETENTION_DAYS
      const contentRetentionDays = config.CONTENT_RETENTION_DAYS;

      const contentResult = await db.execute<{ id: string }>(sql`
        UPDATE file_assets
        SET status = 'pending_deletion'
        WHERE id IN (
          SELECT id FROM file_assets
          WHERE status = 'active'
            AND kind NOT IN ('rendered_pdf', 'signed_pdf')
            AND created_at < NOW() - make_interval(days => ${contentRetentionDays})
          LIMIT ${batchSize}
        )
        RETURNING id
      `);
      const contentMarkedForDeletion = contentResult.rows;

      logger.info(
        {
          deletedFiles,
          pdfMarkedForDeletion: pdfMarkedForDeletion.length,
          contentMarkedForDeletion: contentMarkedForDeletion.length,
          expiredSessions,
        },
        "Asset cleanup complete",
      );

      job.log(
        `Cleanup: ${deletedFiles} files deleted, ${pdfMarkedForDeletion.length} PDFs marked for deletion, ${contentMarkedForDeletion.length} content assets marked for deletion, ${expiredSessions} expired sessions found`,
      );
    },
    { concurrency: 1 },
  );
}
