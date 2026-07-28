import type { FastifyInstance, FastifyRequest } from "fastify";
import { eq, and } from "drizzle-orm";
import { DraftFilesResponseSchema } from "@episto/shared";
import { getDb, schema } from "../../db/index.js";
import { requireSession, getRequiredSession } from "../sessions/session.middleware.js";
import { validationError, notFoundError } from "../../shared/errors/index.js";
import {
  attachmentStorageKey,
  deleteFileAsset,
  getDraftAttachmentConstraints,
  getDraftUploadTotalBytes,
  getFileAsset,
  listFileAssets,
  signatureStorageKey,
  withOrphanCleanup,
} from "./file.service.js";
import { createAttachmentLimitError } from "../dispatch/adapters/provider-capabilities.js";
import { assertDraftAcceptsFileChanges } from "./draft-file-lock.js";
import { assertUploadAcceptable } from "./upload-validation.js";
import { formatByteLimitMb } from "./file-limits.js";
import {
  uploadObject,
  downloadObjectBuffer,
  getPresignedDownloadUrl,
  deleteObject,
} from "./adapters/s3.adapter.js";
import { ingestAttachmentInBackground } from "./attachment-ingestion.service.js";
import { parseUploadMultipartParts } from "./multipart-upload.js";
import {
  buildBlueSignatureSvgResponse,
  type DrawnSignatureAsset,
} from "../rendering/drawn-signature.js";

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

function isDrawnSignatureMimeType(
  mimeType: string,
): mimeType is DrawnSignatureAsset["mimeType"] {
  return mimeType === "image/png" || mimeType === "image/jpeg";
}

// Types we allow to be streamed inline from the app origin. Matches the upload
// allowlist; deliberately excludes anything script-capable (e.g. SVG/HTML).
const ATTACHMENT_INLINE_MIME_TYPES = new Set<string>([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

async function getValidatedSignatureImageObject(input: {
  db: ReturnType<typeof getDb>;
  fileId: string;
  sessionId: string;
}) {
  const file = await getFileAsset(input.db, input.fileId, input.sessionId);
  if (!file || file.kind !== "signature" || !file.mimeType.startsWith("image/")) {
    throw notFoundError("file");
  }

  const object = await downloadObjectBuffer(file.storageKey);
  const mimeType = object.contentType ?? file.mimeType;
  if (!isDrawnSignatureMimeType(mimeType)) {
    throw notFoundError("file");
  }

  return { file, object, mimeType };
}

export async function fileRoutes(app: FastifyInstance): Promise<void> {
  // POST /drafts/:id/files — upload attachment or signature (multipart)
  app.post<{ Params: { id: string } }>(
    "/drafts/:id/files",
    {
      preHandler: [requireSession],
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 hour",
          keyGenerator: (req: FastifyRequest) => req.session?.id ?? req.ip,
        },
      },
    },
    async (request, reply) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { id: draftId } = request.params;
      const [draft] = await db
        .select({ id: schema.draftLetters.id, status: schema.draftLetters.status })
        .from(schema.draftLetters)
        .where(
          and(
            eq(schema.draftLetters.id, draftId),
            eq(schema.draftLetters.sessionId, session.id),
          ),
        )
        .limit(1);

      if (!draft) throw notFoundError("draft");
      assertDraftAcceptsFileChanges(draft.status);

      const data = await parseUploadMultipartParts(request.parts());
      if (!data.buffer) {
        throw validationError("Multipart file is required", [
          { field: "file", message: "A file must be provided" },
        ]);
      }

      const kind = data.kind;
      if (kind !== "attachment" && kind !== "signature") {
        throw validationError('Field "kind" must be "attachment" or "signature"', [
          { field: "kind", message: 'Must be "attachment" or "signature"' },
        ]);
      }

      const fileName = data.fileName;
      const mimeType = data.mimeType;
      const attachmentConstraints = getDraftAttachmentConstraints();

      const buffer = data.buffer;
      const sizeBytes = buffer.byteLength;
      assertUploadAcceptable(kind, mimeType, buffer, attachmentConstraints);

      // Check per-draft limits
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
            eq(schema.fileAssets.draftId, draftId),
            eq(schema.fileAssets.sessionId, session.id),
            eq(schema.fileAssets.status, "active"),
          ),
        );

      if (kind === "attachment") {
        const attachmentCount = existingFiles.filter(
          (f) => f.kind === "attachment",
        ).length;
        if (attachmentCount >= attachmentConstraints.maxAttachmentsPerDraft) {
          throw createAttachmentLimitError(attachmentConstraints);
        }
      }

      // For signatures, find existing one for atomic replacement
      const existingSignature =
        kind === "signature"
          ? (existingFiles.find((f) => f.kind === "signature") ?? null)
          : null;

      // Subtract old signature bytes when replacing (it will be removed)
      const existingTotalBytes = await getDraftUploadTotalBytes(db, draftId, session.id);
      const effectiveTotal = existingTotalBytes - (existingSignature?.sizeBytes ?? 0);
      if (effectiveTotal + sizeBytes > attachmentConstraints.maxTotalBytes) {
        const limit = formatByteLimitMb(attachmentConstraints.maxTotalBytes);
        throw validationError(`Total upload exceeds maximum size of ${limit}`, [
          { field: "file", message: `Total uploads per draft cannot exceed ${limit}` },
        ]);
      }

      // Generate storage key (deterministic namespacing per docs)
      const fileId = crypto.randomUUID();
      const storageKey =
        kind === "attachment"
          ? attachmentStorageKey(session.id, fileId)
          : signatureStorageKey(session.id, fileId);

      // The upload is inside the wrapper too, not just the DB work: an upload
      // that writes the object and then reports a failure (a timeout on the
      // response, say) would otherwise leak it. Retention iterates file_assets
      // rows, so an object with no row is invisible to it and kept forever.
      const row = await withOrphanCleanup(db, storageKey, request.log, async () => {
        await uploadObject(storageKey, buffer, mimeType);

        return db.transaction(async (tx) => {
          const [newRow] = await tx
            .insert(schema.fileAssets)
            .values({
              sessionId: session.id,
              draftId,
              kind,
              storageKey,
              originalFilename: fileName,
              mimeType,
              sizeBytes,
              status: "active",
              // Attachments are read by the assistant asynchronously after upload.
              extractionStatus: kind === "attachment" ? "pending" : null,
            })
            .returning();

          if (!newRow) throw new Error("Failed to create file asset");

          if (kind === "signature") {
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
                  eq(schema.draftLetters.id, draftId),
                  eq(schema.draftLetters.sessionId, session.id),
                ),
              );

            if (existingSignature) {
              // pending_deletion, not deleted: the object below may fail to go,
              // and only pending rows are on the cleanup worker's work list.
              await tx
                .update(schema.fileAssets)
                .set({ status: "pending_deletion" })
                .where(
                  and(
                    eq(schema.fileAssets.id, existingSignature.id),
                    eq(schema.fileAssets.sessionId, session.id),
                  ),
                );
            }
          }

          return newRow;
        });
      });

      // Best-effort cleanup of replaced signature from S3
      if (existingSignature) {
        try {
          await deleteObject(existingSignature.storageKey);
          await db
            .update(schema.fileAssets)
            .set({ status: "deleted", deletedAt: new Date() })
            .where(eq(schema.fileAssets.id, existingSignature.id));
        } catch {
          request.log.warn(
            { fileId: existingSignature.id, storageKey: existingSignature.storageKey },
            "Failed to delete replaced signature from storage",
          );
        }
      }

      // Read the attachment's text in the background so the assistant can use
      // it; upload response returns immediately with status "pending".
      if (row.kind === "attachment") {
        ingestAttachmentInBackground(row.id);
      }

      reply.status(201).send({
        file: {
          id: row.id,
          draftId: row.draftId,
          kind: row.kind,
          fileName: row.originalFilename,
          mimeType: row.mimeType,
          sizeBytes: row.sizeBytes,
          extractionStatus: row.extractionStatus,
          createdAt: row.createdAt.toISOString(),
        },
      });
    },
  );

  // GET /drafts/:id/files — list files for a draft
  app.get<{ Params: { id: string } }>(
    "/drafts/:id/files",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { id: draftId } = request.params;

      const files = await listFileAssets(db, draftId, session.id);
      reply.send(
        DraftFilesResponseSchema.parse({
          files,
          attachmentConstraints: getDraftAttachmentConstraints(),
        }),
      );
    },
  );

  // DELETE /drafts/:id/files/:fileId — soft-delete a file and clean up storage
  app.delete<{ Params: { id: string; fileId: string } }>(
    "/drafts/:id/files/:fileId",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { id: draftId, fileId } = request.params;

      // Get storage key before soft-deleting, validating session ownership
      const asset = await getFileAsset(db, fileId, session.id);
      if (!asset) throw notFoundError("file");

      // Verify the file belongs to the specified draft
      if (asset.draftId !== draftId) throw notFoundError("file");

      const [draft] = await db
        .select({ status: schema.draftLetters.status })
        .from(schema.draftLetters)
        .where(
          and(
            eq(schema.draftLetters.id, draftId),
            eq(schema.draftLetters.sessionId, session.id),
          ),
        )
        .limit(1);

      if (!draft) throw notFoundError("draft");
      assertDraftAcceptsFileChanges(draft.status);

      // Retire the row and clear its extracted text first, so the document is
      // out of reach even if storage is unavailable.
      await deleteFileAsset(db, fileId, session.id);

      // Then the object itself. Don't fail the request if S3 is down — the row
      // stays `pending_deletion`, which is exactly the cleanup worker's queue,
      // so the object is retried rather than stranded.
      try {
        await deleteObject(asset.storageKey);
        await db
          .update(schema.fileAssets)
          .set({ status: "deleted", deletedAt: new Date() })
          .where(eq(schema.fileAssets.id, fileId));
      } catch {
        request.log.warn(
          { fileId, storageKey: asset.storageKey },
          "Failed to delete object from storage; left pending for the cleanup worker",
        );
      }

      if (asset.kind === "signature") {
        await db
          .update(schema.draftLetters)
          .set({
            signatureAssetId: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.draftLetters.id, draftId),
              eq(schema.draftLetters.sessionId, session.id),
            ),
          );
      }

      reply.send({
        fileId,
        deletedAt: new Date().toISOString(),
      });
    },
  );

  // GET /files/:fileId/preview — stream signature images through the app origin so
  // browsers never need to resolve or load object-storage URLs directly.
  app.get<{ Params: { fileId: string } }>(
    "/files/:fileId/preview",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { fileId } = request.params;

      const { object, mimeType } = await getValidatedSignatureImageObject({
        db,
        fileId,
        sessionId: session.id,
      });

      const body = buildBlueSignatureSvgResponse({
        mimeType,
        base64: object.buffer.toString("base64"),
      });

      reply.header("Content-Type", "image/svg+xml; charset=utf-8");
      reply.header("Content-Length", String(body.byteLength));
      reply.header("Content-Disposition", "inline");
      reply.header("Cache-Control", "private, max-age=300");

      await reply.send(body);
    },
  );

  // GET /files/:fileId/inline — stream raw signature images through the app origin
  // for UI surfaces that should show the original asset without preview transforms.
  app.get<{ Params: { fileId: string } }>(
    "/files/:fileId/inline",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { fileId } = request.params;

      const { object, mimeType } = await getValidatedSignatureImageObject({
        db,
        fileId,
        sessionId: session.id,
      });

      reply.header("Content-Type", mimeType);
      reply.header("Content-Length", String(object.buffer.byteLength));
      reply.header("Content-Disposition", "inline");
      reply.header("Cache-Control", "private, max-age=300");

      await reply.send(object.buffer);
    },
  );

  // GET /files/:fileId/attachment — stream an uploaded attachment (PDF/image)
  // through the app origin so the review page can preview the exact files that
  // will be mailed with the letter. Session-scoped; attachments only.
  app.get<{ Params: { fileId: string } }>(
    "/files/:fileId/attachment",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { fileId } = request.params;

      const file = await getFileAsset(db, fileId, session.id);
      if (!file || file.kind !== "attachment" || file.status !== "active") {
        throw notFoundError("file");
      }

      const object = await downloadObjectBuffer(file.storageKey);
      const mimeType = object.contentType ?? file.mimeType;

      // Only ever serve the validated upload types inline. Anything else (e.g. a
      // future MIME-list change, or a mismatched stored content-type) is refused
      // rather than streamed to the browser as an active document.
      if (!ATTACHMENT_INLINE_MIME_TYPES.has(mimeType)) {
        throw notFoundError("file");
      }

      reply.header("Content-Type", mimeType);
      reply.header("X-Content-Type-Options", "nosniff");
      reply.header("Content-Length", String(object.buffer.byteLength));
      reply.header("Content-Disposition", "inline");
      reply.header("Cache-Control", "private, max-age=300");

      await reply.send(object.buffer);
    },
  );

  // GET /files/:fileId/download — keep raw downloads on the presigned-storage path.
  app.get<{ Params: { fileId: string } }>(
    "/files/:fileId/download",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { fileId } = request.params;

      const [file] = await db
        .select()
        .from(schema.fileAssets)
        .where(
          and(
            eq(schema.fileAssets.id, fileId),
            eq(schema.fileAssets.sessionId, session.id),
            eq(schema.fileAssets.status, "active"),
          ),
        )
        .limit(1);

      if (!file) throw notFoundError("file");

      const url = await getPresignedDownloadUrl(file.storageKey, 300);
      reply.status(302).header("Location", url).send();
    },
  );
}
