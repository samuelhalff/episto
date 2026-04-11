import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertDefined } from "./assert-defined";

// ---------------------------------------------------------------------------
// Mock heavy dependencies before importing the module under test
// ---------------------------------------------------------------------------

const mockExecute = vi.fn();

vi.mock("../src/db/index.js", () => ({
  getDb: () => ({ execute: mockExecute }),
  schema: {},
}));

vi.mock("drizzle-orm", () => ({
  sql: vi.fn().mockReturnValue("1"),
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

function makeDispatchResult(rows: Array<{ state: string; count: string }>) {
  return { rows };
}

function makeCountResult(count: string) {
  return { rows: [{ count }] };
}

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { adminOverviewRoutes } from "../src/modules/admin/admin-overview.routes.js";

describe("adminOverviewRoutes", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: all counts zero, all states empty
    mockExecute
      .mockResolvedValueOnce(makeDispatchResult([]))   // dispatch state counts
      .mockResolvedValueOnce(makeDispatchResult([]))   // payment state counts
      .mockResolvedValueOnce(makeCountResult("0"))     // ambiguous dispatch queue
      .mockResolvedValueOnce(makeCountResult("0"))     // recent refunds
      .mockResolvedValueOnce(makeCountResult("0"));    // suspicious queue
  });

  it("is a function (Fastify plugin)", () => {
    expect(typeof adminOverviewRoutes).toBe("function");
  });

  it("registers a GET /admin/overview route", async () => {
    const routes: Array<{ method: string; url: string }> = [];
    const mockApp = {
      get: vi.fn((url: string, _opts: unknown) => {
        routes.push({ method: "GET", url });
      }),
    };

    await adminOverviewRoutes(mockApp as unknown as Parameters<typeof adminOverviewRoutes>[0]);

    expect(mockApp.get).toHaveBeenCalledOnce();
    expect(routes[0]).toMatchObject({ method: "GET", url: "/admin/overview" });
  });

  it("returns 200 with all required top-level fields", async () => {
    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminOverviewRoutes(mockApp as unknown as Parameters<typeof adminOverviewRoutes>[0]);

    const reply = makeMockReply();
    await assertDefined(capturedHandler, "Expected admin overview handler")(undefined, reply);

    expect(reply.status).toHaveBeenCalledWith(200);
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;

    expect(body).toHaveProperty("dispatch");
    expect(body).toHaveProperty("payments");
    expect(body).toHaveProperty("ambiguousDispatchQueue");
    expect(body).toHaveProperty("recentRefunds");
    expect(body).toHaveProperty("suspiciousActivityQueue");
    expect(body).toHaveProperty("generatedAt");
  });

  it("returns all six dispatch state keys initialised to zero when no rows", async () => {
    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminOverviewRoutes(mockApp as unknown as Parameters<typeof adminOverviewRoutes>[0]);

    const reply = makeMockReply();
    await assertDefined(capturedHandler, "Expected admin overview handler")(undefined, reply);

    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    const dispatch = body.dispatch as Record<string, number>;

    expect(dispatch).toEqual({
      queued: 0,
      submitted: 0,
      accepted: 0,
      rejected: 0,
      unknown: 0,
      reconciled: 0,
    });
  });

  it("populates dispatch counts from DB rows", async () => {
    vi.resetAllMocks();

    mockExecute
      .mockResolvedValueOnce(makeDispatchResult([
        { state: "queued", count: "5" },
        { state: "accepted", count: "12" },
        { state: "rejected", count: "2" },
      ]))
      .mockResolvedValueOnce(makeDispatchResult([]))
      .mockResolvedValueOnce(makeCountResult("0"))
      .mockResolvedValueOnce(makeCountResult("0"))
      .mockResolvedValueOnce(makeCountResult("0"));

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminOverviewRoutes(mockApp as unknown as Parameters<typeof adminOverviewRoutes>[0]);

    const reply = makeMockReply();
    await assertDefined(capturedHandler, "Expected admin overview handler")(undefined, reply);

    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    const dispatch = body.dispatch as Record<string, number>;

    expect(dispatch.queued).toBe(5);
    expect(dispatch.accepted).toBe(12);
    expect(dispatch.rejected).toBe(2);
    expect(dispatch.submitted).toBe(0);
  });

  it("returns ambiguousDispatchQueue and recentRefunds as numbers", async () => {
    vi.resetAllMocks();

    mockExecute
      .mockResolvedValueOnce(makeDispatchResult([]))
      .mockResolvedValueOnce(makeDispatchResult([]))
      .mockResolvedValueOnce(makeCountResult("7"))
      .mockResolvedValueOnce(makeCountResult("3"))
      .mockResolvedValueOnce(makeCountResult("2"));

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminOverviewRoutes(mockApp as unknown as Parameters<typeof adminOverviewRoutes>[0]);

    const reply = makeMockReply();
    await assertDefined(capturedHandler, "Expected admin overview handler")(undefined, reply);

    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect(body.ambiguousDispatchQueue).toBe(7);
    expect(body.recentRefunds).toBe(3);
    expect(body.suspiciousActivityQueue).toBe(2);
  });

  it("returns 500 with OVERVIEW_QUERY_FAILED when DB throws", async () => {
    vi.resetAllMocks();
    mockExecute.mockRejectedValue(new Error("DB connection lost"));

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminOverviewRoutes(mockApp as unknown as Parameters<typeof adminOverviewRoutes>[0]);

    const reply = makeMockReply();
    await assertDefined(capturedHandler, "Expected admin overview handler")(undefined, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    const body = reply.send.mock.calls[0][0] as { error: { code: string; message: string } };
    expect(body.error.code).toBe("OVERVIEW_QUERY_FAILED");
    expect(body.error.message).toContain("DB connection lost");
  });

  it("generatedAt is a valid ISO 8601 timestamp", async () => {
    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      get: vi.fn((_url: string, _opts: unknown, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
    };

    await adminOverviewRoutes(mockApp as unknown as Parameters<typeof adminOverviewRoutes>[0]);

    const reply = makeMockReply();
    await assertDefined(capturedHandler, "Expected admin overview handler")(undefined, reply);

    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    const ts = body.generatedAt as string;
    expect(typeof ts).toBe("string");
    expect(new Date(ts).toISOString()).toBe(ts);
  });
});
