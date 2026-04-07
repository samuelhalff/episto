import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../src/shared/errors/index.js";

const mocks = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
  },
  getDispatchForDraft: vi.fn(),
}));

vi.mock("../src/db/index.js", () => ({
  getDb: () => mocks.db,
  schema: {
    draftLetters: {
      id: "draft_id",
      sessionId: "session_id",
    },
  },
}));

vi.mock("../src/modules/sessions/session.middleware.js", () => ({
  requireSession: async (request: { session?: { id: string } }) => {
    request.session = { id: "session-1" };
  },
}));

vi.mock("../src/modules/dispatch/dispatch.service.js", () => ({
  getDispatchForDraft: mocks.getDispatchForDraft,
}));

import { dispatchRoutes } from "../src/modules/dispatch/dispatch.routes.js";

describe("dispatch routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    mocks.db.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    });

    app = Fastify();
    app.setErrorHandler((error, request, reply) => {
      if (error instanceof AppError) {
        reply.status(error.statusCode).send(error.toResponse(request.id));
        return;
      }

      throw error;
    });
    await app.register(dispatchRoutes);
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns not found when the requested draft is not owned by the active session", async () => {
    mocks.getDispatchForDraft.mockResolvedValue({
      id: "dispatch-1",
      draftId: "draft-1",
      state: "submitted",
      providerReference: "provider-ref",
      trackingNumber: null,
      submittedAt: new Date("2026-04-07T00:00:00.000Z"),
      updatedAt: new Date("2026-04-07T00:00:00.000Z"),
      lastCheckedAt: null,
      failureReason: null,
    });

    const response = await app.inject({
      method: "GET",
      url: "/drafts/draft-1/dispatch",
    });

    expect(response.statusCode).toBe(404);
    expect(mocks.getDispatchForDraft).not.toHaveBeenCalled();
  });
});
