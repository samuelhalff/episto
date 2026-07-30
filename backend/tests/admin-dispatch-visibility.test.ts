import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertDefined } from "./assert-defined";

// ---------------------------------------------------------------------------
// Mutable mock chain for getDb().select() → from → where → orderBy → limit
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  chainResult: [] as unknown[],
  chainRejects: null as Error | null,
}));

function makeChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.leftJoin = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockImplementation(() => {
    if (mocks.chainRejects) throw mocks.chainRejects;
    return Promise.resolve(mocks.chainResult);
  });
  return chain;
}

vi.mock("../src/db/index.js", () => ({
  getDb: () => ({
    select: vi.fn().mockImplementation(() => makeChain()),
  }),
  schema: {
    dispatchAttempts: {
      id: "dispatch_id",
      draftId: "draft_id",
      state: "state",
      providerName: "provider_name",
      failureReason: "failure_reason",
      providerReference: "provider_reference",
      createdAt: "created_at",
      updatedAt: "updated_at",
      lastCheckedAt: "last_checked_at",
      providerDiagnostics: "provider_diagnostics",
    },
    draftLetters: {
      id: "draft_id",
      fulfillmentStatus: "fulfillment_status",
      sessionId: "session_id",
    },
    sessions: { id: "session_id", email: "email" },
    paymentAttempts: { id: "payment_id", state: "payment_state" },
  },
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

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
// Import after mocks
// ---------------------------------------------------------------------------

import { adminDispatchRoutes } from "../src/modules/admin/admin-dispatch.routes.js";

describe("adminDispatchRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chainResult = [];
    mocks.chainRejects = null;
  });

  it("is a function (Fastify plugin)", () => {
    expect(typeof adminDispatchRoutes).toBe("function");
  });

  it("registers a GET /admin/dispatch/failed route", async () => {
    const routes: Array<{ method: string; url: string }> = [];
    const mockApp = {
      get: vi.fn((url: string, _opts: unknown) => {
        routes.push({ method: "GET", url });
      }),
    };

    await adminDispatchRoutes(
      mockApp as unknown as Parameters<typeof adminDispatchRoutes>[0],
    );

    expect(mockApp.get).toHaveBeenCalledOnce();
    expect(routes[0]).toMatchObject({ method: "GET", url: "/admin/dispatch/failed" });
  });

  it("returns 200 with correct structure when DB returns failed dispatches", async () => {
    const now = new Date("2026-07-21T12:00:00.000Z");
    mocks.chainResult = [
      {
        id: "dispatch-1",
        draftId: "draft-1",
        state: "rejected",
        providerName: "postal-ch",
        failureReason: "Invalid address",
        providerReference: "ref-1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "dispatch-2",
        draftId: "draft-2",
        state: "unknown",
        providerName: "postal-ch",
        failureReason: null,
        providerReference: null,
        createdAt: now,
        updatedAt: now,
      },
    ];

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminDispatchRoutes(
      mockApp as unknown as Parameters<typeof adminDispatchRoutes>[0],
    );

    const reply = makeMockReply();
    await assertDefined(capturedHandler)(undefined, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;

    expect(body).toHaveProperty("count");
    expect(body).toHaveProperty("dispatches");
    expect(body).toHaveProperty("generatedAt");
    expect(body.count).toBe(2);

    const dispatches = body.dispatches as Array<Record<string, unknown>>;
    expect(dispatches).toHaveLength(2);
    expect(dispatches[0].dispatchAttemptId).toBe("dispatch-1");
    expect(dispatches[0].state).toBe("rejected");
    expect(dispatches[0].failureReason).toBe("Invalid address");
    expect(dispatches[1].dispatchAttemptId).toBe("dispatch-2");
    expect(dispatches[1].state).toBe("unknown");
    expect(dispatches[1].failureReason).toBeNull();
  });

  it("returns 200 with empty dispatches when no failed dispatches exist", async () => {
    mocks.chainResult = [];

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminDispatchRoutes(
      mockApp as unknown as Parameters<typeof adminDispatchRoutes>[0],
    );

    const reply = makeMockReply();
    await assertDefined(capturedHandler)(undefined, reply);

    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect(body.count).toBe(0);
    const dispatches = body.dispatches as Array<unknown>;
    expect(dispatches).toHaveLength(0);
  });

  it("returns 500 with DISPATCH_FAILED_QUERY_FAILED when DB throws", async () => {
    mocks.chainRejects = new Error("DB connection lost");

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminDispatchRoutes(
      mockApp as unknown as Parameters<typeof adminDispatchRoutes>[0],
    );

    const reply = makeMockReply();
    await assertDefined(capturedHandler)(undefined, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    const body = reply.send.mock.calls[0][0] as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("DISPATCH_FAILED_QUERY_FAILED");
    expect(body.error.message).toContain("DB connection lost");
  });

  it("generatedAt is a valid ISO 8601 timestamp", async () => {
    mocks.chainResult = [];

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminDispatchRoutes(
      mockApp as unknown as Parameters<typeof adminDispatchRoutes>[0],
    );

    const reply = makeMockReply();
    await assertDefined(capturedHandler)(undefined, reply);

    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    const ts = body.generatedAt as string;
    expect(typeof ts).toBe("string");
    expect(new Date(ts).toISOString()).toBe(ts);
  });
});
