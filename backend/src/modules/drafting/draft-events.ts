/**
 * Draft event bus — typed in-process event emitter for SSE relay.
 *
 * Events are scoped per draft. The SSE endpoint subscribes to a draft's
 * channel and relays events to the connected client. The AI handler
 * and other backend services emit events when state changes.
 *
 * For single-instance deployment this uses Node's EventEmitter.
 * For multi-instance scaling, replace with Redis pub/sub.
 */

import { EventEmitter } from "node:events";

// ---------------------------------------------------------------------------
// Event payloads (match api-contracts.md §3.3 SSE event types)
// ---------------------------------------------------------------------------

export interface AiTokenPayload {
  token: string;
  messageId: string;
}

import type { DocumentModel } from "@episto/shared";

export interface AiMessageCompletePayload {
  messageId: string;
  fullContent: string;
  documentModel?: DocumentModel | undefined;
  extractedFields?: Record<string, unknown> | undefined;
}

export interface FieldUpdatePayload {
  field: string;
  value: unknown;
  updatedAt: string;
}

export interface DraftStatusPayload {
  draftStatus: string;
  updatedAt: string;
}

export interface StreamErrorPayload {
  code: string;
  message: string;
}

export type DraftEventMap = {
  ai_token: AiTokenPayload;
  ai_message_complete: AiMessageCompletePayload;
  field_update: FieldUpdatePayload;
  draft_status: DraftStatusPayload;
  error: StreamErrorPayload;
};

export type DraftEventType = keyof DraftEventMap;

// ---------------------------------------------------------------------------
// Singleton emitter
// ---------------------------------------------------------------------------

const emitter = new EventEmitter();
emitter.setMaxListeners(200); // Allow many concurrent SSE connections

// Channel key scoped to a specific draft
function channel(draftId: string): string {
  return `draft:${draftId}`;
}

// ---------------------------------------------------------------------------
// Publish
// ---------------------------------------------------------------------------

export function emitDraftEvent<T extends DraftEventType>(
  draftId: string,
  event: T,
  payload: DraftEventMap[T],
): void {
  emitter.emit(channel(draftId), event, payload);
}

// ---------------------------------------------------------------------------
// Subscribe / Unsubscribe
// ---------------------------------------------------------------------------

export type DraftEventHandler = (
  event: DraftEventType,
  payload: DraftEventMap[DraftEventType],
) => void;

export function subscribeDraft(draftId: string, handler: DraftEventHandler): void {
  emitter.on(channel(draftId), handler);
}

export function unsubscribeDraft(draftId: string, handler: DraftEventHandler): void {
  emitter.off(channel(draftId), handler);
}
