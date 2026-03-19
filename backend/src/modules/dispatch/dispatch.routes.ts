import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getDb } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
import { requireAdmin } from "../../shared/middleware/require-admin.js";
import { notFoundError } from "../../shared/errors/index.js";
import { AppError } from "../../shared/errors/index.js";
import { getDispatchForDraft } from "./dispatch.service.js";

export async function dispatchRoutes(app: FastifyInstance): Promise<void> {
  // GET /drafts/:id/dispatch — get canonical dispatch state for a draft
  app.get<{ Params: { id: string } }>(
    "/drafts/:id/dispatch",
    { preHandler: [requireSession] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const db = getDb();
      const { id } = request.params;

      const dispatch = await getDispatchForDraft(db, id);
      if (!dispatch) throw notFoundError("dispatch attempt");

      reply.send({
        dispatch: {
          draftId: dispatch.draftId,
          dispatchAttemptId: dispatch.id,
          state: dispatch.state,
          providerRef: dispatch.providerReference ?? null,
          submittedAt: dispatch.submittedAt?.toISOString() ?? null,
          acceptedAt: null,
          rejectedAt: null,
          rejectionReason: dispatch.failureReason ?? null,
          trackingAvailable: false,
          lastCheckedAt: dispatch.lastCheckedAt?.toISOString() ?? null,
        },
      });
    },
  );

  // POST /drafts/:id/dispatch/retry — admin-only dispatch retry
  app.post<{ Params: { id: string } }>(
    "/drafts/:id/dispatch/retry",
    { preHandler: [requireAdmin] },
    async (_request, _reply) => {
      // Stub: dispatch retry requires provider integration
      throw new AppError({
        family: "dispatch_ambiguity",
        statusCode: 501,
        code: "DISPATCH_RETRY_NOT_IMPLEMENTED",
        message: "Dispatch retry requires provider API integration.",
        userMessage: "Dispatch retry is not available yet.",
        userAction: "Contact support for manual dispatch assistance.",
      });
    },
  );
}
