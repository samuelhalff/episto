import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getDb } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
import { requireAdmin } from "../../shared/middleware/require-admin.js";
import { notFoundError } from "../../shared/errors/index.js";
import { AppError } from "../../shared/errors/index.js";
import { getDispatchForDraft } from "./dispatch.service.js";

export async function dispatchRoutes(app: FastifyInstance): Promise<void> {
  // GET /drafts/:id/dispatch — get canonical dispatch state for a draft
  // Rate limit: 60/min per session (see docs/05-architecture/rate-limits-and-quotas.md)
  app.get<{ Params: { id: string } }>(
    "/drafts/:id/dispatch",
    {
      preHandler: [requireSession],
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute",
          keyGenerator: (req: FastifyRequest) =>
            (req as FastifyRequest & { session?: { id: string } }).session?.id ?? req.ip,
        },
      },
    },
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
          trackingNumber: dispatch.trackingNumber ?? null,
          submittedAt: dispatch.submittedAt?.toISOString() ?? null,
          acceptedAt:
            ["accepted", "reconciled"].includes(dispatch.state)
              ? dispatch.updatedAt.toISOString()
              : null,
          rejectedAt:
            dispatch.state === "rejected" ? dispatch.updatedAt.toISOString() : null,
          rejectionReason: dispatch.failureReason ?? null,
          trackingAvailable: Boolean(dispatch.trackingNumber),
          lastCheckedAt: dispatch.lastCheckedAt?.toISOString() ?? null,
        },
      });
    },
  );

  // POST /drafts/:id/dispatch/retry — admin-only dispatch retry
  // Rate limit: 10/hour per admin credential (see docs/05-architecture/rate-limits-and-quotas.md)
  app.post<{ Params: { id: string } }>(
    "/drafts/:id/dispatch/retry",
    {
      preHandler: [requireAdmin],
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 hour",
          keyGenerator: (req: FastifyRequest) =>
            req.headers["authorization"]?.slice(0, 20) ?? req.ip,
        },
      },
    },
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
