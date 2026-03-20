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
    queryFn: () =>
      apiFetch<{ draft: DraftLetter }>(`/v1/drafts/${draftId}`).then((r) => r.draft),
    staleTime: 30_000,
  });
}

export function useDraft(draftId: string) {
  return useQuery(draftOptions(draftId));
}

function draftsOptions() {
  return queryOptions({
    queryKey: ["drafts"] as const,
    queryFn: () =>
      apiFetch<{ drafts: DraftLetter[] }>("/v1/drafts").then((r) => r.drafts),
  });
}

export function useDrafts() {
  return useQuery(draftsOptions());
}

export interface ReviewDraftResponse {
  snapshot: {
    id: string;
    draftId: string;
    priceCents: number;
    createdAt: string;
  };
}

export function useCreateDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ draft: DraftLetter }>("/v1/drafts", { method: "POST" }).then((r) => r.draft),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
  });
}

export function useUpdateDraft(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDraftInputType) =>
      apiFetch<{ draft: DraftLetter }>(`/v1/drafts/${draftId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }).then((r) => r.draft),
    onSuccess: (data) => {
      queryClient.setQueryData(draftOptions(draftId).queryKey, data);
    },
  });
}

export function useTransitionDraft(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { status: string }) =>
      apiFetch<{ draft: DraftLetter }>(`/v1/drafts/${draftId}/transition`, {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.draft),
    onSuccess: (data) => {
      queryClient.setQueryData(draftOptions(draftId).queryKey, data);
    },
  });
}

export function useReviewDraft(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ReviewDraftResponse>(`/v1/drafts/${draftId}/review`, {
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: draftOptions(draftId).queryKey });
    },
  });
}
