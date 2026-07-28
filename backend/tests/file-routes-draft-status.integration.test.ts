import Fastify, { type FastifyInstance } from "fastify";
import fastifyMultipart from "@fastify/multipart";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "../src/db/schema/index.js";
import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

// ---------------------------------------------------------------------------
// Draft-status guard on the file routes, against a real database.
//
// The guard's whole job is to read the draft's *stored* status, so the status
// is the one thing worth not mocking: these tests move a real row between
// `collecting` and `reviewed` and drive the real routes. Only the edges the
// routes talk to and that a database cannot stand in for are faked — object
// storage, the session cookie, and the background attachment ingestion.
// ---------------------------------------------------------------------------

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

const PDF_BYTES = Buffer.from("%PDF-1.4\nattachment test\n%%EOF\n");
const BOUNDARY = "----episto-test-boundary";

function multipartBody(fileName: string, mimeType: string, content: Buffer): Buffer {
  return Buffer.concat([
    Buffer.from(
      `--${BOUNDARY}\r\n` +
        `Content-Disposition: form-data; name="kind"\r\n\r\n` +
        `attachment\r\n` +
        `--${BOUNDARY}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`,
    ),
    content,
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  ]);
}

describeIfIntegrationDb(
  "draft file routes reject changes once the draft is locked",
  () => {
    let app: FastifyInstance;
    let db: IntegrationDb;
    let cleanup: (() => Promise<void>) | null = null;
    let sessionId: string;
    let draftId: string;
    let deleteObject: ReturnType<typeof vi.fn>;

    async function setStatus(status: "collecting" | "reviewed"): Promise<void> {
      await db
        .update(schema.draftLetters)
        .set({ status })
        .where(eq(schema.draftLetters.id, draftId));
    }

    async function uploadAttachment(fileName = "notice.pdf") {
      return app.inject({
        method: "POST",
        url: `/drafts/${draftId}/files`,
        headers: { "content-type": `multipart/form-data; boundary=${BOUNDARY}` },
        payload: multipartBody(fileName, "application/pdf", PDF_BYTES),
      });
    }

    async function activeFileCount(): Promise<number> {
      const rows = await db
        .select({ id: schema.fileAssets.id })
        .from(schema.fileAssets)
        .where(eq(schema.fileAssets.draftId, draftId));
      return rows.length;
    }

    beforeEach(async () => {
      vi.resetModules();

      const ctx = await createIntegrationDb();
      db = ctx.db;
      cleanup = ctx.cleanup;

      const [session] = await db
        .insert(schema.sessions)
        .values({
          type: "guest",
          resumeTokenHash: `hash-${Math.random().toString(36).slice(2)}`,
          resumeTokenExpiresAt: new Date(Date.now() + 3_600_000),
          locale: "de-CH",
          expiresAt: new Date(Date.now() + 3_600_000),
        })
        .returning();
      if (!session) throw new Error("failed to create session");
      sessionId = session.id;

      const [draft] = await db
        .insert(schema.draftLetters)
        .values({ sessionId, status: "collecting", locale: "de-CH" })
        .returning();
      if (!draft) throw new Error("failed to create draft");
      draftId = draft.id;

      vi.doMock("../src/db/index.js", () => ({
        getDb: () => db,
        schema,
      }));

      vi.doMock("../src/modules/sessions/session.middleware.js", () => ({
        getRequiredSession: (request: { session?: unknown }) => {
          if (!request.session) throw new Error("Expected mocked session");
          return request.session;
        },
        requireSession: async (request: { session?: unknown }) => {
          request.session = { id: sessionId, type: "guest", locale: "de-CH" };
        },
        COOKIE_NAME: "session",
      }));

      deleteObject = vi.fn().mockResolvedValue(undefined);
      vi.doMock("../src/modules/files/adapters/s3.adapter.js", () => ({
        uploadObject: vi.fn().mockResolvedValue(undefined),
        deleteObject,
        downloadObjectBuffer: vi.fn(),
        getPresignedDownloadUrl: vi.fn(),
      }));

      vi.doMock("../src/modules/files/attachment-ingestion.service.js", () => ({
        ingestAttachmentInBackground: vi.fn(),
      }));

      // The real adapter selection reads validated env, which integration tests
      // never boot; the stub capabilities are what a test environment resolves to.
      vi.doMock("../src/modules/dispatch/adapters/postal.adapter.js", async () => {
        const { getStubDispatchCapabilities } =
          await import("../src/modules/dispatch/adapters/provider-capabilities.js");
        return {
          getDispatchAdapter: () => ({
            getCapabilities: () => getStubDispatchCapabilities(),
          }),
        };
      });

      const { fileRoutes } = await import("../src/modules/files/file.routes.js");

      app = Fastify({ logger: false });
      app.setErrorHandler((error, _request, reply) => {
        const typed = error as { statusCode?: number; code?: string; message?: string };
        reply
          .status(typed.statusCode ?? 500)
          .send({ code: typed.code ?? "INTERNAL", message: typed.message ?? "unknown" });
      });
      await app.register(fastifyMultipart);
      await app.register(fileRoutes);
    });

    afterEach(async () => {
      await app.close();
      if (cleanup) {
        await cleanup();
        cleanup = null;
      }
      vi.resetModules();
    });

    it("accepts an upload while the draft is still collecting", async () => {
      const response = await uploadAttachment();

      expect(response.statusCode).toBe(201);
      expect(await activeFileCount()).toBe(1);
    });

    it("rejects an upload once the draft is reviewed", async () => {
      await setStatus("reviewed");

      const response = await uploadAttachment();

      expect(response.statusCode).toBe(400);
      expect(response.json().message).toBe(
        "Draft files cannot be changed in status 'reviewed'",
      );
      // Nothing was written: the guard runs before the body is even read.
      expect(await activeFileCount()).toBe(0);
    });

    it("accepts a delete while the draft is still collecting", async () => {
      const uploaded = await uploadAttachment();
      expect(uploaded.statusCode).toBe(201);
      const fileId = uploaded.json().file.id as string;

      const response = await app.inject({
        method: "DELETE",
        url: `/drafts/${draftId}/files/${fileId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(deleteObject).toHaveBeenCalledTimes(1);

      const [row] = await db
        .select({ status: schema.fileAssets.status })
        .from(schema.fileAssets)
        .where(eq(schema.fileAssets.id, fileId));
      expect(row?.status).toBe("deleted");
    });

    it("rejects a delete once the draft is reviewed", async () => {
      const uploaded = await uploadAttachment();
      expect(uploaded.statusCode).toBe(201);
      const fileId = uploaded.json().file.id as string;
      await setStatus("reviewed");

      const response = await app.inject({
        method: "DELETE",
        url: `/drafts/${draftId}/files/${fileId}`,
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().message).toBe(
        "Draft files cannot be changed in status 'reviewed'",
      );
      expect(deleteObject).not.toHaveBeenCalled();

      // The file the customer already paid to have printed is still there.
      const [row] = await db
        .select({ status: schema.fileAssets.status })
        .from(schema.fileAssets)
        .where(eq(schema.fileAssets.id, fileId));
      expect(row?.status).toBe("active");
    });
  },
);
