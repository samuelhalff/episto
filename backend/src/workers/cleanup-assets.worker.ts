import type { Job, Worker } from "bullmq";
import { eq, inArray, sql } from "drizzle-orm";
import { createWorker, QUEUE_NAMES, type CleanupAssetsJob } from "../queue/index.js";
import { createLogger } from "../shared/logging/index.js";
import { getDb, type Db } from "../db/index.js";
import { schema } from "../db/index.js";
import { env } from "../shared/config/index.js";
import { deleteObject, listObjects } from "../modules/files/adapters/s3.adapter.js";
import { SWEPT_PREFIXES, deleteUnownedObject } from "../modules/files/file.service.js";
import { purgeExpiredConversations } from "../modules/drafting/conversation-retention.service.js";
import { retireDraftAssets, retireDraftlessAssets } from "./asset-retention.js";

const logger = createLogger("cleanup-assets-worker");

/**
 * How old an untracked object must be before the sweep will remove it. An
 * upload writes the object first and the row second, so a young orphan is
 * usually just an upload in progress.
 */
const ORPHAN_GRACE_MS = 60 * 60 * 1000;

/** How many keys one `storage_key IN (...)` lookup may carry. */
const ORPHAN_BATCH_SIZE = 200;

/**
 * Delete objects that no `file_assets` row points at.
 *
 * Retention is row-driven, so an object without a row is retained forever.
 * Production had four rendered letters and four signature images in exactly
 * that state (docs/data-retention.md, F2).
 */
export async function sweepOrphanedObjects(db: Db, graceMs: number): Promise<number> {
  const cutoff = Date.now() - graceMs;
  let removed = 0;

  for (const prefix of SWEPT_PREFIXES) {
    const objects = await listObjects(prefix);
    const candidates = objects.filter((object) => {
      // An object whose age we cannot establish is never swept. Treating an
      // unknown timestamp as "old" would make the grace window meaningless for
      // exactly the objects we know least about.
      const lastModified = object.lastModified?.getTime();
      return lastModified !== undefined && lastModified < cutoff;
    });

    // Bounded batches: a bucket can hold far more keys than one `IN (...)` can
    // carry, and a query that fails on parameter count stops cleanup entirely.
    for (let i = 0; i < candidates.length; i += ORPHAN_BATCH_SIZE) {
      const batch = candidates.slice(i, i + ORPHAN_BATCH_SIZE);
      const known = await db
        .select({ storageKey: schema.fileAssets.storageKey })
        .from(schema.fileAssets)
        .where(
          inArray(
            schema.fileAssets.storageKey,
            batch.map((object) => object.key),
          ),
        );
      const knownKeys = new Set(known.map((row) => row.storageKey));

      for (const object of batch) {
        if (knownKeys.has(object.key)) continue;
        try {
          // Everything that makes this safe lives in deleteUnownedObject: the
          // ownership re-check (render keys are deterministic, so a re-render
          // can claim this exact key between the batch query and here), and the
          // conditional delete against the object we actually looked at. The
          // cutoff goes with it — the listing above may be minutes old by now,
          // and an object rewritten since then is no longer an orphan.
          const outcome = await deleteUnownedObject(db, object.key, {
            unchangedSince: new Date(cutoff),
          });

          if (outcome === "deleted") {
            removed++;
            logger.warn(
              { storageKey: object.key },
              "Deleted orphaned object with no file_assets row",
            );
          } else if (outcome === "unverifiable") {
            logger.error(
              { storageKey: object.key },
              "Storage would not identify an orphan candidate; left in place",
            );
          }
        } catch (err) {
          logger.error(
            {
              storageKey: object.key,
              err: err instanceof Error ? err.message : "unknown",
            },
            "Failed to delete orphaned object",
          );
        }
      }
    }
  }

  return removed;
}

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

      // 1. Retire the content of expired sessions. This used to select the
      //    expired sessions, count them, and do nothing — while logging a
      //    number that read like work had happened. Sessions expire after
      //    SESSION_TTL_HOURS, so this is what actually collects the documents
      //    of an abandoned draft.
      //    Session expiry says nothing about dispatch: a paid letter whose
      //    retry is still queued sits on a session that expires on schedule
      //    like any other, so this step needs the same serialisation as the
      //    dispatch-driven ones below.
      const now = new Date();
      const expiredCandidate = sql`
        fa.status = 'active'
        AND EXISTS (
          SELECT 1 FROM sessions s
          WHERE s.id = fa.session_id AND s.expires_at < NOW()
        )`;
      const expired = await retireDraftAssets(db, batchSize, expiredCandidate);
      const draftlessExpired = await retireDraftlessAssets(
        db,
        batchSize,
        expiredCandidate,
      );
      const expiredSessionAssets = expired.assetIds.length + draftlessExpired.length;

      // 2. Collect the rows waiting for their object to go, oldest first. A
      //    permanently failing asset would otherwise be re-picked at the head
      //    of every run and starve everything behind it; `updated_at` moves on
      //    each attempt, so a failure goes to the back of the queue.
      const pendingDeletion = await db
        .select({
          id: schema.fileAssets.id,
          storageKey: schema.fileAssets.storageKey,
        })
        .from(schema.fileAssets)
        .where(eq(schema.fileAssets.status, "pending_deletion"))
        .orderBy(
          sql`${schema.fileAssets.deletionFailedAt} ASC NULLS FIRST`,
          schema.fileAssets.createdAt,
        )
        .limit(batchSize);

      // 3. Delete from S3 and update status
      for (const asset of pendingDeletion) {
        try {
          await deleteObject(asset.storageKey);
          await db
            .update(schema.fileAssets)
            .set({ status: "deleted", deletedAt: now, extractedText: null })
            .where(eq(schema.fileAssets.id, asset.id));
          deletedFiles++;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          logger.error(
            { assetId: asset.id, storageKey: asset.storageKey, err: message },
            "Failed to delete asset from storage",
          );
          // Record the failure so this asset moves to the back of the queue,
          // then continue — one bad object must not fail the whole batch.
          await db
            .update(schema.fileAssets)
            .set({ deletionFailedAt: now })
            .where(eq(schema.fileAssets.id, asset.id));
        }
      }

      // 4. Mark dispatched PDF assets (rendered_pdf, signed_pdf) as pending_deletion
      //    based on PDF_RETENTION_HOURS_POST_DISPATCH after the dispatch submission time.
      const pdfRetentionHours = config.PDF_RETENTION_HOURS_POST_DISPATCH;

      // A draft can have several dispatch attempts. Joining on draft_id matched
      // the asset once per attempt (burning the LIMIT on duplicates) and let an
      // old submitted attempt retire content a newer, still-unsubmitted attempt
      // is about to need. EXISTS + "nothing still waiting to go out" says what
      // is actually meant: the letter is on its way and nothing is queued.
      const pdfMarkedForDeletion = await retireDraftAssets(
        db,
        batchSize,
        sql`
          fa.kind IN ('rendered_pdf', 'signed_pdf')
          AND fa.status = 'active'
          AND EXISTS (
            SELECT 1 FROM dispatch_attempts da
            WHERE da.draft_id = fa.draft_id
              AND da.submitted_at IS NOT NULL
              AND da.submitted_at < NOW() - make_interval(hours => ${pdfRetentionHours})
          )`,
      );

      // 5. Purge the text we read out of dispatched drafts' attachments. The
      //    extracted text exists to help write the letter; once the letter has
      //    gone out it has no purpose, so it goes immediately rather than
      //    waiting for the object to be swept.
      //    Rows already marked `deleted` are included: before this worker
      //    cleared the column on deletion, a deleted file could keep its text
      //    forever, and those rows are still out there.
      //    The row is already on its way out, so nothing is racing for it and
      //    it needs no draft lock.
      const purgedRetiredText = await db.execute<{ id: string }>(sql`
        UPDATE file_assets
        SET extracted_text = NULL
        WHERE id IN (
          SELECT fa.id FROM file_assets fa
          WHERE fa.extracted_text IS NOT NULL
            AND fa.status IN ('pending_deletion', 'deleted')
          LIMIT ${batchSize}
        )
        RETURNING id
      `);

      //    Text belonging to a still-active attachment is a different matter:
      //    a queued retry may need it to redraft the letter, so it goes
      //    through the same lock protocol as the object steps.
      const purgedDispatchedText = await retireDraftAssets(
        db,
        batchSize,
        sql`
          fa.extracted_text IS NOT NULL
          AND fa.kind = 'attachment'
          AND EXISTS (
            SELECT 1 FROM dispatch_attempts da
            WHERE da.draft_id = fa.draft_id AND da.submitted_at IS NOT NULL
          )`,
        sql`extracted_text = NULL`,
      );

      // 6. Mark dispatched attachments and signatures as pending_deletion. The
      //    user's own documents are enclosed with the letter, so they are only
      //    needed until it is on its way — retention runs from dispatch, not
      //    from upload, which is why this is separate from step 7.
      const attachmentRetentionHours = config.ATTACHMENT_RETENTION_HOURS_POST_DISPATCH;

      const dispatchedContent = await retireDraftAssets(
        db,
        batchSize,
        sql`
          fa.kind IN ('attachment', 'signature')
          AND fa.status = 'active'
          AND EXISTS (
            SELECT 1 FROM dispatch_attempts da
            WHERE da.draft_id = fa.draft_id
              AND da.submitted_at IS NOT NULL
              AND da.submitted_at < NOW() - make_interval(hours => ${attachmentRetentionHours})
          )`,
      );

      // 7. Backstop for content nothing else collects — a draft that was never
      //    dispatched and whose session somehow outlived its TTL.
      //    This retires attachments on age alone, which made it the widest
      //    path by which a queued dispatch could lose its enclosure: an old
      //    letter whose retry is only now going out is exactly the case it
      //    matches. It gets the guard too.
      const contentRetentionDays = config.CONTENT_RETENTION_DAYS;

      const staleCandidate = sql`
        fa.status = 'active'
        AND fa.kind NOT IN ('rendered_pdf', 'signed_pdf')
        AND fa.created_at < NOW() - make_interval(days => ${contentRetentionDays})`;
      const staleContent = await retireDraftAssets(db, batchSize, staleCandidate);
      const draftlessStaleContent = await retireDraftlessAssets(
        db,
        batchSize,
        staleCandidate,
      );
      const contentMarkedForDeletion =
        staleContent.assetIds.length + draftlessStaleContent.length;

      // 8. Reconcile storage against the database. Everything above iterates
      //    file_assets rows, so an object with no row is invisible to all of it
      //    and would be kept forever. Only objects older than the grace window
      //    are considered, so an upload that is still mid-flight is never
      //    pulled out from under itself.
      const orphanedObjects = await sweepOrphanedObjects(db, ORPHAN_GRACE_MS);

      // 9. Collect the conversation itself. Everything above retires the
      //    documents; the user's own description of their situation lived in
      //    conversation_messages with no schedule at all, so an abandoned
      //    draft kept it indefinitely.
      const purgedConversationMessages = await purgeExpiredConversations(
        db,
        config.CONVERSATION_RETENTION_DAYS,
        batchSize,
      );

      logger.info(
        {
          deletedFiles,
          orphanedObjects,
          purgedConversationMessages,
          purgedExtractedText:
            purgedRetiredText.rows.length + purgedDispatchedText.assetIds.length,
          dispatchedContentMarked: dispatchedContent.assetIds.length,
          pdfMarkedForDeletion: pdfMarkedForDeletion.assetIds.length,
          contentMarkedForDeletion,
          // Drafts skipped because a dispatch held their lock. Retention is
          // idempotent and the next run picks them up, but a number that never
          // falls means something holds draft locks far too long.
          deferredDrafts:
            expired.deferredDrafts +
            pdfMarkedForDeletion.deferredDrafts +
            purgedDispatchedText.deferredDrafts +
            dispatchedContent.deferredDrafts +
            staleContent.deferredDrafts,
          // Assets retired because their session expired — not a session count.
          // The old field was named `expiredSessions` while holding this
          // number, which made a no-op step read like work had happened.
          expiredSessionAssets,
        },
        "Asset cleanup complete",
      );

      job.log(
        `Cleanup: ${deletedFiles} files deleted, ${pdfMarkedForDeletion.assetIds.length} PDFs marked for deletion, ${contentMarkedForDeletion} content assets marked for deletion, ${expiredSessionAssets} assets retired from expired sessions`,
      );
    },
    { concurrency: 1 },
  );
}
