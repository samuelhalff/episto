import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertDefined } from "./assert-defined";

// ---------------------------------------------------------------------------
// The outbox routes talk to Postgres through raw `db.execute(sql\`...\`)`, so
// the mock is a script of responses handed out in call order plus a record of
// the statements that asked for them — which is what lets these tests assert
// on the shape of the query, not just on the response body.
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  responses: [] as Array<{ rows: unknown[] }>,
  statements: [] as unknown[],
  execute: vi.fn(),
  queueAdd: vi.fn(),
  queueRemove: vi.fn(),
}));

mocks.execute.mockImplementation((statement: unknown) => {
  mocks.statements.push(statement);
  return Promise.resolve(mocks.responses.shift() ?? { rows: [] });
});

vi.mock("../src/db/index.js", () => ({
  getDb: () => ({ execute: mocks.execute }),
  schema: {},
}));

vi.mock("../src/queue/index.js", () => ({
  getQueue: () => ({ add: mocks.queueAdd, remove: mocks.queueRemove }),
  QUEUE_NAMES: { SEND_EMAIL: "send-transactional-email" },
}));

import { adminEmailOutboxRoutes } from "../src/modules/admin/admin-email-outbox.routes.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockReply {
  status: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
}

function makeMockReply(): MockReply {
  const reply: MockReply = { status: vi.fn(), send: vi.fn() };
  reply.status.mockReturnValue(reply);
  return reply;
}

type Handler = (req: unknown, reply: MockReply) => Promise<void>;

async function captureHandlers(): Promise<{
  list: Handler;
  retry: Handler;
  urls: string[];
}> {
  const urls: string[] = [];
  let list: Handler | undefined;
  let retry: Handler | undefined;

  const mockApp = {
    get: vi.fn((url: string, _opts: unknown, handler: Handler) => {
      urls.push(`GET ${url}`);
      list = handler;
    }),
    post: vi.fn((url: string, _opts: unknown, handler: Handler) => {
      urls.push(`POST ${url}`);
      retry = handler;
    }),
  };

  await adminEmailOutboxRoutes(
    mockApp as unknown as Parameters<typeof adminEmailOutboxRoutes>[0],
  );

  return {
    list: assertDefined(list, "Expected a list handler"),
    retry: assertDefined(retry, "Expected a retry handler"),
    urls,
  };
}

/** Flatten a drizzle SQL object back into readable statement text. */
function sqlText(statement: unknown): string {
  const chunks = (statement as { queryChunks?: unknown[] }).queryChunks ?? [];
  return chunks
    .map((chunk) => {
      const value = (chunk as { value?: unknown }).value;
      if (Array.isArray(value)) return value.join("");
      if ((chunk as { queryChunks?: unknown[] }).queryChunks) return sqlText(chunk);
      return "";
    })
    .join(" ");
}

const OUTBOX_ROW = {
  id: "outbox-1",
  recipient: "customer@example.com",
  template: "dispatch-accepted",
  locale: "de-CH",
  reference: "ORD-123",
  status: "failed",
  attempts: 30,
  last_error: "Resend rejected the recipient",
  created_at: new Date("2026-07-20T08:00:00.000Z"),
  last_attempted_at: new Date("2026-07-20T12:30:00.000Z"),
};

describe("adminEmailOutboxRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.responses = [];
    mocks.statements = [];
    mocks.queueRemove.mockResolvedValue(undefined);
    mocks.queueAdd.mockResolvedValue(undefined);
  });

  it("registers the list and retry routes", async () => {
    const { urls } = await captureHandlers();
    expect(urls).toEqual([
      "GET /admin/email-outbox",
      "POST /admin/email-outbox/:id/retry",
    ]);
  });

  describe("GET /admin/email-outbox", () => {
    it("returns the rows that need attention", async () => {
      mocks.responses.push({ rows: [OUTBOX_ROW] });

      const { list } = await captureHandlers();
      const reply = makeMockReply();
      await list(undefined, reply);

      expect(reply.status).toHaveBeenCalledWith(200);
      const body = reply.send.mock.calls[0][0] as {
        count: number;
        emails: Array<Record<string, unknown>>;
      };
      expect(body.count).toBe(1);
      expect(body.emails[0]).toMatchObject({
        id: "outbox-1",
        recipient: "customer@example.com",
        template: "dispatch-accepted",
        reference: "ORD-123",
        status: "failed",
        attempts: 30,
        lastError: "Resend rejected the recipient",
        createdAt: "2026-07-20T08:00:00.000Z",
        lastAttemptedAt: "2026-07-20T12:30:00.000Z",
      });
    });

    it("never selects or returns the rendered email payload", async () => {
      // The payload is the customer's letter. Even if the row carries one, no
      // part of it may reach an admin list view.
      mocks.responses.push({
        rows: [{ ...OUTBOX_ROW, payload: { to: "customer@example.com", data: {} } }],
      });

      const { list } = await captureHandlers();
      const reply = makeMockReply();
      await list(undefined, reply);

      const body = reply.send.mock.calls[0][0] as {
        emails: Array<Record<string, unknown>>;
      };
      expect(body.emails[0]).not.toHaveProperty("payload");
      expect(JSON.stringify(body)).not.toContain("payload");

      const select = sqlText(mocks.statements[0]);
      expect(select).toMatch(/SELECT id, recipient, template/);
      expect(select).not.toContain("payload");
    });

    it("excludes sent rows from the query", async () => {
      mocks.responses.push({ rows: [] });

      const { list } = await captureHandlers();
      const reply = makeMockReply();
      await list(undefined, reply);

      const select = sqlText(mocks.statements[0]);
      expect(select).toContain("status = 'failed'");
      expect(select).toContain("status IN ('pending', 'sending')");
      // A delivered email is not a problem and must never appear here.
      expect(select).not.toContain("'sent'");
    });

    it("returns 500 with a code when the query fails", async () => {
      mocks.execute.mockRejectedValueOnce(new Error("DB connection lost"));

      const { list } = await captureHandlers();
      const reply = makeMockReply();
      await list(undefined, reply);

      expect(reply.status).toHaveBeenCalledWith(500);
      const body = reply.send.mock.calls[0][0] as { error: { code: string } };
      expect(body.error.code).toBe("EMAIL_OUTBOX_QUERY_FAILED");
    });
  });

  describe("POST /admin/email-outbox/:id/retry", () => {
    it("re-enqueues a failed row and puts it back to pending", async () => {
      const payload = {
        to: "customer@example.com",
        template: "dispatch-accepted",
        locale: "de-CH",
        data: { orderRef: "ORD-123" },
      };
      mocks.responses.push(
        // The conditional UPDATE claims the row.
        { rows: [{ dedupe_key: "dispatch-accepted-a1", payload, reference: "ORD-123" }] },
        // enqueueTransactionalEmail: the INSERT conflicts with the existing row.
        { rows: [] },
        // …and its recovery path finds the row we just set back to pending.
        { rows: [{ id: "outbox-1", status: "pending", payload }] },
      );

      const { retry } = await captureHandlers();
      const reply = makeMockReply();
      await retry({ params: { id: "outbox-1" } }, reply);

      // The stale BullMQ job must go first or the re-add is silently ignored.
      expect(mocks.queueRemove).toHaveBeenCalledWith("dispatch-accepted-a1");
      expect(mocks.queueAdd).toHaveBeenCalledWith(
        "dispatch-accepted",
        expect.objectContaining({ outboxId: "outbox-1", to: "customer@example.com" }),
        { jobId: "dispatch-accepted-a1" },
      );
      expect(reply.status).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith({ id: "outbox-1", status: "pending" });

      const update = sqlText(mocks.statements[0]);
      expect(update).toContain("status = 'failed'");
      expect(update).toContain("payload IS NOT NULL");
    });

    it("refuses a sent row instead of mailing the customer twice", async () => {
      mocks.responses.push(
        { rows: [] },
        { rows: [{ status: "sent", has_payload: false }] },
      );

      const { retry } = await captureHandlers();
      const reply = makeMockReply();
      await retry({ params: { id: "outbox-1" } }, reply);

      expect(reply.status).toHaveBeenCalledWith(409);
      const body = reply.send.mock.calls[0][0] as { error: { code: string } };
      expect(body.error.code).toBe("EMAIL_ALREADY_SENT");
      expect(mocks.queueAdd).not.toHaveBeenCalled();
    });

    it("refuses a row whose payload was discarded rather than reporting success", async () => {
      mocks.responses.push(
        { rows: [] },
        { rows: [{ status: "failed", has_payload: false }] },
      );

      const { retry } = await captureHandlers();
      const reply = makeMockReply();
      await retry({ params: { id: "outbox-1" } }, reply);

      expect(reply.status).toHaveBeenCalledWith(409);
      const body = reply.send.mock.calls[0][0] as {
        error: { code: string; message: string };
      };
      expect(body.error.code).toBe("EMAIL_PAYLOAD_DISCARDED");
      expect(body.error.message).toContain("nothing left to send");
      expect(mocks.queueAdd).not.toHaveBeenCalled();
    });

    it("refuses a row that is still being retried automatically", async () => {
      mocks.responses.push(
        { rows: [] },
        { rows: [{ status: "pending", has_payload: true }] },
      );

      const { retry } = await captureHandlers();
      const reply = makeMockReply();
      await retry({ params: { id: "outbox-1" } }, reply);

      expect(reply.status).toHaveBeenCalledWith(409);
      const body = reply.send.mock.calls[0][0] as { error: { code: string } };
      expect(body.error.code).toBe("EMAIL_NOT_FAILED");
      expect(mocks.queueAdd).not.toHaveBeenCalled();
    });

    it("returns 404 when the row is gone", async () => {
      mocks.responses.push({ rows: [] }, { rows: [] });

      const { retry } = await captureHandlers();
      const reply = makeMockReply();
      await retry({ params: { id: "missing" } }, reply);

      expect(reply.status).toHaveBeenCalledWith(404);
      const body = reply.send.mock.calls[0][0] as { error: { code: string } };
      expect(body.error.code).toBe("EMAIL_OUTBOX_ROW_NOT_FOUND");
    });
  });
});
