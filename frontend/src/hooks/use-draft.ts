"use client";

import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import type { DraftLetter } from "@swiss-mail/shared";
import type { UpdateDraftInputType } from "@swiss-mail/shared";

export function draftOptions(draftId: string) {
  return queryOptions({
    queryKey: ["drafts", draftId] as const,
    queryFn: () => apiFetch<DraftLetter>(`/v1/drafts/${draftId}`),
    staleTime: 30_000,
  });
}

export function useDraft(draftId: string) {
  return useQuery(draftOptions(draftId));
}

function draftsOptions() {
  return queryOptions({
    queryKey: ["drafts"] as const,
    queryFn: () => apiFetch<DraftLetter[]>("/v1/drafts"),
  });
}

export function useDrafts() {
  return useQuery(draftsOptions());
}

export function useCreateDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<DraftLetter>("/v1/drafts", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
  });
}

export function useUpdateDraft(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDraftInputType) =>
      apiFetch<DraftLetter>(`/v1/drafts/${draftId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(draftOptions(draftId).queryKey, data);
    },
  });
}

export function useTransitionDraft(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { status: string }) =>
      apiFetch<DraftLetter>(`/v1/drafts/${draftId}/transition`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(draftOptions(draftId).queryKey, data);
    },
  });
}
