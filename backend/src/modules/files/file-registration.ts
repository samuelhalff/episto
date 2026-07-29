import { and, eq } from "drizzle-orm";
import type { DraftAttachmentConstraints } from "@episto/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { validationError } from "../../shared/errors/index.js";
import { createAttachmentLimitError } from "../dispatch/adapters/provider-capabilities.js";
import { lockDraftForFileChange } from "./draft-file-lock.js";
import { formatByteLimitMb } from "./file-limits.js";

export interface ReplacedSignature {
  id: string;
  storageKey: string;
  sizeBytes: number;
}

export interface DraftUploadCapacityInput {
  draftId: string;
  sessionId: string;
  kind: "attachment" | "signature";
  sizeBytes: number;
  constraints: DraftAttachmentConstraints;
}

/**
 * Does this draft have room for one more upload — and which signature would it
 * replace?
 *
 * Called twice per upload on purpose: once before the object is written, so a
 * doomed upload is refused without spending the bytes, and once inside the
 * transaction that inserts the row, where the draft is locked and the answer is
 * the one that actually holds. The pre-flight call is an optimisation; the
 * locked call is the rule.
 */
export async function assertDraftUploadCapacity(
  db: Db,
  input: DraftUploadCapacityInput,
): Promise<{ existingSignature: ReplacedSignature | null }> {
  const existingFiles = await db
    .select({
      id: schema.fileAssets.id,
      kind: schema.fileAssets.kind,
      storageKey: schema.fileAssets.storageKey,
      sizeBytes: schema.fileAssets.sizeBytes,
    })
    .from(schema.fileAssets)
    .where(
      and(
        eq(schema.fileAssets.draftId, input.draftId),
        eq(schema.fileAssets.sessionId, input.sessionId),
        eq(schema.fileAssets.status, "active"),
      ),
    );

  if (input.kind === "attachment") {
    const attachmentCount = existingFiles.filter((f) => f.kind === "attachment").length;
    if (attachmentCount >= input.constraints.maxAttachmentsPerDraft) {
      throw createAttachmentLimitError(input.constraints);
    }
  }

  // A replaced signature's bytes are about to be freed, so they do not count
  // against the draft's budget.
  const existingSignature =
    input.kind === "signature"
      ? (existingFiles.find((f) => f.kind === "signature") ?? null)
      : null;

  const totalBytes = existingFiles.reduce((sum, file) => sum + file.sizeBytes, 0);
  const effectiveTotal = totalBytes - (existingSignature?.sizeBytes ?? 0);
  if (effectiveTotal + input.sizeBytes > input.constraints.maxTotalBytes) {
    const limit = formatByteLimitMb(input.constraints.maxTotalBytes);
    throw validationError(`Total upload exceeds maximum size of ${limit}`, [
      { field: "file", message: `Total uploads per draft cannot exceed ${limit}` },
    ]);
  }

  return { existingSignature };
}

interface RegisterInput extends DraftUploadCapacityInput {
  storageKey: string;
  originalFilename: string | null;
  mimeType: string;
}

/**
 * Register an already-uploaded object against a draft, or refuse and leave the
 * draft untouched.
 *
 * The draft row is taken exclusively before anything is read or written, which
 * is what stops an upload from landing in the gap between review reading the
 * file list and review freezing the draft. Everything the letter's file set
 * depends on — the editable check, the per-draft limits, the insert, and the
 * signature swap — happens under that one lock, so the set a snapshot sees is
 * always a set that existed at a single instant.
 */
export async function registerUploadedFileAsset(
  db: Db,
  input: RegisterInput,
): Promise<{
  row: typeof schema.fileAssets.$inferSelect;
  existingSignature: ReplacedSignature | null;
}> {
  return await db.transaction(async (tx) => {
    await lockDraftForFileChange(tx, input.draftId);

    const { existingSignature } = await assertDraftUploadCapacity(tx, input);

    const [newRow] = await tx
      .insert(schema.fileAssets)
      .values({
        sessionId: input.sessionId,
        draftId: input.draftId,
        kind: input.kind,
        storageKey: input.storageKey,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        status: "active",
        // Attachments are read by the assistant asynchronously after upload.
        extractionStatus: input.kind === "attachment" ? "pending" : null,
      })
      .returning();

    if (!newRow) throw new Error("Failed to create file asset");

    if (input.kind === "signature") {
      // Atomically set new signature + mode, soft-delete old signature
      await tx
        .update(schema.draftLetters)
        .set({
          signatureAssetId: newRow.id,
          signatureMode: "drawn",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.draftLetters.id, input.draftId),
            eq(schema.draftLetters.sessionId, input.sessionId),
          ),
        );

      if (existingSignature) {
        // pending_deletion, not deleted: the object may fail to go, and only
        // pending rows are on the cleanup worker's work list.
        await tx
          .update(schema.fileAssets)
          .set({ status: "pending_deletion" })
          .where(
            and(
              eq(schema.fileAssets.id, existingSignature.id),
              eq(schema.fileAssets.sessionId, input.sessionId),
            ),
          );
      }
    }

    return { row: newRow, existingSignature };
  });
}
