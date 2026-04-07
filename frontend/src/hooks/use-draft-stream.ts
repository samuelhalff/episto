"use client";

import { useEffect, useCallback, useMemo, useSyncExternalStore } from "react";
import type { DocumentModel } from "@swiss-mail/shared";
import { getApiUrl } from "../lib/api";
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
type ConnectionStatusListener = () => void;

// ---------------------------------------------------------------------------
// Hook: useDraftStream
// ---------------------------------------------------------------------------

const MAX_RECONNECT_FAILURES = 3;
const POLL_INTERVAL_MS = 5_000;
const RECONNECT_BASE_DELAY_MS = 1_000;
const noopUnsubscribe = () => {};

interface DraftStreamConnection {
  readonly connected: boolean;
  acquire: () => void;
  release: () => void;
  subscribe: (listener: EventListener) => () => void;
  subscribeStatus: (listener: ConnectionStatusListener) => () => void;
}

const draftStreamConnections = new Map<string, DraftStreamConnection>();

function getDraftStreamConnection(draftId: string): DraftStreamConnection {
  const existing = draftStreamConnections.get(draftId);
  if (existing) {
    return existing;
  }

  let connected = false;
  let subscriberCount = 0;
  let failCount = 0;
  let eventSource: EventSource | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  const listeners = new Set<EventListener>();
  const statusListeners = new Set<ConnectionStatusListener>();

  const notifyStatus = () => {
    for (const listener of Array.from(statusListeners)) {
      listener();
    }
  };

  const setConnected = (nextConnected: boolean) => {
    if (connected === nextConnected) {
      return;
    }
    connected = nextConnected;
    notifyStatus();
  };

  const dispatch = (event: DraftStreamEvent) => {
    for (const listener of Array.from(listeners)) {
      listener(event);
    }
  };

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const clearPollingTimer = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const closeEventSource = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };

  const handleParseError = (eventType: DraftStreamEvent["type"]) => {
    captureMessage(`SSE ${eventType} event parse error`, "warning", {
      component: "useDraftStream",
    });
  };

  const dispatchJsonEvent = (type: DraftStreamEvent["type"], rawEvent: Event) => {
    const messageEvent = rawEvent as MessageEvent<string>;
    try {
      switch (type) {
        case "connected":
          dispatch({
            type,
            data: JSON.parse(messageEvent.data) as { draftId: string },
          });
          break;
        case "ai_token":
          dispatch({
            type,
            data: JSON.parse(messageEvent.data) as AiTokenEvent,
          });
          break;
        case "ai_message_complete":
          dispatch({
            type,
            data: JSON.parse(messageEvent.data) as AiMessageCompleteEvent,
          });
          break;
        case "field_update":
          dispatch({
            type,
            data: JSON.parse(messageEvent.data) as FieldUpdateEvent,
          });
          break;
        case "draft_status":
          dispatch({
            type,
            data: JSON.parse(messageEvent.data) as DraftStatusEvent,
          });
          break;
        case "error":
          dispatch({
            type,
            data: JSON.parse(messageEvent.data) as StreamErrorEvent,
          });
          break;
      }
    } catch {
      handleParseError(type);
    }
  };

  const startPollingFallback = () => {
    if (disposed || subscriberCount === 0 || pollTimer) {
      return;
    }

    closeEventSource();
    setConnected(false);
    pollTimer = setInterval(() => {
      dispatch({
        type: "error",
        data: { code: "SSE_FALLBACK", message: "Polling mode" },
      });
    }, POLL_INTERVAL_MS);
  };

  const scheduleReconnect = () => {
    if (disposed || subscriberCount === 0) {
      return;
    }

    if (failCount >= MAX_RECONNECT_FAILURES) {
      startPollingFallback();
      return;
    }

    if (reconnectTimer) {
      return;
    }

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_BASE_DELAY_MS * failCount);
  };

  const connect = () => {
    if (disposed || subscriberCount === 0 || eventSource) {
      return;
    }

    clearPollingTimer();

    if (typeof EventSource === "undefined") {
      startPollingFallback();
      return;
    }

    const nextEventSource = new EventSource(getApiUrl(`/v1/drafts/${draftId}/stream`), {
      withCredentials: true,
    });
    eventSource = nextEventSource;

    nextEventSource.addEventListener("connected", (event) => {
      failCount = 0;
      clearPollingTimer();
      setConnected(true);
      dispatchJsonEvent("connected", event);
    });

    nextEventSource.addEventListener("ai_token", (event) => {
      dispatchJsonEvent("ai_token", event);
    });

    nextEventSource.addEventListener("ai_message_complete", (event) => {
      dispatchJsonEvent("ai_message_complete", event);
    });

    nextEventSource.addEventListener("field_update", (event) => {
      dispatchJsonEvent("field_update", event);
    });

    nextEventSource.addEventListener("draft_status", (event) => {
      dispatchJsonEvent("draft_status", event);
    });

    nextEventSource.addEventListener("error", (event) => {
      if (disposed) {
        return;
      }

      const messageEvent = event as MessageEvent<string>;
      if (messageEvent.data) {
        dispatchJsonEvent("error", event);
      }

      if (nextEventSource.readyState === EventSource.CLOSED) {
        failCount += 1;
        closeEventSource();
        setConnected(false);
        scheduleReconnect();
      }
    });
  };

  const connection: DraftStreamConnection = {
    get connected() {
      return connected;
    },
    acquire() {
      disposed = false;
      subscriberCount += 1;
      if (subscriberCount === 1) {
        connect();
      }
    },
    release() {
      subscriberCount = Math.max(0, subscriberCount - 1);
      if (subscriberCount > 0) {
        return;
      }

      disposed = true;
      clearReconnectTimer();
      clearPollingTimer();
      closeEventSource();
      setConnected(false);
      listeners.clear();
      statusListeners.clear();
      if (draftStreamConnections.get(draftId) === connection) {
        draftStreamConnections.delete(draftId);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    subscribeStatus(listener) {
      statusListeners.add(listener);
      return () => {
        statusListeners.delete(listener);
      };
    },
  };

  draftStreamConnections.set(draftId, connection);
  return connection;
}

/**
 * Single shared SSE connection per active draft per tab.
 * Per realtime-strategy.md, only one EventSource instance should exist
 * per draft. Multiple hooks consume events via listeners.
 */
export function useDraftStream(draftId: string | null) {
  const connection = useMemo(
    () => (draftId ? getDraftStreamConnection(draftId) : null),
    [draftId],
  );

  const subscribe = useCallback((listener: EventListener) => {
    if (!connection) {
      return noopUnsubscribe;
    }

    return connection.subscribe(listener);
  }, [connection]);

  const connected = useSyncExternalStore(
    useCallback((listener: ConnectionStatusListener) => {
      if (!connection) {
        return noopUnsubscribe;
      }

      return connection.subscribeStatus(listener);
    }, [connection]),
    useCallback(() => connection?.connected ?? false, [connection]),
    () => false,
  );

  useEffect(() => {
    if (!connection) {
      return;
    }

    connection.acquire();

    return () => {
      connection.release();
    };
  }, [connection]);

  return { connected, subscribe };
}
