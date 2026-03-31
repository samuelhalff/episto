"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { DocumentModel } from "@swiss-mail/shared";
import { captureMessage } from "../lib/error-tracking";

// ---------------------------------------------------------------------------
// SSE event types per realtime-strategy.md
// ---------------------------------------------------------------------------

export interface AiTokenEvent {
  token: string;
  messageId: string;
}

export interface AiMessageCompleteEvent {
  messageId: string;
  fullContent: string;
  documentModel?: DocumentModel;
  extractedFields?: Record<string, unknown>;
}

export interface FieldUpdateEvent {
  field: string;
  value: unknown;
  updatedAt: string;
}

export interface DraftStatusEvent {
  dispatchState: string;
  paymentState: string;
  updatedAt: string;
}

export interface StreamErrorEvent {
  code: string;
  message: string;
}

export type DraftStreamEvent =
  | { type: "ai_token"; data: AiTokenEvent }
  | { type: "ai_message_complete"; data: AiMessageCompleteEvent }
  | { type: "field_update"; data: FieldUpdateEvent }
  | { type: "draft_status"; data: DraftStatusEvent }
  | { type: "error"; data: StreamErrorEvent }
  | { type: "connected"; data: { draftId: string } };

type EventListener = (event: DraftStreamEvent) => void;

// ---------------------------------------------------------------------------
// Hook: useDraftStream
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const MAX_RECONNECT_FAILURES = 3;
const POLL_INTERVAL_MS = 5_000;

/**
 * Single shared SSE connection per active draft per tab.
 * Per realtime-strategy.md, only one EventSource instance should exist
 * per draft. Multiple hooks consume events via listeners.
 */
export function useDraftStream(draftId: string | null) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const listenersRef = useRef<Set<EventListener>>(new Set());
  const failCountRef = useRef(0);

  const subscribe = useCallback((listener: EventListener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!draftId) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    function dispatch(event: DraftStreamEvent) {
      for (const listener of listenersRef.current) {
        listener(event);
      }
    }

    function connect() {
      if (cancelled) return;

      const url = `${API_BASE}/v1/drafts/${draftId}/stream`;
      const es = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = es;

      es.addEventListener("connected", (e) => {
        failCountRef.current = 0;
        setConnected(true);
        try {
          dispatch({ type: "connected", data: JSON.parse(e.data) });
        } catch {
          captureMessage("SSE connected event parse error", "warning", {
            component: "useDraftStream",
          });
        }
      });

      es.addEventListener("ai_token", (e) => {
        try {
          dispatch({ type: "ai_token", data: JSON.parse(e.data) });
        } catch {
          captureMessage("SSE ai_token event parse error", "warning", {
            component: "useDraftStream",
          });
        }
      });

      es.addEventListener("ai_message_complete", (e) => {
        try {
          dispatch({ type: "ai_message_complete", data: JSON.parse(e.data) });
        } catch {
          captureMessage("SSE ai_message_complete event parse error", "warning", {
            component: "useDraftStream",
          });
        }
      });

      es.addEventListener("field_update", (e) => {
        try {
          dispatch({ type: "field_update", data: JSON.parse(e.data) });
        } catch {
          captureMessage("SSE field_update event parse error", "warning", {
            component: "useDraftStream",
          });
        }
      });

      es.addEventListener("draft_status", (e) => {
        try {
          dispatch({ type: "draft_status", data: JSON.parse(e.data) });
        } catch {
          captureMessage("SSE draft_status event parse error", "warning", {
            component: "useDraftStream",
          });
        }
      });

      es.addEventListener("error", (e) => {
        if (cancelled) return;

        // EventSource auto-reconnects on most errors, but if the
        // connection is fully closed we need to handle it
        if (es.readyState === EventSource.CLOSED) {
          setConnected(false);
          failCountRef.current += 1;

          if (failCountRef.current >= MAX_RECONNECT_FAILURES) {
            // Fallback to polling per realtime-strategy.md
            es.close();
            eventSourceRef.current = null;
            pollTimer = setInterval(() => {
              // Polling is handled by React Query invalidation in consuming hooks
              dispatch({
                type: "error",
                data: { code: "SSE_FALLBACK", message: "Polling mode" },
              });
            }, POLL_INTERVAL_MS);
            return;
          }

          // Retry connection after a short delay
          setTimeout(connect, 1000 * failCountRef.current);
        }

        // Try to parse error data if available
        const messageEvent = e as MessageEvent;
        if (messageEvent.data) {
          try {
            dispatch({ type: "error", data: JSON.parse(messageEvent.data) });
          } catch {
            captureMessage("SSE error event parse error", "warning", {
              component: "useDraftStream",
            });
          }
        }
      });
    }

    connect();

    return () => {
      cancelled = true;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (pollTimer) {
        clearInterval(pollTimer);
      }
      setConnected(false);
    };
  }, [draftId]);

  return { connected, subscribe };
}
