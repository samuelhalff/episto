import { eq, and, sql } from "drizzle-orm";
import { isAllowedUploadMimeType, type DraftAttachmentConstraints } from "@episto/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError, validationError } from "../../shared/errors/index.js";
import {
  createAttachmentLimitError,
  createAttachmentMimeTypeError,
} from "../dispatch/adapters/provider-capabilities.js";
import { getDispatchAdapter } from "../dispatch/adapters/postal.adapter.js";
import { deleteObjectIfUnchanged, headObject } from "./adapters/s3.adapter.js";
import { lockDraftForFileChange } from "./draft-file-lock.js";
import {
  formatByteLimitMb,
  getConfiguredFileLimits,
  getConfiguredUploadByteLimit,
} from "./file-limits.js";

// ---------------------------------------------------------------------------
// Orphan safety
// ---------------------------------------------------------------------------

interface OrphanLogger {
  warn: (obj: Record<string, unknown>, msg: string) => void;
}

/**
 * Every prefix this application writes to, in one place, so that "which objects
 * do we own?" has a single answer. A prefix that exists in a key builder but
 * not here is an object class nothing ever reconciles.
 */
export const STORAGE_PREFIXES = {
  attachments: "attachments/",
  signatures: "signatures/",
  renders: "renders/",
  signedDocuments: "signed-documents/",
  receipts: "receipts/",
} as const;

/**
 * The prefixes the orphan sweep may delete from.
 *
 * `receipts/` is deliberately excluded: VAT receipts are accounting records
 * kept under Swiss bookkeeping duty, not user content on this retention
 * schedule. Everything else the app writes belongs here — `signed-documents/`
 * was missing, so an orphaned signed PDF survived every sweep.
 */
export const SWEPT_PREFIXES = [
  STORAGE_PREFIXES.attachments,
  STORAGE_PREFIXES.signatures,
  STORAGE_PREFIXES.renders,
  STORAGE_PREFIXES.signedDocuments,
] as const;

/**
 * The prefixes an unowned object may be deleted from at all.
 *
 * Same list as `SWEPT_PREFIXES`, and deliberately so: "may this object be
 * deleted without a row telling us to?" must have one answer, whether the
 * question comes from the hourly sweep or from a compensating delete
 * milliseconds after a failed upload. `receipts/` is outside it because a VAT
 * receipt is an accounting record under Swiss bookkeeping duty — an orphaned
 * receipt object that nobody ever deletes costs us a few kilobytes; a receipt
 * deleted by a racing cleanup costs us a record we are legally required to
 * produce. Nothing in the identity checks below is airtight enough to bet that
 * record on, so receipts are never deleted speculatively at all.
 */
const DELETABLE_PREFIXES = SWEPT_PREFIXES;

function isDeletableStorageKey(storageKey: string): boolean {
  return DELETABLE_PREFIXES.some((prefix) => storageKey.startsWith(prefix));
}

/**
 * Why a speculative delete did or did not happen.
 *
 * Everything except `deleted` means the object was left in place. Only
 * `unverifiable` is a reason to look: it means storage would not tell us which
 * object we were about to remove.
 */
export type UnownedDeleteOutcome =
  | "deleted"
  | "owned"
  | "protected"
  | "changed"
  | "missing"
  | "unverifiable";

/**
 * Delete an object that no row owns — and only if it is still that object.
 *
 * The hard part is that our keys are deterministic (`renders/{draftId}/
 * {version}.pdf`), so the key we decided was an orphan can be claimed by a new
 * upload while we are deciding. A plain "check the DB, then delete" leaves that
 * window open, and it ends with a live row pointing at an object we removed.
 *
 * So the delete is conditional on the object's ETag, read immediately before:
 * a rewrite between our look and our delete changes the ETag and the delete
 * fails harmlessly. Callers that know how old the object should be pass
 * `unchangedSince`, which catches a rewrite that landed before we looked.
 *
 * This narrows the window rather than closing it: a rewrite with byte-identical
 * content after our HEAD keeps the same ETag. Our PDFs are deterministic, so
 * that is not hypothetical — which is exactly why the objects we cannot afford
 * to lose are excluded by prefix instead of protected by this check.
 */
export async function deleteUnownedObject(
  db: Db,
  storageKey: string,
  options?: { unchangedSince?: Date },
): Promise<UnownedDeleteOutcome> {
  if (!isDeletableStorageKey(storageKey)) return "protected";
  if (await isStorageKeyOwned(db, storageKey)) return "owned";

  const head = await headObject(storageKey);
  if (head === null) return "missing";
  if (head.eTag === null) return "unverifiable";

  const unchangedSince = options?.unchangedSince;
  if (unchangedSince !== undefined) {
    // No timestamp, or a fresher one than the listing showed: someone has
    // written here since we made our decision.
    if (head.lastModified === null) return "unverifiable";
    if (head.lastModified.getTime() >= unchangedSince.getTime()) return "changed";
  }

  return (await deleteObjectIfUnchanged(storageKey, head.eTag)) ? "deleted" : "changed";
}

/**
 * Is any row still pointing at this object?
 *
 * This is the definition of "not an orphan", and both the sweep and the
 * compensating delete below must use the same one. `receipts` is checked as
 * well as `file_assets` because receipts live outside `file_assets` entirely,
 * and a receipt is the single object we must never delete by accident.
 */
export async function isStorageKeyOwned(db: Db, storageKey: string): Promise<boolean> {
  const [asset] = await db
    .select({ id: schema.fileAssets.id })
    .from(schema.fileAssets)
    .where(eq(schema.fileAssets.storageKey, storageKey))
    .limit(1);
  if (asset) return true;

  const [receipt] = await db
    .select({ id: schema.receipts.id })
    .from(schema.receipts)
    .where(eq(schema.receipts.storageKey, storageKey))
    .limit(1);
  return Boolean(receipt);
}

/**
 * Run the DB work that registers an already-uploaded object, and delete that
 * object if the work fails.
 *
 * Uploads write to storage first and insert the `file_assets` row second. That
 * ordering is deliberate — a row must never point at an object that is not
 * there — but it means a failure in between leaves an object nothing points at.
 * Retention iterates rows, so such an object is invisible to it and is kept
 * forever. Four rendered letters and four signature images leaked this way
 * before the sweep existed (docs/data-retention.md, F2).
 *
 * The compensating delete is only safe for an object we actually orphaned.
 * Render and receipt keys are deterministic (`renders/{draftId}/{version}.pdf`,
 * `receipts/{paymentAttemptId}.pdf`), so a retry writes over an object a
 * previous, successful registration already owns — and `storage_key` is unique,
 * so that retry's insert then fails. Deleting on that failure would destroy a
 * live letter, or a VAT receipt we are legally required to keep. So the delete
 * goes through `deleteUnownedObject`, which refuses protected prefixes, asks
 * who owns the key, and makes the delete conditional on the object still being
 * the one it looked at.
 */
export async function withOrphanCleanup<T>(
  db: Db,
  storageKey: string,
  logger: OrphanLogger,
  register: () => Promise<T>,
): Promise<T> {
  try {
    return await register();
  } catch (err) {
    try {
      const outcome = await deleteUnownedObject(db, storageKey);
      if (outcome !== "deleted") {
        logger.warn(
          { storageKey, outcome },
          "Registration failed but the object was left in place",
        );
      }
    } catch {
      // The orphan sweep is the backstop when even this fails.
      logger.warn({ storageKey }, "Failed to remove orphaned object after failed upload");
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileAssetRow {
  id: string;
  sessionId: string;
  draftId: string | null;
  kind: string;
  storageKey: string;
  originalFilename: string | null;
  mimeType: string;
  sizeBytes: number;
  sortOrder: number | null;
  status: string;
  deletedAt: Date | null;
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Storage key generation
// ---------------------------------------------------------------------------

export function attachmentStorageKey(sessionId: string, fileId: string): string {
  return `attachments/${sessionId}/${fileId}`;
}

export function signatureStorageKey(sessionId: string, fileId: string): string {
  return `signatures/${sessionId}/${fileId}`;
}

export function renderStorageKey(draftId: string, version: number): string {
  return `renders/${draftId}/${version}.pdf`;
}

export function signedPdfStorageKey(draftId: string, signatureSessionId: string): string {
  return `signed-documents/${draftId}/${signatureSessionId}.pdf`;
}

export function getDraftAttachmentConstraints(): DraftAttachmentConstraints {
  const attachmentPolicy = getDispatchAdapter().getCapabilities().attachmentPolicy;
  const limits = getConfiguredFileLimits();

  return {
    ...attachmentPolicy,
    maxFileBytes: limits.attachmentMaxBytes,
    maxTotalBytes: limits.totalDraftUploadBytes,
  };
}

const PDF_SIGNATURE = Buffer.from("%PDF-");
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

function bufferStartsWith(buffer: Buffer, signature: Buffer): boolean {
  return (
    buffer.length >= signature.length &&
    buffer.subarray(0, signature.length).equals(signature)
  );
}

function matchesDeclaredMimeType(mimeType: string, buffer: Buffer): boolean {
  switch (mimeType) {
    case "application/pdf":
      return bufferStartsWith(buffer, PDF_SIGNATURE);
    case "image/png":
      return bufferStartsWith(buffer, PNG_SIGNATURE);
    case "image/jpeg":
      return bufferStartsWith(buffer, JPEG_SIGNATURE);
    default:
      return false;
  }
}

export function assertUploadMimeMatchesContent(
  kind: "attachment" | "signature",
  mimeType: string,
  buffer: Buffer,
): void {
  if (!isAllowedUploadMimeType(kind, mimeType)) {
    return;
  }

  if (matchesDeclaredMimeType(mimeType, buffer)) {
    return;
  }

  throw validationError("File content does not match the declared MIME type", [
    {
      field: "file",
      message: `Uploaded bytes do not match ${mimeType}`,
    },
  ]);
}

// ---------------------------------------------------------------------------
// Create file asset record
// ---------------------------------------------------------------------------

export async function createFileAsset(
  db: Db,
  data: {
    sessionId: string;
    draftId?: string | null | undefined;
    kind: "attachment" | "signature" | "rendered_pdf" | "signed_pdf";
    storageKey: string;
    originalFilename?: string | null | undefined;
    mimeType: string;
    sizeBytes: number;
    sortOrder?: number | null | undefined;
  },
): Promise<FileAssetRow> {
  if (data.kind !== "rendered_pdf" && data.kind !== "signed_pdf") {
    if (data.kind === "attachment") {
      const attachmentConstraints = getDraftAttachmentConstraints();
      if (!attachmentConstraints.allowedMimeTypes.includes(data.mimeType)) {
        throw createAttachmentMimeTypeError(attachmentConstraints);
      }
    } else if (!isAllowedUploadMimeType(data.kind, data.mimeType)) {
      throw validationError("Unsupported file type for signature. Allowed: PNG, JPEG");
    }

    const maxBytes = getConfiguredUploadByteLimit(data.kind);
    if (data.sizeBytes > maxBytes) {
      const limit = formatByteLimitMb(maxBytes);
      throw validationError(
        data.kind === "attachment"
          ? `Attachment exceeds maximum size of ${limit}`
          : `Signature exceeds maximum size of ${limit}`,
      );
    }
  }

  if (data.kind === "attachment" && data.draftId) {
    const attachmentConstraints = getDraftAttachmentConstraints();
    const [existing] = await db
      .select({ total: sql<number>`count(*)` })
      .from(schema.fileAssets)
      .where(
        and(
          eq(schema.fileAssets.draftId, data.draftId),
          eq(schema.fileAssets.kind, "attachment"),
          eq(schema.fileAssets.status, "active"),
        ),
      );

    if (Number(existing?.total ?? 0) >= attachmentConstraints.maxAttachmentsPerDraft) {
      throw createAttachmentLimitError(attachmentConstraints);
    }
  }

  const [row] = await db
    .insert(schema.fileAssets)
    .values({
      sessionId: data.sessionId,
      draftId: data.draftId ?? null,
      kind: data.kind,
      storageKey: data.storageKey,
      originalFilename: data.originalFilename ?? null,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      sortOrder: data.sortOrder ?? null,
      status: "active",
    })
    .returning();

  if (!row) throw new Error("Failed to create file asset");
  return row as FileAssetRow;
}

// ---------------------------------------------------------------------------
// Get file asset (scoped to session)
// ---------------------------------------------------------------------------

export async function getFileAsset(
  db: Db,
  fileId: string,
  sessionId: string,
): Promise<FileAssetRow | null> {
  const [row] = await db
    .select()
    .from(schema.fileAssets)
    .where(
      and(
        eq(schema.fileAssets.id, fileId),
        eq(schema.fileAssets.sessionId, sessionId),
        eq(schema.fileAssets.status, "active"),
      ),
    )
    .limit(1);

  return (row as FileAssetRow | undefined) ?? null;
}

// ---------------------------------------------------------------------------
// List file assets for a draft
// ---------------------------------------------------------------------------

export async function listFileAssets(
  db: Db,
  draftId: string,
  sessionId: string,
): Promise<FileAssetRow[]> {
  const rows = await db
    .select()
    .from(schema.fileAssets)
    .where(
      and(
        eq(schema.fileAssets.draftId, draftId),
        eq(schema.fileAssets.sessionId, sessionId),
        eq(schema.fileAssets.status, "active"),
      ),
    );

  return rows as FileAssetRow[];
}

// ---------------------------------------------------------------------------
// Soft delete file asset
// ---------------------------------------------------------------------------

export async function deleteFileAsset(
  db: Db,
  fileId: string,
  sessionId: string,
): Promise<void> {
  await db.transaction(async (tx) => {
    const asset = await getFileAsset(tx, fileId, sessionId);
    if (!asset) throw notFoundError("file");

    // The guard lives here rather than in the route because the invariant
    // belongs to the data, not to one HTTP handler: past `reviewed` the letter
    // is rendered from a snapshot, so removing an enclosure can no longer
    // change what Swiss Post delivers — it can only make the app disagree with
    // the envelope. Any future caller gets the same answer without having to
    // remember to ask.
    //
    // The draft row is held exclusively from here to commit, so the answer is
    // still true when the row is retired: a review that would have snapshotted
    // this file either committed before us — and we refuse — or waits and then
    // builds its snapshot from a file list this delete is already missing from.
    // Without the lock the two only had to interleave for the snapshot to
    // capture an enclosure the app reported as deleted.
    if (asset.draftId) {
      await lockDraftForFileChange(tx, asset.draftId);
    }

    await tx
      .update(schema.fileAssets)
      .set({
        // `pending_deletion`, not `deleted`: the row stays on the cleanup
        // worker's work list until the object is physically gone. Marking it
        // deleted up front meant a failed S3 delete was never retried by
        // anything — the worker only looks at pending rows. It is already
        // invisible to the user either way, since listings only return active
        // assets.
        status: "pending_deletion",
        // Deleting a document must delete its contents too. This column holds
        // up to 12,000 characters of the user's document; leaving it behind
        // meant a "deleted" file was still readable in the database.
        extractedText: null,
      })
      .where(
        and(eq(schema.fileAssets.id, fileId), eq(schema.fileAssets.sessionId, sessionId)),
      );

    // Detaching the signature belongs to the same transaction as retiring it.
    // Done afterwards on its own connection it was a second, unlocked write
    // that could land after review had read the draft.
    if (asset.kind === "signature" && asset.draftId) {
      await tx
        .update(schema.draftLetters)
        .set({ signatureAssetId: null, updatedAt: new Date() })
        .where(
          and(
            eq(schema.draftLetters.id, asset.draftId),
            eq(schema.draftLetters.sessionId, sessionId),
          ),
        );
    }
  });
}
