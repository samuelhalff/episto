import { and, eq, gte, sql } from "drizzle-orm";

import { schema, type Db } from "../../db/index.js";
import { AppError } from "../../shared/errors/index.js";
import { createMessage, type MessageRow } from "./message.service.js";

/**
 * The two caps that stand between an anonymous client and our Azure bill.
 *
 * A real user writing one letter sends single-digit messages, so the per-draft
 * number is already generous. The session number is what stops the obvious
 * amplification — open twenty drafts, spend the per-draft budget on each — and
 * is deliberately well above any honest session.
 */
const MESSAGES_PER_DRAFT_PER_HOUR = 30;
const MESSAGES_PER_SESSION_PER_HOUR = 60;

/**
 * One message for both caps. Telling a client which limit it hit tells a bot
 * exactly what to rotate.
 */
export function messageRateLimited(): AppError {
  return new AppError({
    family: "policy_refusal",
    statusCode: 429,
    code: "MESSAGE_RATE_LIMIT",
    message: "Message rate limit exceeded",
    userMessage: "You've sent too many messages recently. Please wait a moment.",
    userAction: "Try again in a few minutes.",
  });
}

/** Namespace for the advisory lock, so it cannot collide with another use. */
const MESSAGE_BUDGET_LOCK_NAMESPACE = 0x6d736762; // "msgb"

/**
 * Count against the budget and insert, or refuse — with nothing in between.
 *
 * Counting and inserting as two statements is a check-then-write, and this one
 * loses under exactly the load it exists to stop: fifty concurrent requests all
 * read 59, all pass, and all insert. The cap becomes a suggestion precisely
 * when it matters. A transaction-scoped advisory lock on the session serialises
 * the check with its own insert; it costs an honest user nothing, because a
 * person sends one message at a time.
 */
export async function createMessageWithinBudget(
  db: Db,
  input: { sessionId: string; draftId: string; content: string },
): Promise<MessageRow> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(${MESSAGE_BUDGET_LOCK_NAMESPACE}, hashtext(${input.sessionId}))`,
    );

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [perDraft] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.conversationMessages)
      .where(
        and(
          eq(schema.conversationMessages.draftId, input.draftId),
          gte(schema.conversationMessages.createdAt, oneHourAgo),
        ),
      );

    if ((perDraft?.count ?? 0) >= MESSAGES_PER_DRAFT_PER_HOUR) {
      throw messageRateLimited();
    }

    // The per-draft cap alone was never a budget: draft creation allows 20 an
    // hour, so 20 × 30 is 600 AI calls an hour from one session, and the global
    // 100/min/IP limit does not notice — these requests are cheap to issue and
    // expensive to serve.
    const [perSession] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.conversationMessages)
      .innerJoin(
        schema.draftLetters,
        eq(schema.conversationMessages.draftId, schema.draftLetters.id),
      )
      .where(
        and(
          eq(schema.draftLetters.sessionId, input.sessionId),
          gte(schema.conversationMessages.createdAt, oneHourAgo),
        ),
      );

    if ((perSession?.count ?? 0) >= MESSAGES_PER_SESSION_PER_HOUR) {
      throw messageRateLimited();
    }

    return createMessage(tx as unknown as Db, {
      draftId: input.draftId,
      role: "user",
      content: input.content,
    });
  });
}
