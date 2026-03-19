import type { Job, Worker } from "bullmq";
import { and, eq, lt } from "drizzle-orm";
import {
  createWorker,
  QUEUE_NAMES,
  type CleanupAssetsJob,
} from "../queue/index.js";
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
 *   1. Find expired sessions and their drafts
 *   2. Mark file assets as pending_deletion
 *   3. Delete objects from S3
 *   4. Mark file assets as deleted
 *   5. Clean up expired session records
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

      // 4. Mark old active file assets as pending_deletion based on retention policy
      const contentRetentionDays = config.CONTENT_RETENTION_DAYS;
      const contentCutoff = new Date(
        now.getTime() - contentRetentionDays * 24 * 60 * 60 * 1000,
      );

      const markedForDeletion = await db
        .update(schema.fileAssets)
        .set({ status: "pending_deletion" })
        .where(
          and(
            eq(schema.fileAssets.status, "active"),
            lt(schema.fileAssets.createdAt, contentCutoff),
          ),
        )
        .returning({ id: schema.fileAssets.id });

      logger.info(
        {
          deletedFiles,
          markedForDeletion: markedForDeletion.length,
          expiredSessions,
        },
        "Asset cleanup complete",
      );

      job.log(
        `Cleanup: ${deletedFiles} files deleted, ${markedForDeletion.length} marked for deletion, ${expiredSessions} expired sessions found`,
      );
    },
    { concurrency: 1 },
  );
}
