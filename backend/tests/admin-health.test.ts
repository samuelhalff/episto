import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertDefined } from "./assert-defined";

// ---------------------------------------------------------------------------
// Mock heavy dependencies before importing the module under test
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  mockExecute: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  mockCheckBucketAccess: vi.fn().mockResolvedValue(undefined),
  mockGetJobCounts: vi.fn().mockResolvedValue({
    waiting: 0,
    active: 0,
    failed: 0,
  }),
  mockEnv: vi.fn(),
}));

vi.mock("../src/db/index.js", () => ({
  getDb: () => ({ execute: mocks.mockExecute }),
  schema: {
    paymentAttempts: { createdAt: "createdAt" },
    dispatchAttempts: { submittedAt: "submittedAt" },
  },
}));

vi.mock("../src/modules/files/adapters/s3.adapter.js", () => ({
  checkBucketAccess: mocks.mockCheckBucketAccess,
}));

vi.mock("../src/queue/index.js", () => ({
  getQueue: () => ({ getJobCounts: mocks.mockGetJobCounts }),
  QUEUE_NAMES: {
    RENDER_PDF: "render-pdf",
    SUBMIT_DISPATCH: "submit-dispatch",
    RECONCILE_DISPATCH: "reconcile-ambiguous-dispatch",
    SEND_EMAIL: "send-transactional-email",
    CLEANUP_ASSETS: "cleanup-expired-assets",
  },
}));

// `isEnvLoaded` is needed because health now reaches the email outbox module,
// which builds a logger at import time.
vi.mock("../src/shared/config/index.js", () => ({
  env: mocks.mockEnv,
  isEnvLoaded: () => false,
}));

// Drizzle sql tag — must produce something select-able
vi.mock("drizzle-orm", () => ({
  sql: vi.fn().mockReturnValue("1"),
}));

// ---------------------------------------------------------------------------
// Test helpers — build a minimal Fastify-like app for route registration tests
// ---------------------------------------------------------------------------

interface MockRequest {
  log: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
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
    mocks.mockExecute.mockResolvedValue([{ "?column?": 1 }]);
    mocks.mockCheckBucketAccess.mockResolvedValue(undefined);
    mocks.mockGetJobCounts.mockResolvedValue({ waiting: 0, active: 0, failed: 0 });
    mocks.mockEnv.mockReturnValue({
      AZURE_OPENAI_API_KEY: "",
      AZURE_OPENAI_DEPLOYMENT: "",
      AI_PROJECT_CONNECTION_STRING: "",
      AI_PROJECT_EVALUATION_MODEL: "",
      AI_PROJECT_MODEL_DEPLOYMENT: "",
      AI_PROJECT_ENDPOINT: "",
      AI_PROVIDER_MODE: "azure_openai",
      AZURE_OPENAI_ENDPOINT: "https://openai.azure.com",
      AZURE_EXISTING_AIPROJECT_ENDPOINT: undefined,
      AZURE_AI_PROJECT_ENDPOINT: undefined,
      AZURE_EXISTING_AGENT_ID: undefined,
      AZURE_AI_AGENT_NAME: undefined,
      AZURE_AI_AGENT_VERSION: undefined,
      AZURE_ENV_NAME: undefined,
      AZURE_LOCATION: undefined,
      AZURE_SUBSCRIPTION_ID: undefined,
      AZURE_EXISTING_AIPROJECT_RESOURCE_ID: undefined,
      AZURE_EXISTING_RESOURCE_ID: undefined,
      NODE_ENV: "development",
      EMAIL_FROM: "dev@example.com",
      SUPPORT_EMAIL: "support@example.com",
    });
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

    await adminHealthRoutes(
      mockApp as unknown as Parameters<typeof adminHealthRoutes>[0],
    );

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

    await adminHealthRoutes(
      mockApp as unknown as Parameters<typeof adminHealthRoutes>[0],
    );

    const req: MockRequest = {
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
    const reply = makeMockReply();

    await assertDefined(capturedHandler, "Expected admin health handler")(req, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;

    expect(body).toMatchObject({
      api: { ok: true },
      database: { ok: true },
      redis: { ok: true },
      objectStorage: { ok: true },
      email: {
        ok: true,
        senderAddress: "dev@example.com",
      },
    });

    // Queue depth data should be present for all queues
    expect(typeof body.queues).toBe("object");
    expect(body.queues).toHaveProperty("render-pdf");
    expect(body.queues).toHaveProperty("submit-dispatch");
  });

  /**
   * The undelivered-email badge is the only place an operator learns that a
   * customer never got their receipt or their order-access link. Zero on that
   * badge means "everyone got their mail" — so a count we failed to read has to
   * come back as `null` and render as unavailable. Reporting zero because the
   * query threw would hide precisely the situation the badge exists to reveal,
   * and it would do it at the moment the database is already misbehaving.
   */
  it("reports an unreadable undelivered-email count as null rather than zero", async () => {
    mocks.mockExecute.mockRejectedValue(new Error("Connection refused"));

    let capturedHandler: (req: MockRequest, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminHealthRoutes(
      mockApp as unknown as Parameters<typeof adminHealthRoutes>[0],
    );

    const req: MockRequest = {
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
    const reply = makeMockReply();

    await assertDefined(capturedHandler, "Expected admin health handler")(req, reply);

    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect(body.undeliveredEmails).toBeNull();
  });

  it("handler returns 200 even when database check fails", async () => {
    mocks.mockExecute.mockRejectedValue(new Error("Connection refused"));

    let capturedHandler: (req: MockRequest, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminHealthRoutes(
      mockApp as unknown as Parameters<typeof adminHealthRoutes>[0],
    );

    const req: MockRequest = {
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
    const reply = makeMockReply();

    await assertDefined(capturedHandler, "Expected admin health handler")(req, reply);

    // Still 200 — status is surfaced per-service, not via HTTP status code
    expect(reply.status).toHaveBeenCalledWith(200);
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect((body.database as { ok: boolean }).ok).toBe(false);
    expect((body.database as { ok: boolean; detail: string }).detail).toContain(
      "Connection refused",
    );
  });

  it("handler returns 200 even when object storage check fails", async () => {
    mocks.mockCheckBucketAccess.mockRejectedValue(new Error("Bucket not found"));

    let capturedHandler: (req: MockRequest, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminHealthRoutes(
      mockApp as unknown as Parameters<typeof adminHealthRoutes>[0],
    );

    const req: MockRequest = {
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
    const reply = makeMockReply();
    await assertDefined(capturedHandler, "Expected admin health handler")(req, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect((body.objectStorage as { ok: boolean }).ok).toBe(false);
  });

  it("handler returns 200 even when Redis/queue check fails", async () => {
    mocks.mockGetJobCounts.mockRejectedValue(new Error("Redis ECONNREFUSED"));

    let capturedHandler: (req: MockRequest, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminHealthRoutes(
      mockApp as unknown as Parameters<typeof adminHealthRoutes>[0],
    );

    const req: MockRequest = {
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
    const reply = makeMockReply();
    await assertDefined(capturedHandler, "Expected admin health handler")(req, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect((body.redis as { ok: boolean }).ok).toBe(false);
  });

  it("surfaces invalid development email sender configuration in admin health", async () => {
    mocks.mockEnv.mockReturnValue({
      AZURE_OPENAI_API_KEY: "",
      AZURE_OPENAI_DEPLOYMENT: "",
      AI_PROJECT_CONNECTION_STRING: "",
      AI_PROJECT_EVALUATION_MODEL: "",
      AI_PROJECT_MODEL_DEPLOYMENT: "",
      AI_PROJECT_ENDPOINT: "",
      AI_PROVIDER_MODE: "azure_openai",
      AZURE_OPENAI_ENDPOINT: "https://openai.azure.com",
      AZURE_EXISTING_AIPROJECT_ENDPOINT: undefined,
      AZURE_AI_PROJECT_ENDPOINT: undefined,
      AZURE_EXISTING_AGENT_ID: undefined,
      AZURE_AI_AGENT_NAME: undefined,
      AZURE_AI_AGENT_VERSION: undefined,
      AZURE_ENV_NAME: undefined,
      AZURE_LOCATION: undefined,
      AZURE_SUBSCRIPTION_ID: undefined,
      AZURE_EXISTING_AIPROJECT_RESOURCE_ID: undefined,
      AZURE_EXISTING_RESOURCE_ID: undefined,
      NODE_ENV: "development",
      EMAIL_FROM: "contact@episto.ch",
      SUPPORT_EMAIL: "contact@episto.ch",
    });

    let capturedHandler: (req: MockRequest, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminHealthRoutes(
      mockApp as unknown as Parameters<typeof adminHealthRoutes>[0],
    );

    const req: MockRequest = {
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    };
    const reply = makeMockReply();
    await assertDefined(capturedHandler, "Expected admin health handler")(req, reply);

    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect(reply.status).toHaveBeenCalledWith(200);
    expect(body).toMatchObject({
      email: {
        ok: false,
        senderAddress: "contact@episto.ch",
      },
    });
  });
});
