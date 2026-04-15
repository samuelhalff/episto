import Fastify, { type FastifyInstance } from "fastify";
import { LETTER_COLORS } from "@swiss-mail/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  (chain as { then: unknown }).then = (
    onFulfilled: (value: unknown[]) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return chain;
}

describe("file preview route", () => {
  let app: FastifyInstance;
  let getPresignedDownloadUrl: ReturnType<typeof vi.fn>;
  let downloadObjectBuffer: ReturnType<typeof vi.fn>;
  let getFileAsset: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.resetModules();
    const fileAsset = {
      id: "signature-file-1",
      sessionId: "preview-session",
      draftId: "draft-1",
      kind: "signature",
      mimeType: "image/png",
      storageKey: "signatures/preview-session/signature-file-1",
      status: "active",
    };

    const select = vi.fn().mockImplementation(() => makeSelectChain([fileAsset]));

    getPresignedDownloadUrl = vi
      .fn()
      .mockResolvedValue(
        "http://minio:9000/swiss-mail/signatures/preview-session/signature-file-1",
      );
    downloadObjectBuffer = vi.fn().mockResolvedValue({
      buffer: Buffer.from("pngbytes"),
      contentType: "image/png",
      contentLength: 8,
    });

    vi.doMock("../src/db/index.js", () => ({
      getDb: () => ({ select }),
      schema: new Proxy({}, { get: () => ({}) }),
    }));

    vi.doMock("../src/modules/sessions/session.middleware.js", () => ({
      getRequiredSession: vi.fn().mockImplementation((request: { session?: unknown }) => {
        if (!request.session) {
          throw new Error("Expected mocked session");
        }
        return request.session;
      }),
      requireSession: vi
        .fn()
        .mockImplementation(async (request: { session?: unknown }) => {
          request.session = {
            id: "preview-session",
            type: "guest",
            locale: "en-CH",
            email: null,
            resumeTokenExpiresAt: new Date("2030-01-01"),
            expiresAt: new Date("2030-01-01"),
            createdAt: new Date("2026-01-01"),
            updatedAt: new Date("2026-01-01"),
          };
        }),
      COOKIE_NAME: "session",
    }));

    vi.doMock("../src/shared/errors/index.js", () => ({
      validationError: vi.fn((message: string, fields: unknown[] = []) =>
        Object.assign(new Error(message), {
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message,
          fields,
        }),
      ),
      notFoundError: vi.fn((entity: string) =>
        Object.assign(new Error(`${entity} not found`), {
          statusCode: 404,
          code: "NOT_FOUND",
          message: `${entity} not found`,
        }),
      ),
    }));

    getFileAsset = vi.fn().mockResolvedValue(fileAsset);

    vi.doMock("../src/modules/files/file.service.js", () => ({
      assertUploadMimeMatchesContent: vi.fn(),
      attachmentStorageKey: vi.fn(),
      deleteFileAsset: vi.fn(),
      getDraftAttachmentConstraints: vi.fn(),
      getDraftUploadTotalBytes: vi.fn(),
      getFileAsset,
      listFileAssets: vi.fn(),
      signatureStorageKey: vi.fn(),
    }));

    vi.doMock("../src/modules/dispatch/adapters/provider-capabilities.js", () => ({
      createAttachmentLimitError: vi.fn(),
      createAttachmentMimeTypeError: vi.fn(),
    }));

    vi.doMock("../src/modules/files/adapters/s3.adapter.js", () => ({
      uploadObject: vi.fn(),
      getPresignedDownloadUrl,
      downloadObjectBuffer,
      deleteObject: vi.fn(),
    }));

    vi.doMock("../src/modules/files/multipart-upload.js", () => ({
      parseUploadMultipartParts: vi.fn(),
    }));

    const { fileRoutes } = await import("../src/modules/files/file.routes.js");

    app = Fastify({ logger: false });
    app.setErrorHandler((error, _request, reply) => {
      const typedError = error as {
        statusCode?: number;
        code?: string;
        message?: string;
        fields?: unknown[];
      };
      reply.status(typedError.statusCode ?? 500).send({
        code: typedError.code ?? "INTERNAL",
        message: typedError.message ?? "Unknown error",
        fields: typedError.fields ?? [],
      });
    });
    await app.register(fileRoutes);
  });

  afterEach(async () => {
    await app.close();
    vi.resetModules();
  });

  it("serves signature previews as blue-ink svg from the app origin", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/files/signature-file-1/preview",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/svg+xml");
    expect(response.headers.location).toBeUndefined();
    expect(response.body).toContain(LETTER_COLORS.signatureDrawnInk);
    expect(response.body).toContain("data:image/png;base64,cG5nYnl0ZXM=");
  });

  it("rejects storage objects with unsupported preview mime types", async () => {
    downloadObjectBuffer.mockResolvedValueOnce({
      buffer: Buffer.from("gifbytes"),
      contentType: "image/gif",
      contentLength: 8,
    });

    const response = await app.inject({
      method: "GET",
      url: "/files/signature-file-1/preview",
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).toContain("file not found");
  });

  it("rejects non-signature assets on the preview route", async () => {
    getFileAsset.mockResolvedValueOnce({
      id: "attachment-file-1",
      kind: "attachment",
      mimeType: "application/pdf",
      storageKey: "attachments/preview-session/attachment-file-1",
      status: "active",
      sessionId: "preview-session",
      draftId: "draft-1",
    });

    const response = await app.inject({
      method: "GET",
      url: "/files/attachment-file-1/preview",
    });

    expect(response.statusCode).toBe(404);
    expect(downloadObjectBuffer).not.toHaveBeenCalled();
  });

  it("rejects missing files on the preview route", async () => {
    getFileAsset.mockResolvedValueOnce(null);

    const response = await app.inject({
      method: "GET",
      url: "/files/missing-file/preview",
    });

    expect(response.statusCode).toBe(404);
    expect(downloadObjectBuffer).not.toHaveBeenCalled();
  });

  it("keeps the download route on the presigned redirect path", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/files/signature-file-1/download",
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(
      "http://minio:9000/swiss-mail/signatures/preview-session/signature-file-1",
    );
    expect(getPresignedDownloadUrl).toHaveBeenCalledWith(
      "signatures/preview-session/signature-file-1",
      300,
    );
  });
});
