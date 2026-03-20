/**
 * AI message handler — orchestrates the full AI pipeline for a user message.
 *
 * Flow:
 * 1. Classify intent (block harmful content)
 * 2. Extract structured fields from the message
 * 3. Update draft fields in the database
 * 4. Check if all required fields are present
 * 5a. If not ready: generate a follow-up question → save as assistant message
 * 5b. If ready: stream a letter draft → validate → save as assistant message + update body
 * 6. Emit events at each stage for SSE relay
 *
 * This handler runs asynchronously after the message POST route returns 202.
 * Errors are caught and emitted as stream error events.
 */

import { getDb } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { eq, and, desc } from "drizzle-orm";
import { createLogger } from "../../shared/logging/index.js";
import { AppError } from "../../shared/errors/index.js";
import { classifyIntent, extractFields, askFollowUp } from "./ai.service.js";
import { streamDraftGeneration, streamRevision } from "./ai.streaming.js";
import { createMessage } from "../messages/message.service.js";
import { emitDraftEvent } from "../drafting/draft-events.js";

const logger = createLogger("ai-handler");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HandleMessageInput {
  draftId: string;
  sessionId: string;
  userMessageId: string;
  userContent: string;
}

// Draft fields that can be extracted by AI
const DRAFT_FIELD_COLUMNS = new Set([
  "subject",
  "body",
  "tone",
  "intent",
  "enclosureNote",
  "deliveryType",
  "signatureMode",
  "metadata",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadDraft(draftId: string, sessionId: string) {
  const db = getDb();
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
  return draft ?? null;
}

async function loadConversationHistory(draftId: string, limit = 20) {
  const db = getDb();
  const rows = await db
    .select({ role: schema.conversationMessages.role, content: schema.conversationMessages.content })
    .from(schema.conversationMessages)
    .where(eq(schema.conversationMessages.draftId, draftId))
    .orderBy(desc(schema.conversationMessages.createdAt))
    .limit(limit);
  return rows.reverse();
}

async function updateDraftFields(
  draftId: string,
  sessionId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const emitFields: Array<{ field: string; value: unknown }> = [];

  for (const [key, value] of Object.entries(fields)) {
    if (DRAFT_FIELD_COLUMNS.has(key) && value !== undefined && value !== null) {
      updates[key] = value;
      emitFields.push({ field: key, value });
    }
  }

  if (Object.keys(updates).length <= 1) return;

  await db
    .update(schema.draftLetters)
    .set(updates)
    .where(
      and(
        eq(schema.draftLetters.id, draftId),
        eq(schema.draftLetters.sessionId, sessionId),
      ),
    );

  const now = new Date().toISOString();
  for (const { field, value } of emitFields) {
    emitDraftEvent(draftId, "field_update", { field, value, updatedAt: now });
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export async function handleAiMessage(input: HandleMessageInput): Promise<void> {
  const { draftId, sessionId, userContent } = input;

  try {
    const draft = await loadDraft(draftId, sessionId);
    if (!draft) {
      logger.warn({ draftId }, "Draft not found during AI processing");
      return;
    }

    const conversationHistory = await loadConversationHistory(draftId);
    const existingFields: Record<string, unknown> = {
      subject: draft.subject,
      body: draft.body,
      tone: draft.tone,
      intent: draft.intent,
      enclosureNote: draft.enclosureNote,
      deliveryType: draft.deliveryType,
      metadata: draft.metadata,
    };

    // Stage 1: Classify intent
    const classification = await classifyIntent({
      userMessage: userContent,
      locale: draft.locale,
    });

    logger.info(
      { draftId, intent: classification.intent, risk: classification.risk },
      "Intent classified",
    );

    // Stage 2: Extract fields
    const extracted = await extractFields({
      userMessage: userContent,
      existingFields,
      locale: draft.locale,
    });

    // Stage 3: Update draft with extracted fields
    if (Object.keys(extracted).length > 0) {
      await updateDraftFields(draftId, sessionId, extracted);
    }

    const mergedFields = { ...existingFields, ...extracted };

    if (classification.intent !== existingFields.intent) {
      await updateDraftFields(draftId, sessionId, { intent: classification.intent });
      mergedFields.intent = classification.intent;
    }

    // Revision flow: body already exists and conversation is established
    const isRevision = !!draft.body && conversationHistory.length > 2;

    if (isRevision) {
      await streamRevision(draftId, sessionId, draft, userContent, updateDraftFields);
      return;
    }

    // Stage 4: Check readiness
    const followUp = await askFollowUp({
      intent: classification.intent,
      existingFields: mergedFields,
      locale: draft.locale,
    });

    if (!followUp.ready) {
      const content = followUp.question ?? followUp.message ?? "Could you provide more details?";
      const assistantMsg = await createMessage(getDb(), {
        draftId,
        role: "assistant",
        content,
      });

      emitDraftEvent(draftId, "ai_message_complete", {
        messageId: assistantMsg.id,
        fullContent: content,
      });
      return;
    }

    // Stage 5: Stream letter generation
    await streamDraftGeneration(
      draftId, sessionId, draft, mergedFields,
      classification.intent, conversationHistory,
      userContent, updateDraftFields,
    );
  } catch (err) {
    logger.error({ err, draftId }, "AI processing failed");

    const errorPayload = err instanceof AppError
      ? { code: err.code, message: err.userMessage }
      : { code: "AI_PROCESSING_FAILED", message: "AI processing encountered an error. You can continue editing manually." };

    emitDraftEvent(draftId, "error", errorPayload);
  }
}
