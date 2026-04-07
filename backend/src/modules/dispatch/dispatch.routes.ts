import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { and, eq } from "drizzle-orm";
import { getDb, schema } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
import { notFoundError } from "../../shared/errors/index.js";
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
      const session = request.session!;
      const { id } = request.params;

      const [draft] = await db
        .select({ id: schema.draftLetters.id })
        .from(schema.draftLetters)
        .where(
          and(
            eq(schema.draftLetters.id, id),
            eq(schema.draftLetters.sessionId, session.id),
          ),
        )
        .limit(1);

      if (!draft) throw notFoundError("draft");

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

}
