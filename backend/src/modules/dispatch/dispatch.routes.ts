import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getDb, schema } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
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
          id: dispatch.id,
          draftId: dispatch.draftId,
          state: dispatch.state,
          providerName: dispatch.providerName,
          providerReference: dispatch.providerReference,
          submittedAt: dispatch.submittedAt,
          lastCheckedAt: dispatch.lastCheckedAt,
          failureReason: dispatch.failureReason,
          createdAt: dispatch.createdAt,
          updatedAt: dispatch.updatedAt,
        },
      });
    },
  );

  // POST /drafts/:id/dispatch/retry — admin-only dispatch retry
  app.post<{ Params: { id: string } }>(
    "/drafts/:id/dispatch/retry",
    async (request, reply) => {
      const auth = request.headers.authorization;
      if (!auth || !auth.startsWith("Basic ")) {
        throw new AppError({
          family: "validation_error",
          statusCode: 401,
          code: "ADMIN_AUTH_REQUIRED",
          message: "Admin authentication required for dispatch retry",
          userMessage: "Authentication required.",
          userAction: null,
        });
      }

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
