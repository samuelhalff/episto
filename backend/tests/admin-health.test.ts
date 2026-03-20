import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock heavy dependencies before importing the module under test
// ---------------------------------------------------------------------------

const mockExecute = vi.fn().mockResolvedValue([{ "?column?": 1 }]);
vi.mock("../src/db/index.js", () => ({
  getDb: () => ({ execute: mockExecute }),
  schema: {
    paymentAttempts: { createdAt: "createdAt" },
    dispatchAttempts: { submittedAt: "submittedAt" },
  },
}));

const mockSend = vi.fn().mockResolvedValue({});
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
  HeadBucketCommand: vi.fn().mockImplementation((input) => input),
}));

const mockGetJobCounts = vi.fn().mockResolvedValue({
  waiting: 0,
  active: 0,
  failed: 0,
});
vi.mock("../src/queue/index.js", () => ({
  getQueue: () => ({ getJobCounts: mockGetJobCounts }),
  QUEUE_NAMES: {
    RENDER_PDF: "render-pdf",
    SUBMIT_DISPATCH: "submit-dispatch",
    RECONCILE_DISPATCH: "reconcile-ambiguous-dispatch",
    SEND_EMAIL: "send-transactional-email",
    CLEANUP_ASSETS: "cleanup-expired-assets",
  },
}));

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    S3_ENDPOINT: "http://localhost:9000",
    S3_REGION: "us-east-1",
    S3_BUCKET: "swiss-mail-test",
    S3_ACCESS_KEY: "minioadmin",
    S3_SECRET_KEY: "minioadmin",
  }),
}));

// Drizzle sql tag — must produce something select-able
vi.mock("drizzle-orm", () => ({
  sql: vi.fn().mockReturnValue("1"),
}));

// ---------------------------------------------------------------------------
// Test helpers — build a minimal Fastify-like app for route registration tests
// ---------------------------------------------------------------------------

interface MockRequest {
  log: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
}
interface MockReply {
  status: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
}

function makeMockReply(): MockReply {
  const reply: MockReply = {
    status: vi.fn(),
    send: vi.fn(),
  };
  reply.status.mockReturnValue(reply);
  return reply;
}

// ---------------------------------------------------------------------------
// Import after mocks are set up
// ---------------------------------------------------------------------------

import { adminHealthRoutes } from "../src/modules/admin/admin-health.routes.js";

describe("adminHealthRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue([{ "?column?": 1 }]);
    mockSend.mockResolvedValue({});
    mockGetJobCounts.mockResolvedValue({ waiting: 0, active: 0, failed: 0 });
  });

  it("is a function (Fastify plugin)", () => {
    expect(typeof adminHealthRoutes).toBe("function");
  });

  it("registers a GET /admin/health route on the app instance", async () => {
    const routes: Array<{ method: string; url: string }> = [];
    const mockApp = {
      get: vi.fn((url: string, _opts: unknown, _handler: unknown) => {
        routes.push({ method: "GET", url });
      }),
    };

    await adminHealthRoutes(mockApp as unknown as Parameters<typeof adminHealthRoutes>[0]);

    expect(mockApp.get).toHaveBeenCalledOnce();
    expect(routes).toHaveLength(1);
    expect(routes[0]).toMatchObject({ method: "GET", url: "/admin/health" });
  });

  it("handler returns 200 with all service status fields when all checks pass", async () => {
    // Capture the route handler registered by adminHealthRoutes
    let capturedHandler: (req: MockRequest, reply: MockReply) => Promise<void>;

    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminHealthRoutes(mockApp as unknown as Parameters<typeof adminHealthRoutes>[0]);

    const req: MockRequest = {
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
    const reply = makeMockReply();

    await capturedHandler!(req, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;

    expect(body).toMatchObject({
      api: { ok: true },
      database: { ok: true },
      redis: { ok: true },
      objectStorage: { ok: true },
    });

    // Queue depth data should be present for all queues
    expect(typeof body.queues).toBe("object");
    expect(body.queues).toHaveProperty("render-pdf");
    expect(body.queues).toHaveProperty("submit-dispatch");
  });

  it("handler returns 200 even when database check fails", async () => {
    mockExecute.mockRejectedValue(new Error("Connection refused"));

    let capturedHandler: (req: MockRequest, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminHealthRoutes(mockApp as unknown as Parameters<typeof adminHealthRoutes>[0]);

    const req: MockRequest = {
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
    const reply = makeMockReply();

    await capturedHandler!(req, reply);

    // Still 200 — status is surfaced per-service, not via HTTP status code
    expect(reply.status).toHaveBeenCalledWith(200);
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect((body.database as { ok: boolean }).ok).toBe(false);
    expect((body.database as { ok: boolean; detail: string }).detail).toContain(
      "Connection refused",
    );
  });

  it("handler returns 200 even when object storage check fails", async () => {
    mockSend.mockRejectedValue(new Error("Bucket not found"));

    let capturedHandler: (req: MockRequest, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminHealthRoutes(mockApp as unknown as Parameters<typeof adminHealthRoutes>[0]);

    const req: MockRequest = {
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
    const reply = makeMockReply();
    await capturedHandler!(req, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect((body.objectStorage as { ok: boolean }).ok).toBe(false);
  });

  it("handler returns 200 even when Redis/queue check fails", async () => {
    mockGetJobCounts.mockRejectedValue(new Error("Redis ECONNREFUSED"));

    let capturedHandler: (req: MockRequest, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminHealthRoutes(mockApp as unknown as Parameters<typeof adminHealthRoutes>[0]);

    const req: MockRequest = {
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
    const reply = makeMockReply();
    await capturedHandler!(req, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect((body.redis as { ok: boolean }).ok).toBe(false);
  });
});
