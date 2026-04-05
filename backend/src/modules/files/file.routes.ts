import type { FastifyInstance, FastifyRequest } from "fastify";
import { eq, and } from "drizzle-orm";
import {
  DraftFilesResponseSchema,
  FILE_LIMITS,
  getUploadByteLimit,
  isAllowedUploadMimeType,
} from "@swiss-mail/shared";
import { getDb, schema } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
import { validationError, notFoundError } from "../../shared/errors/index.js";
import { AppError } from "../../shared/errors/index.js";
import {
  attachmentStorageKey,
  createFileAsset,
  deleteFileAsset,
  getDraftAttachmentConstraints,
  getDraftUploadTotalBytes,
  getFileAsset,
  listFileAssets,
  signatureStorageKey,
} from "./file.service.js";
import {
  createAttachmentLimitError,
  createAttachmentMimeTypeError,
} from "../dispatch/adapters/provider-capabilities.js";
import {
  uploadObject,
  getPresignedDownloadUrl,
  deleteObject,
} from "./adapters/s3.adapter.js";
import { parseUploadMultipartParts } from "./multipart-upload.js";

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

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
      const session = request.session!;
      const db = getDb();
      const { id: draftId } = request.params;
      const [draft] = await db
        .select({ id: schema.draftLetters.id })
        .from(schema.draftLetters)
        .where(
          and(
            eq(schema.draftLetters.id, draftId),
            eq(schema.draftLetters.sessionId, session.id),
          ),
        )
        .limit(1);

      if (!draft) throw notFoundError("draft");

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

      if (
        kind === "attachment" &&
        !attachmentConstraints.allowedMimeTypes.includes(mimeType)
      ) {
        throw createAttachmentMimeTypeError(attachmentConstraints);
      }

      if (kind === "signature" && !isAllowedUploadMimeType(kind, mimeType)) {
        throw validationError("Unsupported file type for signature. Allowed: PNG, JPEG", [
          {
            field: "file",
            message: `Allowed types: ${FILE_LIMITS[kind].allowedMimeTypes.join(", ")}`,
          },
        ]);
      }

      // Read file into buffer and validate size
      const buffer = data.buffer;
      const sizeBytes = buffer.byteLength;
      const maxBytes = getUploadByteLimit(kind);

      if (sizeBytes > maxBytes) {
        throw validationError(
          kind === "attachment"
            ? "Attachment exceeds maximum size of 5 MB"
            : "Signature exceeds maximum size of 2 MB",
          [
            {
              field: "file",
              message: `Maximum ${kind} size is ${Math.round(maxBytes / 1024 / 1024)} MB`,
            },
          ],
        );
      }

      // Check per-draft limits
      const existingFiles = await db
        .select({ id: schema.fileAssets.id, kind: schema.fileAssets.kind })
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

      if (kind === "signature") {
        const signatureCount = existingFiles.filter((f) => f.kind === "signature").length;
        if (signatureCount >= FILE_LIMITS.maxSignaturesPerDraft) {
          throw new AppError({
            family: "policy_refusal",
            statusCode: 422,
            code: "SIGNATURE_LIMIT_REACHED",
            message: "Maximum 1 signature per draft",
            userMessage: "Only one signature is allowed per letter.",
            userAction: "Remove the existing signature before adding a new one.",
          });
        }
      }

      const existingTotalBytes = await getDraftUploadTotalBytes(db, draftId, session.id);
      if (existingTotalBytes + sizeBytes > FILE_LIMITS.totalDraftUploadBytes) {
        throw validationError("Total upload exceeds maximum size of 20 MB", [
          { field: "file", message: "Total uploads per draft cannot exceed 20 MB" },
        ]);
      }

      // Generate storage key (deterministic namespacing per docs)
      const fileId = crypto.randomUUID();
      const storageKey =
        kind === "attachment"
          ? attachmentStorageKey(session.id, fileId)
          : signatureStorageKey(session.id, fileId);

      // Upload to S3-compatible storage
      await uploadObject(storageKey, buffer, mimeType);

      // Create DB record
      const row = await createFileAsset(db, {
        sessionId: session.id,
        draftId,
        kind,
        storageKey,
        originalFilename: fileName,
        mimeType,
        sizeBytes,
      });

      if (kind === "signature") {
        await db
          .update(schema.draftLetters)
          .set({
            signatureAssetId: row.id,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(schema.draftLetters.id, draftId),
              eq(schema.draftLetters.sessionId, session.id),
            ),
          );
      }

      reply.status(201).send({
        file: {
          id: row.id,
          draftId: row.draftId,
          kind: row.kind,
          fileName: row.originalFilename,
          mimeType: row.mimeType,
          sizeBytes: row.sizeBytes,
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
      const session = request.session!;
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
      const session = request.session!;
      const db = getDb();
      const { id: draftId, fileId } = request.params;

      // Get storage key before soft-deleting, validating session ownership
      const asset = await getFileAsset(db, fileId, session.id);
      if (!asset) throw notFoundError("file");

      // Verify the file belongs to the specified draft
      if (asset.draftId !== draftId) throw notFoundError("file");

      // Soft-delete in DB
      await deleteFileAsset(db, fileId, session.id);

      // Best-effort delete from storage (don't fail the request if S3 is down)
      try {
        await deleteObject(asset.storageKey);
      } catch {
        request.log.warn(
          { fileId, storageKey: asset.storageKey },
          "Failed to delete object from storage",
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

  // GET /files/:fileId/download — redirect to presigned URL
  app.get<{ Params: { fileId: string } }>(
    "/files/:fileId/download",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = request.session!;
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
