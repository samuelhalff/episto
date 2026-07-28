import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertDefined } from "./assert-defined";

/**
 * The route, not the erasure.
 *
 * What erasure actually does — the tombstone triggers, the retention rules, the
 * session scrub — is pinned in `erasure.integration.test.ts` against a real
 * Postgres, because half of it is enforced by database triggers. This file used
 * to assert the same behaviour through a hand-built imitation of drizzle: a
 * chain mock indexed by call order, so adding one `SELECT` to the service broke
 * assertions about profiles. It was testing the mock. What is left here is the
 * part a database cannot answer: the route exists, and a missing session is a
 * 404 rather than a silent success.
 */

const mocks = vi.hoisted(() => ({
  eraseSessionData: vi.fn(),
}));

vi.mock("../src/db/index.js", () => ({
  getDb: () => ({}),
  schema: {},
}));

vi.mock("../src/modules/admin/admin-erasure.service.js", () => ({
  eraseSessionData: mocks.eraseSessionData,
}));

vi.mock("../src/shared/middleware/require-admin.js", () => ({
  getRequiredAdmin: vi.fn(() => ({
    actor: "test-admin@episto.ch",
    authMethod: "microsoft",
    email: "test-admin@episto.ch",
  })),
}));

import { adminSessionsRoutes } from "../src/modules/admin/admin-sessions.routes.js";
import { notFoundError } from "../src/shared/errors/index.js";

interface MockReply {
  status: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
}

function makeMockReply(): MockReply {
  const reply: MockReply = { status: vi.fn(), send: vi.fn() };
  reply.status.mockReturnValue(reply);
  return reply;
}

/** Register the routes and hand back the one under test. */
async function captureRoute(
  url: string,
): Promise<(req: unknown, reply: MockReply) => Promise<void>> {
  const handlers = new Map<string, (req: unknown, reply: MockReply) => Promise<void>>();
  const mockApp = {
    post: vi.fn(
      (route: string, handler: (req: unknown, reply: MockReply) => Promise<void>) => {
        handlers.set(route, handler);
      },
    ),
    get: vi.fn(),
  };

  await adminSessionsRoutes(
    mockApp as unknown as Parameters<typeof adminSessionsRoutes>[0],
  );

  return assertDefined(handlers.get(url), `Expected a handler for ${url}`);
}

describe("admin session erase route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.eraseSessionData.mockReset();
  });

  it("is registered as POST /admin/sessions/:id/erase", async () => {
    // The requireAdmin guard is applied by the parent adminRoutes
    // (admin.routes.ts) via app.addHook("preHandler", requireAdmin), so it is
    // not on this sub-router; the integration infra verifies the 401.
    await expect(captureRoute("/admin/sessions/:id/erase")).resolves.toBeTypeOf(
      "function",
    );
  });

  it("passes the admin actor through, so the audit records who asked", async () => {
    mocks.eraseSessionData.mockResolvedValue({
      draftsErased: 2,
      paidOrdersRetained: 1,
      filesMarkedForDeletion: 3,
      totalDrafts: 3,
    });

    const handler = await captureRoute("/admin/sessions/:id/erase");
    const reply = makeMockReply();
    await handler({ params: { id: "session-1" } }, reply);

    expect(mocks.eraseSessionData).toHaveBeenCalledWith(
      expect.anything(),
      "session-1",
      "test-admin@episto.ch",
    );
    expect(reply.send).toHaveBeenCalledWith({
      sessionId: "session-1",
      draftsErased: 2,
      paidOrdersRetained: 1,
      filesMarkedForDeletion: 3,
      totalDrafts: 3,
    });
  });

  it("returns 404 when the session is not found", async () => {
    mocks.eraseSessionData.mockRejectedValue(notFoundError("session"));

    const handler = await captureRoute("/admin/sessions/:id/erase");

    // The handler lets it through to the Fastify error handler rather than
    // reporting a successful erasure of nothing.
    await expect(
      handler({ params: { id: "nonexistent" } }, makeMockReply()),
    ).rejects.toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
  });
});
