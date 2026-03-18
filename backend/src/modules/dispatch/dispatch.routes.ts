import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getDb } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
import { notFoundError } from "../../shared/errors/index.js";
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
}
