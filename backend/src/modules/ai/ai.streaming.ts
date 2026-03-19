/**
 * AI streaming helpers — draft generation and revision via streaming.
 *
 * These functions handle the streaming stages of the AI pipeline:
 * - Draft letter generation (stage 5)
 * - Letter revision (stage 6 variant)
 * - Post-generation validation
 *
 * Each function streams tokens via the draft event bus and persists
 * the completed content as an assistant message and draft body update.
 */

import { randomUUID } from "node:crypto";
import { getDb } from "../../db/index.js";
import { draftLetter, reviseLetter, validateOutput } from "./ai.service.js";
import { createMessage } from "../messages/message.service.js";
import { emitDraftEvent } from "../drafting/draft-events.js";
import type { schema } from "../../db/index.js";

// Re-export for use by handler
export type DraftRecord = typeof schema.draftLetters.$inferSelect;

// ---------------------------------------------------------------------------
// Update draft fields helper
// ---------------------------------------------------------------------------

export type FieldUpdater = (
  draftId: string,
  sessionId: string,
  fields: Record<string, unknown>,
) => Promise<void>;

// ---------------------------------------------------------------------------
// Draft generation (streaming)
// ---------------------------------------------------------------------------

export async function streamDraftGeneration(
  draftId: string,
  sessionId: string,
  draft: DraftRecord,
  fields: Record<string, unknown>,
  intent: string,
  history: Array<{ role: string; content: string }>,
  userInstructions: string,
  updateFields: FieldUpdater,
): Promise<void> {
  const messageId = randomUUID();
  let fullContent = "";

  const sender = {
    firstName: (fields.senderFirstName as string) ?? "",
    lastName: (fields.senderLastName as string) ?? "",
    company: (fields.senderCompany as string | null) ?? null,
    addressLine1: (fields.senderAddressLine1 as string) ?? "",
    postalCode: (fields.senderPostalCode as string) ?? "",
    city: (fields.senderCity as string) ?? "",
  };

  const recipient = {
    firstName: (fields.recipientFirstName as string | null) ?? null,
    lastName: (fields.recipientLastName as string | null) ?? null,
    company: (fields.recipientCompany as string | null) ?? null,
    addressLine1: (fields.recipientAddressLine1 as string) ?? "",
    postalCode: (fields.recipientPostalCode as string) ?? "",
    city: (fields.recipientCity as string) ?? "",
  };

  const stream = draftLetter({
    subject: (fields.subject as string) ?? (draft.subject ?? ""),
    intent,
    tone: (fields.tone as string) ?? (draft.tone ?? "formal"),
    locale: draft.locale,
    sender,
    recipient,
    enclosureNote: (fields.enclosureNote as string | null) ?? draft.enclosureNote,
    userInstructions,
    conversationHistory: history,
  });

  for await (const token of stream) {
    fullContent += token;
    emitDraftEvent(draftId, "ai_token", { token, messageId });
  }

  // Post-generation validation
  const validation = await validateOutput({
    generatedContent: fullContent,
    locale: draft.locale,
  });

  if (validation.severity === "blocked") {
    emitDraftEvent(draftId, "error", {
      code: "AI_CONTENT_BLOCKED",
      message: "The generated content was blocked by content policy. Please try again with different instructions.",
    });
    return;
  }

  // Save assistant message
  const assistantMsg = await createMessage(getDb(), {
    draftId,
    role: "assistant",
    content: fullContent,
  });

  // Update draft body
  await updateFields(draftId, sessionId, { body: fullContent });

  emitDraftEvent(draftId, "ai_message_complete", {
    messageId: assistantMsg.id,
    fullContent,
    extractedFields: { body: fullContent },
  });
}

// ---------------------------------------------------------------------------
// Revision (streaming)
// ---------------------------------------------------------------------------

export async function streamRevision(
  draftId: string,
  sessionId: string,
  draft: DraftRecord,
  revisionInstruction: string,
  updateFields: FieldUpdater,
): Promise<void> {
  const messageId = randomUUID();
  let fullContent = "";

  const stream = reviseLetter({
    currentBody: draft.body ?? "",
    revisionInstruction,
    locale: draft.locale,
    tone: draft.tone ?? "formal",
  });

  for await (const token of stream) {
    fullContent += token;
    emitDraftEvent(draftId, "ai_token", { token, messageId });
  }

  // Validate revised output
  const validation = await validateOutput({
    generatedContent: fullContent,
    locale: draft.locale,
  });

  if (validation.severity === "blocked") {
    emitDraftEvent(draftId, "error", {
      code: "AI_CONTENT_BLOCKED",
      message: "The revised content was blocked by content policy. Please try again.",
    });
    return;
  }

  // Save assistant message
  const assistantMsg = await createMessage(getDb(), {
    draftId,
    role: "assistant",
    content: fullContent,
  });

  // Update draft body with revised content
  await updateFields(draftId, sessionId, { body: fullContent });

  emitDraftEvent(draftId, "ai_message_complete", {
    messageId: assistantMsg.id,
    fullContent,
    extractedFields: { body: fullContent },
  });
}
