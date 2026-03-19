"use client";

import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import type { ConversationMessage } from "@swiss-mail/shared";
import type { SendMessageInputType } from "@swiss-mail/shared";
import { draftOptions } from "./use-draft.js";

function messagesOptions(draftId: string) {
  return queryOptions({
    queryKey: ["drafts", draftId, "messages"] as const,
    queryFn: () =>
      apiFetch<ConversationMessage[]>(`/v1/drafts/${draftId}/messages`),
  });
}

export function useMessages(draftId: string) {
  return useQuery(messagesOptions(draftId));
}

export function useSendMessage(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMessageInputType) =>
      apiFetch<ConversationMessage>(`/v1/drafts/${draftId}/messages`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: messagesOptions(draftId).queryKey,
      });
      void queryClient.invalidateQueries({
        queryKey: draftOptions(draftId).queryKey,
      });
    },
  });
}
