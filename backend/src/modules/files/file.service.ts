import { eq, and } from "drizzle-orm";
import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { notFoundError, validationError } from "../../shared/errors/index.js";
import { AppError } from "../../shared/errors/index.js";

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
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const ALLOWED_SIGNATURE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);
const MAX_ATTACHMENTS_PER_DRAFT = 5;

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

// ---------------------------------------------------------------------------
// Create file asset record
// ---------------------------------------------------------------------------

export async function createFileAsset(
  db: Db,
  data: {
    sessionId: string;
    draftId?: string | null | undefined;
    kind: "attachment" | "signature" | "rendered_pdf";
    storageKey: string;
    originalFilename?: string | null | undefined;
    mimeType: string;
    sizeBytes: number;
    sortOrder?: number | null | undefined;
  },
): Promise<FileAssetRow> {
  // Validate file size
  if (data.sizeBytes > MAX_FILE_SIZE) {
    throw validationError("File exceeds maximum size of 10 MB");
  }

  // Validate MIME type based on kind
  if (data.kind === "attachment" && !ALLOWED_ATTACHMENT_TYPES.has(data.mimeType)) {
    throw validationError(
      "Unsupported file type for attachments. Allowed: PDF, JPEG, PNG, WebP",
    );
  }
  if (data.kind === "signature" && !ALLOWED_SIGNATURE_TYPES.has(data.mimeType)) {
    throw validationError(
      "Unsupported file type for signature. Allowed: PNG, JPEG, WebP, SVG",
    );
  }

  // Check attachment count limit
  if (data.kind === "attachment" && data.draftId) {
    const existing = await db
      .select({ id: schema.fileAssets.id })
      .from(schema.fileAssets)
      .where(
        and(
          eq(schema.fileAssets.draftId, data.draftId),
          eq(schema.fileAssets.kind, "attachment"),
          eq(schema.fileAssets.status, "active"),
        ),
      );

    if (existing.length >= MAX_ATTACHMENTS_PER_DRAFT) {
      throw new AppError({
        family: "policy_refusal",
        statusCode: 422,
        code: "ATTACHMENT_LIMIT_REACHED",
        message: `Maximum ${MAX_ATTACHMENTS_PER_DRAFT} attachments per draft`,
        userMessage: `You can attach up to ${MAX_ATTACHMENTS_PER_DRAFT} files per letter.`,
        userAction: "Remove an existing attachment before adding a new one.",
      });
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
      and(
        eq(schema.fileAssets.id, fileId),
        eq(schema.fileAssets.sessionId, sessionId),
      ),
    );
}
