import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertDefined } from "./assert-defined";

// ---------------------------------------------------------------------------
// Mutable mock state
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  selectResults: [] as unknown[][],
  insertResult: { id: "event-1" } as unknown,
  updateResults: [] as Array<Array<{ id: string }>>,
  chainRejects: null as Error | null,
}));

// ---------------------------------------------------------------------------
// Chain builder for drizzle-like select queries
// ---------------------------------------------------------------------------

function makeSelectChain(resultIndex: number) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockImplementation(() => {
    if (mocks.chainRejects) throw mocks.chainRejects;
    const idx = mocks.selectResults.length > resultIndex ? resultIndex : 0;
    const result = mocks.selectResults[idx] ?? [];
    return Promise.resolve(result);
  });
  return chain;
}

let selectCallCount = 0;

function makeUpdateReturning(resultIndex: number) {
  const update = {
    set: vi.fn(() => update),
    where: vi.fn(() => ({
      returning: vi.fn(() => {
        const idx = mocks.updateResults.length > resultIndex ? resultIndex : 0;
        return Promise.resolve(mocks.updateResults[idx] ?? []);
      }),
    })),
  };
  return update;
}

let updateCallCount = 0;

function makeDb() {
  selectCallCount = 0;
  updateCallCount = 0;
  const db = {
    select: vi.fn(() => {
      const idx = selectCallCount++;
      return makeSelectChain(idx);
    }),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([mocks.insertResult])),
      })),
    })),
    update: vi.fn(() => {
      const idx = updateCallCount++;
      return makeUpdateReturning(idx);
    }),
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(db)),
  };
  return db;
}

vi.mock("../src/db/index.js", () => ({
  getDb: () => makeDb(),
  schema: {
    sessions: {
      id: "session_id",
      expiresAt: "expires_at",
    },
    draftLetters: {
      id: "draft_id",
      sessionId: "session_id",
      subject: "subject",
      body: "body",
      tone: "tone",
      intent: "intent",
      enclosureNote: "enclosure_note",
      senderProfileId: "sender_profile_id",
      recipientProfileId: "recipient_profile_id",
      updatedAt: "updated_at",
    },
    senderProfiles: {
      id: "sender_profile_id",
    },
    recipientProfiles: {
      id: "recipient_profile_id",
    },
    paymentAttempts: {
      id: "payment_id",
      draftId: "draft_id",
      state: "state",
    },
    dispatchAttempts: {
      id: "dispatch_id",
      draftId: "draft_id",
      state: "state",
    },
    fileAssets: {
      id: "file_asset_id",
      draftId: "draft_id",
      status: "status",
    },
    supportEvents: {
      id: "event_id",
    },
  },
}));

vi.mock("../src/modules/admin/index.js", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    recordSupportEvent: vi.fn(() => Promise.resolve({ id: "event-1" })),
  };
});

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

import { adminSessionsRoutes } from "../src/modules/admin/admin-sessions.routes.js";
import { recordSupportEvent } from "../src/modules/admin/index.js";

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

const now = new Date();

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("admin session erase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    updateCallCount = 0;
    mocks.selectResults = [];
    mocks.updateResults = [];
    mocks.chainRejects = null;
    mocks.insertResult = { id: "event-1" };
  });

  // -----------------------------------------------------------------------
  // Happy path: erase PII of unpaid draft, mark files pending_deletion
  // -----------------------------------------------------------------------

  it("erases PII of an unpaid draft and marks its files pending_deletion", async () => {
    // selectResults[0] = session lookup
    mocks.selectResults[0] = [
      { id: "session-1", expiresAt: new Date(Date.now() + 3600000) },
    ];
    // selectResults[1] = draft count → 1
    mocks.selectResults[1] = [{ count: 1 }];
    // selectResults[2] = drafts for session — one unpaid draft
    mocks.selectResults[2] = [
      {
        id: "draft-1",
        sessionId: "session-1",
        subject: "Mahnung",
        body: "Bitte zahlen Sie...",
        tone: "formal",
        intent: "payment_reminder",
        enclosureNote: "Rechnung",
        senderProfileId: "sp-1",
        recipientProfileId: "rp-1",
        updatedAt: now,
        status: "ready",
        locale: "de-CH",
        deliveryType: "standard",
        signatureFlowMode: "visual",
        fulfillmentStatus: "draft_completed",
        signatureMode: "drawn",
        schemaVersion: 1,
        signatureAssetId: null,
        estimatedPages: null,
        reviewedAt: null,
        metadata: null,
        createdAt: now,
      },
    ];
    // selectResults[3] = payment lookup — no payment (unpaid)
    mocks.selectResults[3] = [];
    // selectResults[4] = dispatch lookup — no dispatch
    mocks.selectResults[4] = [];

    // updateResults[0] = draft redaction
    mocks.updateResults[0] = [{ id: "draft-1" }];
    // updateResults[1] = sender profile redaction
    mocks.updateResults[1] = [{ id: "sp-1" }];
    // updateResults[2] = recipient profile redaction
    mocks.updateResults[2] = [{ id: "rp-1" }];
    // updateResults[3] = file assets → pending_deletion (2 files)
    mocks.updateResults[3] = [{ id: "fa-1" }, { id: "fa-2" }];
    // updateResults[4] = session expire
    mocks.updateResults[4] = [{ id: "session-1" }];

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      post: vi.fn((_url: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
      get: vi.fn(),
    };

    await adminSessionsRoutes(
      mockApp as unknown as Parameters<typeof adminSessionsRoutes>[0],
    );

    const req = { params: { id: "session-1" } };
    const reply = makeMockReply();

    await assertDefined(capturedHandler, "Expected erase handler")(req, reply);

    expect(reply.send).toHaveBeenCalledOnce();
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toMatchObject({
      sessionId: "session-1",
      draftsErased: 1,
      paidOrdersRetained: 0,
      filesMarkedForDeletion: 2,
      totalDrafts: 1,
    });

    // Verify audit event
    expect(recordSupportEvent).toHaveBeenCalledOnce();
    const auditCall = (recordSupportEvent as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(auditCall[1]).toMatchObject({
      sessionId: "session-1",
      eventType: "session_data_erased",
    });
  });

  // -----------------------------------------------------------------------
  // RETENTION: retains a paid-order draft untouched
  // -----------------------------------------------------------------------

  it("retains a paid-order draft untouched and counts it in paidOrdersRetained", async () => {
    // selectResults[0] = session lookup
    mocks.selectResults[0] = [
      { id: "session-2", expiresAt: new Date(Date.now() + 3600000) },
    ];
    // selectResults[1] = draft count → 1
    mocks.selectResults[1] = [{ count: 1 }];
    // selectResults[2] = drafts — one paid draft
    mocks.selectResults[2] = [
      {
        id: "draft-2",
        sessionId: "session-2",
        subject: "Rechnung",
        body: "Betrag: CHF 49.00",
        tone: "formal",
        intent: null,
        enclosureNote: null,
        senderProfileId: "sp-2",
        recipientProfileId: "rp-2",
        updatedAt: now,
        status: "dispatched",
        locale: "de-CH",
        deliveryType: "registered",
        signatureFlowMode: "visual",
        fulfillmentStatus: "completed",
        signatureMode: "drawn",
        schemaVersion: 1,
        signatureAssetId: null,
        estimatedPages: null,
        reviewedAt: null,
        metadata: null,
        createdAt: now,
      },
    ];
    // selectResults[3] = payment — captured (PAID)
    mocks.selectResults[3] = [{ id: "pmt-1", state: "captured" }];
    // selectResults[4] = dispatch lookup — submitted
    mocks.selectResults[4] = [{ id: "disp-1", state: "submitted" }];

    // Session soft-expire
    mocks.updateResults[0] = [{ id: "session-2" }];

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      post: vi.fn((_url: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
      get: vi.fn(),
    };

    await adminSessionsRoutes(
      mockApp as unknown as Parameters<typeof adminSessionsRoutes>[0],
    );

    const req = { params: { id: "session-2" } };
    const reply = makeMockReply();

    await assertDefined(capturedHandler, "Expected erase handler")(req, reply);

    expect(reply.send).toHaveBeenCalledOnce();
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toMatchObject({
      sessionId: "session-2",
      draftsErased: 0,
      paidOrdersRetained: 1,
      filesMarkedForDeletion: 0,
      totalDrafts: 1,
    });

    // Verify audit event confirms retention with correct counts
    expect(recordSupportEvent).toHaveBeenCalledOnce();
    const auditCall = (recordSupportEvent as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(auditCall[1]).toMatchObject({
      sessionId: "session-2",
      eventType: "session_data_erased",
      details: {
        draftsErased: 0,
        paidOrdersRetained: 1,
        filesMarkedForDeletion: 0,
      },
    });
  });

  // -----------------------------------------------------------------------
  // Requires admin (unauth → 401 via requireAdmin scope)
  // -----------------------------------------------------------------------

  it("is registered under a parent scope with requireAdmin preHandler", async () => {
    // Verify the route is registered on the app under the admin sessions sub-router
    const routes: Array<{ method: string; url: string }> = [];
    const mockApp = {
      post: vi.fn((url: string, _handler: unknown) => {
        routes.push({ method: "POST", url });
      }),
      get: vi.fn(),
    };

    await adminSessionsRoutes(
      mockApp as unknown as Parameters<typeof adminSessionsRoutes>[0],
    );

    const eraseRoute = routes.find((r) => r.url === "/admin/sessions/:id/erase");
    expect(eraseRoute).toBeDefined();
    expect(assertDefined(eraseRoute).method).toBe("POST");

    // The requireAdmin guard is applied by the parent adminRoutes (admin.routes.ts)
    // via app.addHook("preHandler", requireAdmin), so it isn't on the sub-router.
    // This test confirms the route exists; the integration test infra verifies 401.
  });

  // -----------------------------------------------------------------------
  // Idempotent: second call returns success and changes nothing further
  // -----------------------------------------------------------------------

  it("is idempotent: second call returns success with zero changes", async () => {
    // simulate already-erased draft (subject is null)
    mocks.selectResults[0] = [
      { id: "session-3", expiresAt: new Date(Date.now() - 1000) }, // already expired
    ];
    // selectResults[1] = draft count → 1
    mocks.selectResults[1] = [{ count: 1 }];
    mocks.selectResults[2] = [
      {
        id: "draft-3",
        sessionId: "session-3",
        subject: null, // already erased
        body: null,
        tone: null,
        intent: null,
        enclosureNote: null,
        senderProfileId: "sp-3",
        recipientProfileId: "rp-3",
        updatedAt: now,
        status: "closed",
        locale: "de-CH",
        deliveryType: "standard",
        signatureFlowMode: "visual",
        fulfillmentStatus: "expired",
        signatureMode: "drawn",
        schemaVersion: 1,
        signatureAssetId: null,
        estimatedPages: null,
        reviewedAt: null,
        metadata: null,
        createdAt: now,
      },
    ];
    // No payment
    mocks.selectResults[3] = [];
    // No dispatch
    mocks.selectResults[4] = [];

    // File update returns 0 (already pending_deletion)
    mocks.updateResults[0] = [];

    // No session expire (already expired)
    // Actually we still try — but expiresAt > now() check fails

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      post: vi.fn((_url: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
      get: vi.fn(),
    };

    await adminSessionsRoutes(
      mockApp as unknown as Parameters<typeof adminSessionsRoutes>[0],
    );

    const req = { params: { id: "session-3" } };
    const reply = makeMockReply();

    await assertDefined(capturedHandler, "Expected erase handler")(req, reply);

    expect(reply.send).toHaveBeenCalledOnce();
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toMatchObject({
      sessionId: "session-3",
      draftsErased: 0,
      paidOrdersRetained: 0,
      filesMarkedForDeletion: 0,
      totalDrafts: 1,
    });

    // Audit event still written
    expect(recordSupportEvent).toHaveBeenCalledOnce();
  });

  // -----------------------------------------------------------------------
  // Writes supportEvents audit row
  // -----------------------------------------------------------------------

  it("writes a supportEvents audit row with correct counts", async () => {
    // Two drafts: one paid (retained), one unpaid (erased)
    mocks.selectResults[0] = [
      { id: "session-4", expiresAt: new Date(Date.now() + 3600000) },
    ];
    // selectResults[1] = draft count → 2
    mocks.selectResults[1] = [{ count: 2 }];
    mocks.selectResults[2] = [
      {
        id: "draft-paid",
        sessionId: "session-4",
        subject: "Paid invoice",
        body: "Content",
        tone: null,
        intent: null,
        enclosureNote: null,
        senderProfileId: "sp-paid",
        recipientProfileId: "rp-paid",
        updatedAt: now,
        status: "dispatched",
        locale: "de-CH",
        deliveryType: "registered",
        signatureFlowMode: "visual",
        fulfillmentStatus: "completed",
        signatureMode: "drawn",
        schemaVersion: 1,
        signatureAssetId: null,
        estimatedPages: null,
        reviewedAt: null,
        metadata: null,
        createdAt: now,
      },
      {
        id: "draft-unpaid",
        sessionId: "session-4",
        subject: "Unpaid reminder",
        body: "Please pay",
        tone: "formal",
        intent: "reminder",
        enclosureNote: null,
        senderProfileId: "sp-unpaid",
        recipientProfileId: null,
        updatedAt: now,
        status: "ready",
        locale: "de-CH",
        deliveryType: "standard",
        signatureFlowMode: "visual",
        fulfillmentStatus: "draft_completed",
        signatureMode: "drawn",
        schemaVersion: 1,
        signatureAssetId: null,
        estimatedPages: null,
        reviewedAt: null,
        metadata: null,
        createdAt: now,
      },
    ];
    // Payment for draft-paid → captured
    mocks.selectResults[3] = [{ id: "pmt-paid", state: "captured" }];
    // No dispatch for draft-paid in this test — but payment alone is enough for retention
    mocks.selectResults[4] = [];
    // Payment for draft-unpaid → none
    mocks.selectResults[5] = [];
    // Dispatch for draft-unpaid → none
    mocks.selectResults[6] = [];

    // draft-unpaid redaction
    mocks.updateResults[0] = [{ id: "draft-unpaid" }];
    // sender profile redaction
    mocks.updateResults[1] = [{ id: "sp-unpaid" }];
    // file assets → pending_deletion (1 file)
    mocks.updateResults[2] = [{ id: "fa-unpaid" }];
    // session expire
    mocks.updateResults[3] = [{ id: "session-4" }];

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      post: vi.fn((_url: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
      get: vi.fn(),
    };

    await adminSessionsRoutes(
      mockApp as unknown as Parameters<typeof adminSessionsRoutes>[0],
    );

    const req = { params: { id: "session-4" } };
    const reply = makeMockReply();

    await assertDefined(capturedHandler, "Expected erase handler")(req, reply);

    expect(reply.send).toHaveBeenCalledOnce();
    const body = reply.send.mock.calls[0][0] as Record<string, unknown>;
    expect(body).toEqual({
      sessionId: "session-4",
      draftsErased: 1,
      paidOrdersRetained: 1,
      filesMarkedForDeletion: 1,
      totalDrafts: 2,
    });

    // Verify audit event details
    expect(recordSupportEvent).toHaveBeenCalledOnce();
    const auditCall = (recordSupportEvent as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(auditCall[1]).toMatchObject({
      sessionId: "session-4",
      eventType: "session_data_erased",
      actor: "test-admin@episto.ch",
      details: {
        draftsErased: 1,
        paidOrdersRetained: 1,
        filesMarkedForDeletion: 1,
        totalDrafts: 2,
      },
    });
  });

  // -----------------------------------------------------------------------
  // Session not found → 404
  // -----------------------------------------------------------------------

  it("returns 404 when session is not found", async () => {
    mocks.selectResults[0] = []; // no session

    let capturedHandler: (req: unknown, reply: MockReply) => Promise<void>;
    const mockApp = {
      post: vi.fn((_url: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
      }),
      get: vi.fn(),
    };

    await adminSessionsRoutes(
      mockApp as unknown as Parameters<typeof adminSessionsRoutes>[0],
    );

    const req = { params: { id: "nonexistent" } };
    const reply = makeMockReply();

    // The handler throws notFoundError which the Fastify error handler would catch
    await expect(
      assertDefined(capturedHandler, "Expected erase handler")(req, reply),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "NOT_FOUND",
    });
  });
});
