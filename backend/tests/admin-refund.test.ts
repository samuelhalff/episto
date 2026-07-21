import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertDefined } from "./assert-defined";

// ---------------------------------------------------------------------------
// Mutable mock state
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  insertResult: { id: "event-1" } as unknown,
  createRefundResult: { refundId: "re_test_123" } as { refundId: string },
  transitionResult: {
    payment: {
      id: "payment-1",
      draftId: "draft-1",
      sessionId: "session-1",
      state: "refund_pending",
      stripePaymentIntentId: "pi_test_1",
      stripeChargeId: "ch_test_1",
      amountCents: 490,
      currency: "CHF",
      breakdown: {},
      failureReason: null,
      refundReason: "Test refund",
      verifiedPhoneE164: null,
      phoneVerifiedAt: null,
      orderAccessTokenHash: null,
      orderAccessTokenExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    rawOrderAccessToken: null,
  },
  chainRejects: null as Error | null,
  getDbCalls: [] as string[],
}));

// ---------------------------------------------------------------------------
// Chain builder for drizzle-like select queries
// ---------------------------------------------------------------------------

function makeSelectChain(resultIndex: number) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn((_table: unknown) => {
    return chain;
  });
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockImplementation(() => {
    if (mocks.chainRejects) throw mocks.chainRejects;
    const idx = mocks.selectResults.length > resultIndex ? resultIndex : 0;
    const result = mocks.selectResults[idx] ?? [];
    // Advance for next call if using shared chain
    return Promise.resolve(result);
  });
  return chain;
}

// Per-call chain — each select() returns a fresh chain with its own index
let selectCallCount = 0;
function makeDb() {
  selectCallCount = 0;
  return {
    select: vi.fn((_columns?: unknown) => {
      const idx = selectCallCount++;
      return makeSelectChain(idx);
    }),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mocks.insertResult])),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([mocks.transitionResult.payment])),
        })),
      })),
    })),
  };
}

vi.mock("../src/db/index.js", () => ({
  getDb: () => makeDb(),
  schema: {
    draftLetters: {
      id: "draft_id",
      sessionId: "session_id",
    },
    paymentAttempts: {
      id: "payment_id",
      draftId: "draft_id",
      state: "state",
      stripePaymentIntentId: "stripe_payment_intent_id",
      stripeChargeId: "stripe_charge_id",
      amountCents: "amount_cents",
      updatedAt: "updated_at",
    },
    dispatchAttempts: {
      id: "dispatch_id",
      draftId: "draft_id",
      state: "state",
    },
    supportEvents: {
      id: "event_id",
    },
  },
}));

// Mock stripe adapter
vi.mock("../src/modules/payments/adapters/stripe.adapter.js", () => ({
  createRefund: vi.fn(() => Promise.resolve(mocks.createRefundResult)),
}));

// Mock payment service
vi.mock("../src/modules/payments/payment.service.js", () => ({
  transitionPaymentState: vi.fn(() => Promise.resolve(mocks.transitionResult)),
}));

// Mock recordSupportEvent
vi.mock("../src/modules/admin/index.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    recordSupportEvent: vi.fn(() => Promise.resolve({ id: "event-1" })),
  };
});

// Mock require-admin
vi.mock("../src/shared/middleware/require-admin.js", () => ({
  getRequiredAdmin: vi.fn(() => ({
    actor: "test-admin@episto.ch",
    authMethod: "microsoft",
    email: "test-admin@episto.ch",
  })),
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { adminActionRoutes } from "../src/modules/admin/admin-actions.routes.js";
import { recordSupportEvent } from "../src/modules/admin/index.js";
import { createRefund } from "../src/modules/payments/adapters/stripe.adapter.js";
import { transitionPaymentState } from "../src/modules/payments/payment.service.js";

// ---------------------------------------------------------------------------
// Helpers
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
// Tests
// ---------------------------------------------------------------------------

describe("admin refund route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    mocks.selectResults = [];
    mocks.chainRejects = null;
    mocks.createRefundResult = { refundId: "re_test_123" };
    mocks.transitionResult = {
      payment: {
        id: "payment-1",
        draftId: "draft-1",
        sessionId: "session-1",
        state: "refund_pending",
        stripePaymentIntentId: "pi_test_1",
        stripeChargeId: "ch_test_1",
        amountCents: 490,
        currency: "CHF",
        breakdown: {},
        failureReason: null,
        refundReason: "Test refund",
        verifiedPhoneE164: null,
        phoneVerifiedAt: null,
        orderAccessTokenHash: null,
        orderAccessTokenExpiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      rawOrderAccessToken: null,
    };
  });

  // -----------------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------------

  it("refunds a captured payment and transitions to refund_pending", async () => {
    // selectResults[0] = draft lookup
    mocks.selectResults[0] = [{ id: "draft-1", sessionId: "session-1" }];
    // selectResults[1] = payment lookup
    mocks.selectResults[1] = [
      {
        id: "payment-1",
        draftId: "draft-1",
        state: "captured",
        stripePaymentIntentId: "pi_test_1",
      },
    ];
    // selectResults[2] = dispatch lookup (guard)
    mocks.selectResults[2] = [];

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      post: vi.fn((_url: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
      get: vi.fn(),
    };

    await adminActionRoutes(
      mockApp as unknown as Parameters<typeof adminActionRoutes>[0],
    );

    const req = {
      params: { id: "draft-1" },
      body: { reason: "Customer requested refund" },
    };
    const reply = makeMockReply();

    await assertDefined(capturedHandler, "Expected refund handler")(req, reply);

    expect(reply.send).toHaveBeenCalledOnce();
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toMatchObject({
      refundId: "re_test_123",
      paymentAttemptId: "payment-1",
      state: "refund_pending",
    });

    // Verify Stripe refund was called
    expect(createRefund).toHaveBeenCalledWith("pi_test_1", "Customer requested refund");

    // Verify state transition was called
    expect(transitionPaymentState).toHaveBeenCalledWith(
      expect.anything(),
      "payment-1",
      "refund_pending",
      { refundReason: "Customer requested refund" },
    );

    // Verify support events were logged (2 calls: refund_requested + refund_initiated)
    expect(recordSupportEvent).toHaveBeenCalledTimes(2);
    const calls = (recordSupportEvent as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][1]).toMatchObject({
      eventType: "refund_requested",
      draftId: "draft-1",
    });
    expect(calls[1][1]).toMatchObject({
      eventType: "refund_initiated",
      draftId: "draft-1",
    });
  });

  // -----------------------------------------------------------------------
  // Dispatch guard: refuse when dispatch is submitted
  // -----------------------------------------------------------------------

  it("refuses refund (409) when dispatch is in submitted state", async () => {
    mocks.selectResults[0] = [{ id: "draft-1", sessionId: "session-1" }];
    mocks.selectResults[1] = [
      {
        id: "payment-1",
        draftId: "draft-1",
        state: "captured",
        stripePaymentIntentId: "pi_test_1",
      },
    ];
    // dispatch is submitted — should be refused
    mocks.selectResults[2] = [{ state: "submitted" }];

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      post: vi.fn((_url: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
      get: vi.fn(),
    };

    await adminActionRoutes(
      mockApp as unknown as Parameters<typeof adminActionRoutes>[0],
    );

    const req = {
      params: { id: "draft-1" },
      body: { reason: "Customer requested refund" },
    };
    const reply = makeMockReply();

    await expect(assertDefined(capturedHandler)(req, reply)).rejects.toMatchObject({
      statusCode: 409,
      code: "DISPATCH_IN_PROGRESS",
    });

    // Stripe refund should NOT be called
    expect(createRefund).not.toHaveBeenCalled();
    // State transition should NOT be called
    expect(transitionPaymentState).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Dispatch guard: refuse when dispatch is accepted
  // -----------------------------------------------------------------------

  it("refuses refund (409) when dispatch is in accepted state", async () => {
    mocks.selectResults[0] = [{ id: "draft-1", sessionId: "session-1" }];
    mocks.selectResults[1] = [
      {
        id: "payment-1",
        draftId: "draft-1",
        state: "captured",
        stripePaymentIntentId: "pi_test_1",
      },
    ];
    mocks.selectResults[2] = [{ state: "accepted" }];

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      post: vi.fn((_url: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
      get: vi.fn(),
    };

    await adminActionRoutes(
      mockApp as unknown as Parameters<typeof adminActionRoutes>[0],
    );

    const req = {
      params: { id: "draft-1" },
      body: { reason: "Customer requested refund" },
    };
    const reply = makeMockReply();

    await expect(assertDefined(capturedHandler)(req, reply)).rejects.toMatchObject({
      statusCode: 409,
      code: "DISPATCH_IN_PROGRESS",
    });

    expect(createRefund).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Dispatch guard: allow refund when dispatch is queued (not submitted yet)
  // -----------------------------------------------------------------------

  it("allows refund when dispatch is queued (not submitted/accepted)", async () => {
    mocks.selectResults[0] = [{ id: "draft-1", sessionId: "session-1" }];
    mocks.selectResults[1] = [
      {
        id: "payment-1",
        draftId: "draft-1",
        state: "captured",
        stripePaymentIntentId: "pi_test_1",
      },
    ];
    mocks.selectResults[2] = [{ state: "queued" }];

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      post: vi.fn((_url: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
      get: vi.fn(),
    };

    await adminActionRoutes(
      mockApp as unknown as Parameters<typeof adminActionRoutes>[0],
    );

    const req = {
      params: { id: "draft-1" },
      body: { reason: "Customer requested refund" },
    };
    const reply = makeMockReply();

    await assertDefined(capturedHandler)(req, reply);

    expect(reply.send).toHaveBeenCalledOnce();
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect(body.refundId).toBe("re_test_123");
    expect(createRefund).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Allow refund when no dispatch exists yet
  // -----------------------------------------------------------------------

  it("allows refund when no dispatch record exists", async () => {
    mocks.selectResults[0] = [{ id: "draft-1", sessionId: "session-1" }];
    mocks.selectResults[1] = [
      {
        id: "payment-1",
        draftId: "draft-1",
        state: "captured",
        stripePaymentIntentId: "pi_test_1",
      },
    ];
    // no dispatch record
    mocks.selectResults[2] = [];

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      post: vi.fn((_url: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
      get: vi.fn(),
    };

    await adminActionRoutes(
      mockApp as unknown as Parameters<typeof adminActionRoutes>[0],
    );

    const req = {
      params: { id: "draft-1" },
      body: { reason: "Customer requested refund" },
    };
    const reply = makeMockReply();

    await assertDefined(capturedHandler)(req, reply);

    expect(reply.send).toHaveBeenCalledOnce();
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect(body.refundId).toBe("re_test_123");
  });

  // -----------------------------------------------------------------------
  // Refuse if payment is not captured
  // -----------------------------------------------------------------------

  it("refuses refund when payment is not in captured state", async () => {
    mocks.selectResults[0] = [{ id: "draft-1", sessionId: "session-1" }];
    mocks.selectResults[1] = [
      {
        id: "payment-1",
        draftId: "draft-1",
        state: "pending",
        stripePaymentIntentId: "pi_test_1",
      },
    ];

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      post: vi.fn((_url: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
      get: vi.fn(),
    };

    await adminActionRoutes(
      mockApp as unknown as Parameters<typeof adminActionRoutes>[0],
    );

    const req = {
      params: { id: "draft-1" },
      body: { reason: "Too early" },
    };
    const reply = makeMockReply();

    await expect(assertDefined(capturedHandler)(req, reply)).rejects.toMatchObject({
      code: "PAYMENT_NOT_REFUNDABLE",
    });

    expect(createRefund).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // requireAdmin protection: route is registered on parent with preHandler
  // This test verifies the handler is guarded — the actual preHandler is
  // applied by the parent adminRoutes, so we verify the route is present.
  // -----------------------------------------------------------------------

  it("registers the refund POST route on the app", async () => {
    const routes: Array<{ method: string; url: string }> = [];
    const mockApp = {
      post: vi.fn((url: string, _handler: unknown) => {
        routes.push({ method: "POST", url });
      }),
      get: vi.fn(),
    };

    await adminActionRoutes(
      mockApp as unknown as Parameters<typeof adminActionRoutes>[0],
    );

    const refundRoute = routes.find((r) => r.url === "/admin/drafts/:id/refund");
    expect(refundRoute).toBeDefined();
    expect(assertDefined(refundRoute).method).toBe("POST");
  });

  // -----------------------------------------------------------------------
  // Draft not found
  // -----------------------------------------------------------------------

  it("returns 404 when draft is not found", async () => {
    mocks.selectResults[0] = []; // no draft

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      post: vi.fn((_url: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
      get: vi.fn(),
    };

    await adminActionRoutes(
      mockApp as unknown as Parameters<typeof adminActionRoutes>[0],
    );

    const req = {
      params: { id: "nonexistent" },
      body: { reason: "Test refund" },
    };
    const reply = makeMockReply();

    await assertDefined(capturedHandler)(req, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({ error: "Draft not found" });
  });

  // -----------------------------------------------------------------------
  // Payment not found
  // -----------------------------------------------------------------------

  it("returns 404 when payment is not found for draft", async () => {
    mocks.selectResults[0] = [{ id: "draft-1", sessionId: "session-1" }];
    mocks.selectResults[1] = []; // no payment

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      post: vi.fn((_url: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
      get: vi.fn(),
    };

    await adminActionRoutes(
      mockApp as unknown as Parameters<typeof adminActionRoutes>[0],
    );

    const req = {
      params: { id: "draft-1" },
      body: { reason: "Test refund" },
    };
    const reply = makeMockReply();

    await assertDefined(capturedHandler)(req, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({
      error: "No payment record found for this draft",
    });
  });
});
