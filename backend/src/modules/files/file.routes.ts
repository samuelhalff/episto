import type { FastifyInstance, FastifyRequest } from "fastify";
import { eq, and } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
import { validationError, notFoundError } from "../../shared/errors/index.js";
import { AppError } from "../../shared/errors/index.js";
import {
  listFileAssets,
  deleteFileAsset,
  attachmentStorageKey,
  signatureStorageKey,
} from "./file.service.js";

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
  // POST /drafts/:id/files — upload attachment or signature
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
    async (request, _reply) => {
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

      // Extract multipart fields from the body.
      // Since @fastify/multipart is not installed, we expect the body to be
      // parsed as a JSON-like object with `file` and `kind` fields for now.
      const body = request.body as
        | {
            kind?: string | undefined;
            file?: { filename?: string | undefined; mimetype?: string | undefined; data?: Buffer | undefined } | undefined;
          }
        | null
        | undefined;

      const kind = body?.kind;
      if (kind !== "attachment" && kind !== "signature") {
        throw validationError('Field "kind" must be "attachment" or "signature"', [
          { field: "kind", message: 'Must be "attachment" or "signature"' },
        ]);
      }

      const file = body?.file;
      if (!file) {
        throw validationError("File is required", [
          { field: "file", message: "A file must be provided" },
        ]);
      }

      const _fileName = file.filename ?? "untitled";
      const mimeType = file.mimetype ?? "application/octet-stream";
      const sizeBytes = file.data?.byteLength ?? 0;

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

      // Validate size limits
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
      const _storageKey =
        kind === "attachment"
          ? attachmentStorageKey(session.id, fileId)
          : signatureStorageKey(session.id, fileId);

      // TODO: Actual S3 upload is not yet implemented.
      // @fastify/multipart is not installed — this is a placeholder.
      throw new AppError({
        family: "file_upload_failure",
        statusCode: 501,
        code: "UPLOAD_NOT_IMPLEMENTED",
        message:
          "File upload to object storage is not yet implemented. " +
          "Validation passed; S3 adapter integration is pending.",
        userMessage: "File uploads are not available yet.",
        userAction: "This feature is coming soon.",
      });

      // Once S3 upload is wired:
      // const row = await createFileAsset(db, {
      //   sessionId: session.id,
      //   draftId,
      //   kind,
      //   storageKey,
      //   originalFilename: fileName,
      //   mimeType,
      //   sizeBytes,
      // });
      //
      // reply.status(201).send({
      //   file: {
      //     id: row.id,
      //     draftId: row.draftId,
      //     kind: row.kind,
      //     fileName: row.originalFilename,
      //     mimeType: row.mimeType,
      //     sizeBytes: row.sizeBytes,
      //     createdAt: row.createdAt.toISOString(),
      //   },
      // });
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

  // DELETE /drafts/:id/files/:fileId — soft-delete a file
  app.delete<{ Params: { id: string; fileId: string } }>(
    "/drafts/:id/files/:fileId",
    { preHandler: [requireSession] },
    async (request, reply) => {
      const session = request.session!;
      const db = getDb();
      const { fileId } = request.params;

      await deleteFileAsset(db, fileId, session.id);
      reply.send({ deleted: true });
    },
  );

  // GET /files/:fileId/download — redirect to presigned URL
  app.get<{ Params: { fileId: string } }>(
    "/files/:fileId/download",
    { preHandler: [requireSession] },
    async (request, _reply) => {
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

      // S3 presigned URL generation not yet wired
      throw new AppError({
        family: "file_upload_failure",
        statusCode: 501,
        code: "DOWNLOAD_NOT_IMPLEMENTED",
        message: "File download via presigned URL is not yet implemented.",
        userMessage: "File downloads are not available yet.",
        userAction: "This feature is coming soon.",
      });
    },
  );
}
