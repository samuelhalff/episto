import { getDb } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { and, desc, eq } from "drizzle-orm";
import {
  getDraftWorkspaceState,
  mergeDraftWorkspaceState,
  type DraftWorkspaceState,
  type RecipientDraftFormState,
  type SenderDraftFormState,
} from "@episto/shared";

import { normalizeAddressPresentation } from "./address-normalization.js";
import { createMessage } from "../messages/message.service.js";
import { emitDraftEvent } from "../drafting/draft-events.js";

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

export interface ConversationHistoryEntry {
  id: string;
  role: string;
  content: string;
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function mergeFullName(
  existingFullName: string,
  nextFirstName: string,
  nextLastName: string,
): string {
  const existingParts = splitFullName(existingFullName);
  const firstName = nextFirstName || existingParts.firstName;
  const lastName = nextLastName || existingParts.lastName;
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

export function buildExistingFieldsContext(draft: {
  subject: string | null;
  body: string | null;
  tone: string | null;
  intent: string | null;
  enclosureNote: string | null;
  deliveryType: string;
  metadata: unknown;
}): Record<string, unknown> {
  const workspaceState = getDraftWorkspaceState(draft.metadata);
  const senderParts = splitFullName(workspaceState.senderForm?.fullName ?? "");
  const recipientParts = splitFullName(workspaceState.recipientForm?.fullName ?? "");

  return {
    subject: draft.subject,
    body: draft.body,
    tone: draft.tone,
    intent: draft.intent,
    enclosureNote: draft.enclosureNote,
    deliveryType: draft.deliveryType,
    senderFirstName: senderParts.firstName || undefined,
    senderLastName: senderParts.lastName || undefined,
    senderAddressLine1: workspaceState.senderForm?.addressLine1 || undefined,
    senderPostalCode: workspaceState.senderForm?.postalCode || undefined,
    senderCity: workspaceState.senderForm?.city || undefined,
    recipientFirstName: recipientParts.firstName || undefined,
    recipientLastName: recipientParts.lastName || undefined,
    recipientCompany: workspaceState.recipientForm?.companyName || undefined,
    recipientAddressLine1: workspaceState.recipientForm?.addressLine1 || undefined,
    recipientPostalCode: workspaceState.recipientForm?.postalCode || undefined,
    recipientCity: workspaceState.recipientForm?.city || undefined,
    metadata: draft.metadata,
  };
}

export function mergeRecipientName(fields: Record<string, unknown>): string {
  const firstName =
    typeof fields.recipientFirstName === "string" ? fields.recipientFirstName.trim() : "";
  const lastName =
    typeof fields.recipientLastName === "string" ? fields.recipientLastName.trim() : "";
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}

function buildWorkspaceDraftPatch(
  fields: Record<string, unknown>,
  currentState: DraftWorkspaceState,
): Record<string, unknown | null> {
  const senderFirstName =
    typeof fields.senderFirstName === "string" ? fields.senderFirstName.trim() : "";
  const senderLastName =
    typeof fields.senderLastName === "string" ? fields.senderLastName.trim() : "";
  const senderAddressLine1 =
    typeof fields.senderAddressLine1 === "string"
      ? normalizeAddressPresentation(fields.senderAddressLine1)
      : "";
  const senderPostalCode =
    typeof fields.senderPostalCode === "string" ? fields.senderPostalCode.trim() : "";
  const senderCity =
    typeof fields.senderCity === "string"
      ? normalizeAddressPresentation(fields.senderCity)
      : "";

  const recipientFirstName =
    typeof fields.recipientFirstName === "string" ? fields.recipientFirstName.trim() : "";
  const recipientLastName =
    typeof fields.recipientLastName === "string" ? fields.recipientLastName.trim() : "";
  const recipientCompany =
    typeof fields.recipientCompany === "string" ? fields.recipientCompany.trim() : "";
  const recipientAddressLine1 =
    typeof fields.recipientAddressLine1 === "string"
      ? normalizeAddressPresentation(fields.recipientAddressLine1)
      : "";
  const recipientPostalCode =
    typeof fields.recipientPostalCode === "string"
      ? fields.recipientPostalCode.trim()
      : "";
  const recipientCity =
    typeof fields.recipientCity === "string"
      ? normalizeAddressPresentation(fields.recipientCity)
      : "";

  const patch: Record<string, unknown | null> = {};
  const currentSender = currentState.senderForm;
  const currentRecipient = currentState.recipientForm;
  const hasSenderUpdate = Boolean(
    senderFirstName ||
    senderLastName ||
    senderAddressLine1 ||
    senderPostalCode ||
    senderCity,
  );
  const hasRecipientUpdate = Boolean(
    recipientFirstName ||
    recipientLastName ||
    recipientCompany ||
    recipientAddressLine1 ||
    recipientPostalCode ||
    recipientCity,
  );

  if (hasSenderUpdate) {
    patch.senderForm = {
      fullName: mergeFullName(
        currentSender?.fullName ?? "",
        senderFirstName,
        senderLastName,
      ),
      addressLine1: senderAddressLine1 || currentSender?.addressLine1 || "",
      postalCode: senderPostalCode || currentSender?.postalCode || "",
      city: senderCity || currentSender?.city || "",
    } satisfies SenderDraftFormState;
  }

  if (hasRecipientUpdate) {
    const recipientIsCompany = recipientCompany
      ? true
      : recipientFirstName || recipientLastName
        ? false
        : (currentRecipient?.isCompany ?? false);
    const mergedRecipientCompany = recipientIsCompany
      ? recipientCompany || currentRecipient?.companyName || ""
      : "";
    const mergedRecipientFullName = recipientIsCompany
      ? ""
      : mergeFullName(
          currentRecipient?.fullName ?? "",
          recipientFirstName,
          recipientLastName,
        );

    patch.recipientForm = {
      isCompany: recipientIsCompany,
      showManual:
        currentRecipient?.showManual ??
        Boolean(
          recipientAddressLine1 ||
          recipientPostalCode ||
          recipientCity ||
          !recipientIsCompany,
        ),
      fullName: mergedRecipientFullName,
      companyName: mergedRecipientCompany,
      selectedCompany:
        recipientIsCompany &&
        recipientCompany &&
        recipientCompany !== currentRecipient?.companyName
          ? null
          : (currentRecipient?.selectedCompany ?? null),
      addressLine1: recipientAddressLine1 || currentRecipient?.addressLine1 || "",
      postalCode: recipientPostalCode || currentRecipient?.postalCode || "",
      city: recipientCity || currentRecipient?.city || "",
    } satisfies RecipientDraftFormState;
  }

  return patch;
}

export async function loadConversationHistory(
  draftId: string,
  limit = 20,
): Promise<ConversationHistoryEntry[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: schema.conversationMessages.id,
      role: schema.conversationMessages.role,
      content: schema.conversationMessages.content,
    })
    .from(schema.conversationMessages)
    .where(eq(schema.conversationMessages.draftId, draftId))
    .orderBy(desc(schema.conversationMessages.createdAt))
    .limit(limit);
  return rows.reverse();
}

export function buildComposeInstructions(
  conversationHistory: ConversationHistoryEntry[],
): string | null {
  const userMessages = conversationHistory
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean);

  if (userMessages.length === 0) {
    return null;
  }

  return userMessages.join("\n\n");
}

export async function emitAssistantCompletion(
  draftId: string,
  conversationHistory: ConversationHistoryEntry[],
  content: string,
): Promise<void> {
  const trimmedContent = content.trim();
  const lastMessage = conversationHistory.at(-1);

  if (
    trimmedContent.length > 0 &&
    lastMessage?.role === "assistant" &&
    lastMessage.content.trim() === trimmedContent
  ) {
    emitDraftEvent(draftId, "ai_message_complete", {
      messageId: lastMessage.id,
      fullContent: lastMessage.content,
    });
    return;
  }

  const assistantMsg = await createMessage(getDb(), {
    draftId,
    role: "assistant",
    content,
  });

  emitDraftEvent(draftId, "ai_message_complete", {
    messageId: assistantMsg.id,
    fullContent: content,
  });
}

export async function updateDraftFields(
  draftId: string,
  sessionId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const emitFields: Array<{ field: string; value: unknown }> = [];

  const [currentDraft] = await db
    .select({ metadata: schema.draftLetters.metadata })
    .from(schema.draftLetters)
    .where(
      and(
        eq(schema.draftLetters.id, draftId),
        eq(schema.draftLetters.sessionId, sessionId),
      ),
    )
    .limit(1);

  const currentWorkspaceState = getDraftWorkspaceState(currentDraft?.metadata);
  const workspacePatch = buildWorkspaceDraftPatch(fields, currentWorkspaceState);

  if (Object.keys(workspacePatch).length > 0) {
    updates.metadata = mergeDraftWorkspaceState(currentDraft?.metadata, workspacePatch);
    emitFields.push({ field: "metadata", value: updates.metadata });
  }

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
