import type { FastifyInstance, FastifyRequest } from "fastify";
import { eq, and } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
import { validationError, notFoundError } from "../../shared/errors/index.js";
import { AppError } from "../../shared/errors/index.js";
import {
  createFileAsset,
  listFileAssets,
  deleteFileAsset,
  getFileAsset,
  attachmentStorageKey,
  signatureStorageKey,
} from "./file.service.js";
import { uploadObject, getPresignedDownloadUrl, deleteObject } from "./adapters/s3.adapter.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_SIGNATURE_SIZE = 2 * 1024 * 1024; // 2 MB

const ALLOWED_ATTACHMENT_MIMES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

const ALLOWED_SIGNATURE_MIMES = new Set([
  "image/png",
  "image/jpeg",
]);

const MAX_ATTACHMENTS = 5;
const MAX_SIGNATURES = 1;

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
          keyGenerator: (req: FastifyRequest) => req.session!.id,
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

      // Parse multipart form data
      const data = await request.file();
      if (!data) {
        throw validationError("Multipart file is required", [
          { field: "file", message: "A file must be provided" },
        ]);
      }

      const kind = (data.fields.kind as { value?: string } | undefined)?.value;
      if (kind !== "attachment" && kind !== "signature") {
        throw validationError('Field "kind" must be "attachment" or "signature"', [
          { field: "kind", message: 'Must be "attachment" or "signature"' },
        ]);
      }

      const fileName = data.filename ?? "untitled";
      const mimeType = data.mimetype ?? "application/octet-stream";

      // Validate MIME type
      if (kind === "attachment" && !ALLOWED_ATTACHMENT_MIMES.has(mimeType)) {
        throw validationError(
          "Unsupported file type for attachment. Allowed: PDF, PNG, JPEG",
          [{ field: "file", message: "Allowed types: application/pdf, image/png, image/jpeg" }],
        );
      }
      if (kind === "signature" && !ALLOWED_SIGNATURE_MIMES.has(mimeType)) {
        throw validationError(
          "Unsupported file type for signature. Allowed: PNG, JPEG",
          [{ field: "file", message: "Allowed types: image/png, image/jpeg" }],
        );
      }

      // Read file into buffer and validate size
      const buffer = await data.toBuffer();
      const sizeBytes = buffer.byteLength;

      if (kind === "attachment" && sizeBytes > MAX_ATTACHMENT_SIZE) {
        throw validationError("Attachment exceeds maximum size of 5 MB", [
          { field: "file", message: "Maximum attachment size is 5 MB" },
        ]);
      }
      if (kind === "signature" && sizeBytes > MAX_SIGNATURE_SIZE) {
        throw validationError("Signature exceeds maximum size of 2 MB", [
          { field: "file", message: "Maximum signature size is 2 MB" },
        ]);
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
        if (attachmentCount >= MAX_ATTACHMENTS) {
          throw new AppError({
            family: "policy_refusal",
            statusCode: 422,
            code: "ATTACHMENT_LIMIT_REACHED",
            message: `Maximum ${MAX_ATTACHMENTS} attachments per draft`,
            userMessage: `You can attach up to ${MAX_ATTACHMENTS} files per letter.`,
            userAction: "Remove an existing attachment before adding a new one.",
          });
        }
      }

      if (kind === "signature") {
        const signatureCount = existingFiles.filter(
          (f) => f.kind === "signature",
        ).length;
        if (signatureCount >= MAX_SIGNATURES) {
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
      reply.send({ files });
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
        request.log.warn({ fileId, storageKey: asset.storageKey }, "Failed to delete object from storage");
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
