import type { FastifyInstance, FastifyRequest } from "fastify";
import { eq, and } from "drizzle-orm";
import {
  DraftFilesResponseSchema,
  FILE_LIMITS,
  getUploadByteLimit,
  isAllowedUploadMimeType,
} from "@swiss-mail/shared";
import { getDb, schema } from "../../db/index.js";
import { requireSession, getRequiredSession } from "../sessions/session.middleware.js";
import { validationError, notFoundError } from "../../shared/errors/index.js";
import {
  assertUploadMimeMatchesContent,
  attachmentStorageKey,
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
  downloadObjectBuffer,
  getPresignedDownloadUrl,
  deleteObject,
} from "./adapters/s3.adapter.js";
import { parseUploadMultipartParts } from "./multipart-upload.js";
import { buildBlueSignatureSvgResponse } from "../rendering/drawn-signature.js";

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
      const session = getRequiredSession(request);
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

      assertUploadMimeMatchesContent(kind, mimeType, buffer);

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
      if (effectiveTotal + sizeBytes > FILE_LIMITS.totalDraftUploadBytes) {
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

      // Upload new file to S3 first (safe: no DB changes yet)
      await uploadObject(storageKey, buffer, mimeType);

      // All DB operations in a single transaction
      const row = await db.transaction(async (tx) => {
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
            await tx
              .update(schema.fileAssets)
              .set({ status: "deleted", deletedAt: new Date() })
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

      // Best-effort cleanup of replaced signature from S3
      if (existingSignature) {
        try {
          await deleteObject(existingSignature.storageKey);
        } catch {
          request.log.warn(
            { fileId: existingSignature.id, storageKey: existingSignature.storageKey },
            "Failed to delete replaced signature from storage",
          );
        }
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

  // GET /files/:fileId/preview — stream signature images through the app origin so
  // browsers never need to resolve or load object-storage URLs directly.
  app.get<{ Params: { fileId: string } }>(
    "/files/:fileId/preview",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = getRequiredSession(request);
      const db = getDb();
      const { fileId } = request.params;

      const file = await getFileAsset(db, fileId, session.id);
      if (!file || file.kind !== "signature" || !file.mimeType.startsWith("image/")) {
        throw notFoundError("file");
      }

      const object = await downloadObjectBuffer(file.storageKey);
      const mimeType = (object.contentType ?? file.mimeType) as
        | "image/png"
        | "image/jpeg";
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
