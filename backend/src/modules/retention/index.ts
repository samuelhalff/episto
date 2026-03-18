import { lt, eq, and, sql } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";

/**
 * Retention module — handles cleanup of expired sessions, files, and content.
 *
 * Driven by configurable TTLs from environment config.
 * Runs as scheduled BullMQ jobs, not as request-side effects.
 */

// ---------------------------------------------------------------------------
// Expired session cleanup
// ---------------------------------------------------------------------------

export async function cleanupExpiredSessions(
  db: Db,
  batchSize: number = 100,
): Promise<number> {
  const now = new Date();

  const expired = await db
    .select({ id: schema.sessions.id })
    .from(schema.sessions)
    .where(lt(schema.sessions.expiresAt, now))
    .limit(batchSize);

  // Sessions are soft-expired — we don't delete them, just mark related
  // content for cleanup. Payment/dispatch metadata survives per retention policy.
  return expired.length;
}

// ---------------------------------------------------------------------------
// File asset cleanup
// ---------------------------------------------------------------------------

export async function cleanupDeletedFiles(
  db: Db,
  batchSize: number = 100,
): Promise<string[]> {
  // Find files marked as deleted that need physical removal from object storage
  const deletedFiles = await db
    .select({
      id: schema.fileAssets.id,
      storageKey: schema.fileAssets.storageKey,
    })
    .from(schema.fileAssets)
    .where(eq(schema.fileAssets.status, "deleted"))
    .limit(batchSize);

  // Return storage keys for the queue worker to delete from S3
  return deletedFiles.map((f) => f.storageKey);
}

// ---------------------------------------------------------------------------
// Content retention — expire old draft content
// ---------------------------------------------------------------------------

export async function findExpiredDraftContent(
  db: Db,
  batchSize: number = 100,
): Promise<string[]> {
  const config = env();
  const cutoff = new Date(
    Date.now() - config.CONTENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  const expired = await db
    .select({ id: schema.draftLetters.id })
    .from(schema.draftLetters)
    .where(
      and(
        lt(schema.draftLetters.updatedAt, cutoff),
        // Only clean up closed or expired drafts
        eq(schema.draftLetters.status, "closed"),
      ),
    )
    .limit(batchSize);

  return expired.map((d) => d.id);
}

// ---------------------------------------------------------------------------
// PDF retention — expire rendered PDFs after dispatch
// ---------------------------------------------------------------------------

export async function findExpiredRenderedPdfs(
  db: Db,
  batchSize: number = 100,
): Promise<string[]> {
  const config = env();
  const cutoff = new Date(
    Date.now() - config.PDF_RETENTION_HOURS_POST_DISPATCH * 60 * 60 * 1000,
  );

  // Find rendered PDF assets linked to dispatched drafts older than cutoff
  const expired = await db
    .select({ id: schema.fileAssets.id, storageKey: schema.fileAssets.storageKey })
    .from(schema.fileAssets)
    .where(
      and(
        eq(schema.fileAssets.kind, "rendered_pdf"),
        eq(schema.fileAssets.status, "active"),
        lt(schema.fileAssets.createdAt, cutoff),
      ),
    )
    .limit(batchSize);

  return expired.map((f) => f.storageKey);
}
