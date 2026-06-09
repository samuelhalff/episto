/**
 * AI generation helpers — document generation and revision.
 *
 * These functions handle the structured document stages of the AI pipeline:
 * - Draft letter generation
 * - Letter revision
 * - Post-generation validation
 *
 * The model now returns a machine-readable contract that is parsed,
 * validated, converted into a structured document model, and then
 * persisted as both a compatibility plain-text body and metadata.
 */

import { getDb } from "../../db/index.js";
import { draftLetter, reviseLetter, validateOutput } from "./ai.service.js";
import { createMessage } from "../messages/message.service.js";
import { emitDraftEvent } from "../drafting/draft-events.js";
import type { schema } from "../../db/index.js";
import { extractAiDocumentMetadata, type DocumentModel } from "@episto/shared";

export type DraftRecord = typeof schema.draftLetters.$inferSelect;

export type FieldUpdater = (
  draftId: string,
  sessionId: string,
  fields: Record<string, unknown>,
) => Promise<void>;

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
  const effectiveLocale =
    typeof fields.locale === "string" && fields.locale.trim().length > 0
      ? fields.locale
      : draft.locale;
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

  const applied = await draftLetter(
    {
      subject: (fields.subject as string) ?? draft.subject ?? "",
      intent,
      tone: (fields.tone as string) ?? draft.tone ?? "formal",
      locale: effectiveLocale,
      sender,
      recipient,
      enclosureNote: (fields.enclosureNote as string | null) ?? draft.enclosureNote,
      userInstructions,
      conversationHistory: history,
    },
    {
      expectedMode: "structured_edit",
      allowPlainTextFallback: true,
      compatibilityMode: "plain_text_only",
    },
  );

  const validation = await validateOutput({
    generatedContent: applied.body,
    locale: effectiveLocale,
  });

  if (validation.severity === "blocked") {
    emitDraftEvent(draftId, "error", {
      code: "AI_CONTENT_BLOCKED",
      message:
        "The generated content was blocked by content policy. Please try again with different instructions.",
    });
    return;
  }

  const assistantMsg = await createMessage(getDb(), {
    draftId,
    role: "assistant",
    content: applied.body,
  });

  const nextMetadata = mergeAiDocumentMetadata(
    draft.metadata,
    applied.metadata,
    assistantMsg.id,
  );
  const nextSubject =
    typeof fields.subject === "string" && fields.subject.trim().length > 0
      ? fields.subject.trim()
      : applied.subject || (draft.subject?.trim() ?? "") || null;

  await updateFields(draftId, sessionId, {
    ...(effectiveLocale !== draft.locale ? { locale: effectiveLocale } : {}),
    body: applied.body,
    subject: nextSubject,
    metadata: nextMetadata,
  });

  emitDraftEvent(draftId, "ai_message_complete", {
    messageId: assistantMsg.id,
    fullContent: applied.body,
    documentModel: applied.document,
    extractedFields: { body: applied.body, metadata: nextMetadata },
  });
}

export async function streamRevision(
  draftId: string,
  sessionId: string,
  draft: DraftRecord,
  revisionInstruction: string,
  updateFields: FieldUpdater,
  effectiveLocale?: string | null,
): Promise<void> {
  const targetLocale = effectiveLocale ?? draft.locale;
  const currentDocument =
    extractAiDocumentMetadata(draft.metadata)?.document ?? fallbackDocument(draft.body);

  const applied = await reviseLetter(
    {
      currentBody: draft.body ?? "",
      revisionInstruction,
      locale: targetLocale,
      tone: draft.tone ?? "formal",
    },
    currentDocument,
    {
      expectedMode: "structured_edit",
      allowPlainTextFallback: true,
      compatibilityMode: "plain_text_only",
    },
  );

  const validation = await validateOutput({
    generatedContent: applied.body,
    locale: targetLocale,
  });

  if (validation.severity === "blocked") {
    emitDraftEvent(draftId, "error", {
      code: "AI_CONTENT_BLOCKED",
      message: "The revised content was blocked by content policy. Please try again.",
    });
    return;
  }

  const assistantMsg = await createMessage(getDb(), {
    draftId,
    role: "assistant",
    content: applied.body,
  });

  const nextMetadata = mergeAiDocumentMetadata(draft.metadata, applied.metadata);
  const nextSubject = applied.subject || draft.subject?.trim() || null;

  await updateFields(draftId, sessionId, {
    ...(targetLocale !== draft.locale ? { locale: targetLocale } : {}),
    body: applied.body,
    subject: nextSubject,
    metadata: nextMetadata,
  });

  emitDraftEvent(draftId, "ai_message_complete", {
    messageId: assistantMsg.id,
    fullContent: applied.body,
    documentModel: applied.document,
    extractedFields: { body: applied.body, metadata: nextMetadata },
  });
}

function mergeAiDocumentMetadata(
  existingMetadata: unknown,
  aiDocument: Record<string, unknown>,
  firstDraftMessageId?: string,
): Record<string, unknown> {
  const base =
    existingMetadata && typeof existingMetadata === "object"
      ? (existingMetadata as Record<string, unknown>)
      : {};
  return {
    ...base,
    aiDocument,
    firstDraftMessageId:
      typeof base.firstDraftMessageId === "string"
        ? base.firstDraftMessageId
        : firstDraftMessageId,
  };
}

function fallbackDocument(body: string | null): DocumentModel {
  return {
    version: "1.0",
    blocks: [
      {
        type: "paragraph",
        text: body ?? "",
        style: "Normal",
      },
    ],
  };
}
