import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, and, gte, sql } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { requireSession } from "../sessions/session.middleware.js";
import { notFoundError, AppError } from "../../shared/errors/index.js";
import { createMessage, listMessages } from "./message.service.js";
import { handleAiMessage } from "../ai/index.js";
import { createLogger } from "../../shared/logging/index.js";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const logger = createLogger("message-routes");

const SendMessageBody = z.object({
  content: z.string().min(1).max(4000),
});

const ListMessagesQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// Terminal draft states — messages cannot be sent once a draft reaches these
const TERMINAL_STATES = new Set(["submitted", "dispatched", "closed"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function verifyDraftOwnership(
  db: ReturnType<typeof getDb>,
  draftId: string,
  sessionId: string,
): Promise<typeof schema.draftLetters.$inferSelect> {
  const [draft] = await db
    .select()
    .from(schema.draftLetters)
    .where(
      and(
        eq(schema.draftLetters.id, draftId),
        eq(schema.draftLetters.sessionId, sessionId),
      ),
    )
    .limit(1);

  if (!draft) throw notFoundError("draft");
  return draft;
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

export async function messageRoutes(app: FastifyInstance): Promise<void> {
  // POST /drafts/:id/messages — send a user message
  app.post<{ Params: { id: string } }>(
    "/drafts/:id/messages",
    { preHandler: [requireSession] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const session = request.session!;
      const db = getDb();
      const { id: draftId } = request.params;

      const body = SendMessageBody.parse(request.body);

      const draft = await verifyDraftOwnership(db, draftId, session.id);

      if (TERMINAL_STATES.has(draft.status)) {
        throw new AppError({
          family: "policy_refusal",
          statusCode: 409,
          code: "DRAFT_TERMINAL",
          message: `Draft is in terminal state: ${draft.status}`,
          userMessage: "This letter can no longer be edited.",
          userAction: null,
        });
      }

      // Rate limit: 30 messages per session per hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const [rateResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.conversationMessages)
        .where(
          and(
            eq(schema.conversationMessages.draftId, draftId),
            gte(schema.conversationMessages.createdAt, oneHourAgo),
          ),
        );

      const recentCount = rateResult?.count ?? 0;
      if (recentCount >= 30) {
        throw new AppError({
          family: "policy_refusal",
          statusCode: 429,
          code: "MESSAGE_RATE_LIMIT",
          message: "Message rate limit exceeded (30/hour)",
          userMessage: "You've sent too many messages recently. Please wait a moment.",
          userAction: "Try again in a few minutes.",
        });
      }

      const message = await createMessage(db, {
        draftId,
        role: "user",
        content: body.content,
      });

      // Fire AI processing asynchronously — don't block the 202 response
      handleAiMessage({
        draftId,
        sessionId: session.id,
        userMessageId: message.id,
        userContent: body.content,
      }).catch((err) => {
        logger.error({ err, draftId, messageId: message.id }, "AI handler failed");
      });

      reply.status(202).send({
        message: {
          id: message.id,
          draftId: message.draftId,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
        },
        streamUrl: `/api/v1/drafts/${draftId}/stream`,
      });
    },
  );

  // GET /drafts/:id/messages — fetch conversation history
  app.get<{ Params: { id: string }; Querystring: { cursor?: string; limit?: string } }>(
    "/drafts/:id/messages",
    { preHandler: [requireSession] },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Querystring: { cursor?: string; limit?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const session = request.session!;
      const db = getDb();
      const { id: draftId } = request.params;

      await verifyDraftOwnership(db, draftId, session.id);

      const query = ListMessagesQuery.parse(request.query);

      const result = await listMessages(db, draftId, {
        cursor: query.cursor,
        limit: query.limit,
      });

      reply.send(result);
    },
  );
}
