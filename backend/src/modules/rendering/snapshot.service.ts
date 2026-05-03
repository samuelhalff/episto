import { eq, sql } from "drizzle-orm";
import { SnapshotDataSchema } from "@episto/shared";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError } from "../../shared/errors/index.js";

// ---------------------------------------------------------------------------
// Snapshot service — creates immutable snapshots at review time
// ---------------------------------------------------------------------------

export interface SnapshotRow {
  id: string;
  draftId: string;
  version: number;
  schemaVersion: number;
  snapshotData: unknown;
  renderedPdfAssetId: string | null;
  createdAt: Date;
}

/**
 * Create a draft snapshot. Called when a draft transitions to "reviewed".
 * Captures the full letter state as immutable JSONB.
 */
export async function createSnapshot(
  db: Db,
  draftId: string,
  snapshotData: unknown,
): Promise<SnapshotRow> {
  const normalizedSnapshotData = SnapshotDataSchema.parse(snapshotData);

  // Get the next version number
  const [latest] = await db
    .select({ version: schema.draftSnapshots.version })
    .from(schema.draftSnapshots)
    .where(eq(schema.draftSnapshots.draftId, draftId))
    .orderBy(sql`${schema.draftSnapshots.version} DESC`)
    .limit(1);

  const nextVersion = (latest?.version ?? 0) + 1;

  const [row] = await db
    .insert(schema.draftSnapshots)
    .values({
      draftId,
      version: nextVersion,
      schemaVersion: 1,
      snapshotData: normalizedSnapshotData,
    })
    .returning();

  if (!row) throw new Error("Failed to create snapshot");
  return row as SnapshotRow;
}

/**
 * Get the latest snapshot for a draft.
 */
export async function getLatestSnapshot(
  db: Db,
  draftId: string,
): Promise<SnapshotRow | null> {
  const [row] = await db
    .select()
    .from(schema.draftSnapshots)
    .where(eq(schema.draftSnapshots.draftId, draftId))
    .orderBy(sql`${schema.draftSnapshots.version} DESC`)
    .limit(1);

  return (row as SnapshotRow | undefined) ?? null;
}

/**
 * Mark a snapshot as having a rendered PDF.
 */
export async function setSnapshotPdfAsset(
  db: Db,
  snapshotId: string,
  pdfAssetId: string,
  estimatedPages: number,
): Promise<void> {
  const [snapshot] = await db
    .select({
      id: schema.draftSnapshots.id,
      snapshotData: schema.draftSnapshots.snapshotData,
    })
    .from(schema.draftSnapshots)
    .where(eq(schema.draftSnapshots.id, snapshotId))
    .limit(1);

  if (!snapshot) throw notFoundError("snapshot");

  const snapshotData = SnapshotDataSchema.parse(snapshot.snapshotData);
  const result = await db
    .update(schema.draftSnapshots)
    .set({
      renderedPdfAssetId: pdfAssetId,
      snapshotData: {
        ...snapshotData,
        estimatedPages,
      },
    })
    .where(eq(schema.draftSnapshots.id, snapshotId))
    .returning({ id: schema.draftSnapshots.id });

  if (!result[0]) throw notFoundError("snapshot");
}
