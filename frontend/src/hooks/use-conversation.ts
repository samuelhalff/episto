"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import type { ConversationMessage } from "@swiss-mail/shared";
import { queryKeys } from "@swiss-mail/shared";
import { useDraftStream } from "./use-draft-stream.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseConversationReturn {
  messages: ConversationMessage[];
  isStreaming: boolean;
  /** Partial AI text accumulated during an active SSE stream */
  streamingText: string;
  sendMessage: (content: string) => Promise<void>;
  retryLast: () => Promise<void>;
  /** 10 regenerations max per draft; counted by assistant messages */
  regenerationsRemaining: number;
  isSending: boolean;
  error: Error | null;
}

const MAX_REGENERATIONS = 10;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useConversation(draftId: string): UseConversationReturn {
  const queryClient = useQueryClient();
  const { subscribe } = useDraftStream(draftId);

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
      ).then((r) => r.data),
    staleTime: 10_000,
  });

  // Subscribe to SSE events for real-time streaming
  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "ai_token") {
        setIsStreaming(true);
        streamingMessageIdRef.current = event.data.messageId;
        setStreamingText((prev) => prev + event.data.token);
      } else if (event.type === "ai_message_complete") {
        setIsStreaming(false);
        setStreamingText("");
        streamingMessageIdRef.current = null;
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
        setIsStreaming(false);
      }
    });
  }, [subscribe, queryClient, draftId]);

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
      setStreamingText("");
      await sendMutation.mutateAsync(content);
    },
    [sendMutation],
  );

  const retryLast = useCallback(async () => {
    const messages = messagesQuery.data ?? [];
    // Find the last user message to re-send
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setStreamingText("");
    await sendMutation.mutateAsync(lastUser.content);
  }, [messagesQuery.data, sendMutation]);

  const messages = messagesQuery.data ?? [];
  const assistantCount = messages.filter((m) => m.role === "assistant").length;
  const regenerationsRemaining = Math.max(0, MAX_REGENERATIONS - assistantCount);

  return {
    messages,
    isStreaming,
    streamingText,
    sendMessage,
    retryLast,
    regenerationsRemaining,
    isSending: sendMutation.isPending,
    error: sendMutation.error ?? messagesQuery.error ?? null,
  };
}
