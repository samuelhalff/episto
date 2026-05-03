"use client";

import {
  startTransition,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { ConversationMessage } from "@episto/shared";
import { queryKeys } from "@episto/shared";
import { useDraftStream } from "./use-draft-stream";
import { clearPendingDraftTurn, readPendingDraftTurn } from "../lib/pending-draft-turn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseConversationReturn {
  messages: ConversationMessage[];
  isStreaming: boolean;
  /** Partial AI text accumulated during an active SSE stream */
  streamingText: string;
  isAwaitingResponse: boolean;
  sendMessage: (content: string) => Promise<void>;
  retryLast: (failedAssistantMessageId?: string) => Promise<void>;
  /** 10 regenerations max per draft; counted by assistant messages */
  regenerationsRemaining: number;
  isSending: boolean;
  error: Error | null;
  completionCount: number;
  pendingAssistantPlaceholder: boolean;
}

const MAX_REGENERATIONS = 10;

function stripCodeFences(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

function normalizeAssistantContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("```")) {
    return content;
  }

  try {
    const parsed = JSON.parse(stripCodeFences(trimmed)) as {
      mode?: unknown;
      plainText?: { text?: unknown } | undefined;
    };

    if (parsed.mode === "plain_text" && typeof parsed.plainText?.text === "string") {
      return parsed.plainText.text;
    }
  } catch {
    return content;
  }

  return content;
}

function normalizeMessage(message: ConversationMessage): ConversationMessage {
  return {
    ...message,
    content:
      message.role === "assistant"
        ? normalizeAssistantContent(message.content)
        : message.content,
    createdAt:
      message.createdAt instanceof Date ? message.createdAt : new Date(message.createdAt),
  };
}

function hasAssistantReplyAfterMessage(
  messages: ConversationMessage[],
  userMessageId: string,
) {
  const pendingUserIndex = messages.findIndex((message) => message.id === userMessageId);
  if (pendingUserIndex < 0) {
    return false;
  }

  return messages
    .slice(pendingUserIndex + 1)
    .some((message) => message.role === "assistant");
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConversation(draftId: string): UseConversationReturn {
  const queryClient = useQueryClient();
  const { subscribe } = useDraftStream(draftId);
  const [optimisticMessages, setOptimisticMessages] = useState<ConversationMessage[]>([]);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState(false);
  const [completionCount, setCompletionCount] = useState(0);
  const assistantCountAtRequestRef = useRef(0);
  const pendingAssistantMessageIdRef = useRef<string | null>(null);
  const [pendingAssistantPlaceholder, setPendingAssistantPlaceholder] = useState(false);

  // Accumulated streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  // Track current streaming message ID to associate tokens correctly
  const streamingMessageIdRef = useRef<string | null>(null);

  // Message list from server
  const messagesQuery = useQuery({
    queryKey: queryKeys.draftMessages(draftId),
    queryFn: () =>
      apiFetch<{ data: ConversationMessage[]; cursor: string | null; hasMore: boolean }>(
        `/v1/drafts/${draftId}/messages`,
      ).then((r) => r.data.map(normalizeMessage)),
    staleTime: 10_000,
  });

  const clearPendingAssistantState = useCallback(() => {
    pendingAssistantMessageIdRef.current = null;
    setPendingAssistantPlaceholder(false);
    clearPendingDraftTurn(draftId);
  }, [draftId]);

  useEffect(() => {
    const pendingTurn = readPendingDraftTurn(draftId);
    if (!pendingTurn) {
      return;
    }

    pendingAssistantMessageIdRef.current = pendingTurn.messageId;
    startTransition(() => {
      setPendingAssistantPlaceholder(true);
      setIsAwaitingResponse(true);
      setIsStreaming(false);
      setStreamingText("");
    });
  }, [draftId]);

  // Subscribe to SSE events for real-time streaming
  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "ai_token") {
        clearPendingAssistantState();
        setIsAwaitingResponse(true);
        setIsStreaming(true);
        streamingMessageIdRef.current = event.data.messageId;
        setStreamingText((prev) => prev + event.data.token);
      } else if (event.type === "ai_message_complete") {
        clearPendingAssistantState();
        setIsAwaitingResponse(false);
        setIsStreaming(false);
        setStreamingText("");
        streamingMessageIdRef.current = null;
        setCompletionCount((current) => current + 1);
        void queryClient.invalidateQueries({
          queryKey: queryKeys.draftMessages(draftId),
        });
        void queryClient.invalidateQueries({
          queryKey: ["drafts", draftId],
        });
      } else if (event.type === "field_update") {
        void queryClient.invalidateQueries({
          queryKey: ["drafts", draftId],
        });
      } else if (event.type === "error") {
        clearPendingAssistantState();
        setIsStreaming(false);
        void queryClient.invalidateQueries({
          queryKey: queryKeys.draftMessages(draftId),
        });
        void queryClient.invalidateQueries({
          queryKey: ["drafts", draftId],
        });

        if (event.data.code !== "SSE_FALLBACK") {
          setIsAwaitingResponse(false);
          setCompletionCount((current) => current + 1);
        }
      }
    });
  }, [subscribe, queryClient, draftId, clearPendingAssistantState]);

  useEffect(() => {
    const persistedIds = new Set((messagesQuery.data ?? []).map((message) => message.id));
    if (persistedIds.size === 0) return;

    startTransition(() => {
      setOptimisticMessages((current) =>
        current.filter((message) => !persistedIds.has(message.id)),
      );
    });
  }, [messagesQuery.data]);

  useEffect(() => {
    if (
      pendingAssistantMessageIdRef.current &&
      hasAssistantReplyAfterMessage(
        messagesQuery.data ?? [],
        pendingAssistantMessageIdRef.current,
      )
    ) {
      startTransition(() => {
        clearPendingAssistantState();
      });
    }
  }, [messagesQuery.data, clearPendingAssistantState]);

  useEffect(() => {
    if (!isAwaitingResponse) return;

    const assistantCount = (messagesQuery.data ?? []).filter(
      (message) => message.role === "assistant",
    ).length;
    if (assistantCount > assistantCountAtRequestRef.current) {
      startTransition(() => {
        setIsAwaitingResponse(false);
        setIsStreaming(false);
        setStreamingText("");
      });
    }
  }, [isAwaitingResponse, messagesQuery.data]);

  useEffect(() => {
    if (!isAwaitingResponse) return;

    const intervalId = window.setInterval(() => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.draftMessages(draftId),
      });
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [draftId, isAwaitingResponse, queryClient]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      apiFetch<{ message: ConversationMessage }>(`/v1/drafts/${draftId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      // Optimistically reflect the sent user message
      void queryClient.invalidateQueries({
        queryKey: queryKeys.draftMessages(draftId),
      });
    },
  });

  const sendMessage = useCallback(
    async (content: string) => {
      const optimisticId = crypto.randomUUID();
      const optimisticMessage: ConversationMessage = {
        id: optimisticId,
        draftId,
        role: "user",
        content,
        toolCalls: null,
        createdAt: new Date(),
      };

      setOptimisticMessages((current) => [...current, optimisticMessage]);
      assistantCountAtRequestRef.current = (messagesQuery.data ?? []).filter(
        (message) => message.role === "assistant",
      ).length;
      setIsAwaitingResponse(true);
      setStreamingText("");
      try {
        const response = await sendMutation.mutateAsync(content);
        const persistedMessage = normalizeMessage(response.message);
        setOptimisticMessages((current) =>
          current.map((message) =>
            message.id === optimisticId ? persistedMessage : message,
          ),
        );
      } catch (error) {
        setIsAwaitingResponse(false);
        setOptimisticMessages((current) =>
          current.filter((message) => message.id !== optimisticId),
        );
        throw error;
      }
    },
    [draftId, messagesQuery.data, sendMutation],
  );

  const messages = useMemo(() => {
    const merged = new Map<string, ConversationMessage>();

    for (const message of messagesQuery.data ?? []) {
      merged.set(message.id, message);
    }

    for (const message of optimisticMessages) {
      merged.set(message.id, message);
    }

    return [...merged.values()].sort(
      (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
    );
  }, [messagesQuery.data, optimisticMessages]);

  const retryLast = useCallback(
    async (failedAssistantMessageId?: string) => {
      let retryTarget: ConversationMessage | undefined;

      if (failedAssistantMessageId) {
        const failedIndex = messages.findIndex(
          (message) => message.id === failedAssistantMessageId,
        );
        if (failedIndex > 0) {
          for (let index = failedIndex - 1; index >= 0; index -= 1) {
            const candidate = messages[index];
            if (candidate?.role === "user") {
              retryTarget = candidate;
              break;
            }
          }
        }
      }

      if (!retryTarget) {
        retryTarget = [...messages].reverse().find((message) => message.role === "user");
      }

      if (!retryTarget) return;

      assistantCountAtRequestRef.current = messages.filter(
        (message) => message.role === "assistant",
      ).length;
      setIsAwaitingResponse(true);
      setStreamingText("");
      try {
        await sendMutation.mutateAsync(retryTarget.content);
      } catch (error) {
        setIsAwaitingResponse(false);
        throw error;
      }
    },
    [messages, sendMutation],
  );
  const regenerationsRemaining = useMemo(
    () =>
      Math.max(
        0,
        MAX_REGENERATIONS - messages.filter((m) => m.role === "assistant").length,
      ),
    [messages],
  );

  return {
    messages,
    isStreaming,
    streamingText,
    isAwaitingResponse,
    sendMessage,
    retryLast,
    regenerationsRemaining,
    isSending: sendMutation.isPending,
    error: sendMutation.error ?? messagesQuery.error ?? null,
    completionCount,
    pendingAssistantPlaceholder,
  };
}
