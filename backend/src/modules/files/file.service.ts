import { eq, and, sql } from "drizzle-orm";
import {
  FILE_LIMITS,
  getUploadByteLimit,
  isAllowedUploadMimeType,
  type DraftAttachmentConstraints,
} from "@episto/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError, validationError } from "../../shared/errors/index.js";
import {
  createAttachmentLimitError,
  createAttachmentMimeTypeError,
} from "../dispatch/adapters/provider-capabilities.js";
import { getDispatchAdapter } from "../dispatch/adapters/postal.adapter.js";

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

  return {
    ...attachmentPolicy,
    maxFileBytes: getUploadByteLimit("attachment"),
    maxTotalBytes: FILE_LIMITS.totalDraftUploadBytes,
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

export async function getDraftUploadTotalBytes(
  db: Db,
  draftId: string,
  sessionId: string,
): Promise<number> {
  const [row] = await db
    .select({ totalBytes: sql<number>`coalesce(sum(${schema.fileAssets.sizeBytes}), 0)` })
    .from(schema.fileAssets)
    .where(
      and(
        eq(schema.fileAssets.draftId, draftId),
        eq(schema.fileAssets.sessionId, sessionId),
        eq(schema.fileAssets.status, "active"),
      ),
    );

  return Number(row?.totalBytes ?? 0);
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

    if (data.sizeBytes > getUploadByteLimit(data.kind)) {
      throw validationError(
        data.kind === "attachment"
          ? "Attachment exceeds maximum size of 5 MB"
          : "Signature exceeds maximum size of 2 MB",
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
  const asset = await getFileAsset(db, fileId, sessionId);
  if (!asset) throw notFoundError("file");

  await db
    .update(schema.fileAssets)
    .set({
      status: "deleted",
      deletedAt: new Date(),
    })
    .where(
      and(eq(schema.fileAssets.id, fileId), eq(schema.fileAssets.sessionId, sessionId)),
    );
}
