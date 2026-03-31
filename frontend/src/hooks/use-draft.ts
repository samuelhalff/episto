"use client";

import { useEffect } from "react";
import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { queryKeys, type DraftLetter } from "@swiss-mail/shared";
import type { UpdateDraftInputType } from "@swiss-mail/shared";
import { useDraftStream } from "./use-draft-stream";
import type { FieldUpdateEvent } from "./use-draft-stream";

function normalizeDraft(draft: DraftLetter): DraftLetter {
  return {
    ...draft,
    createdAt: draft.createdAt instanceof Date ? draft.createdAt : new Date(draft.createdAt),
    updatedAt: draft.updatedAt instanceof Date ? draft.updatedAt : new Date(draft.updatedAt),
  };
}

function mergeFieldUpdate(
  currentDraft: DraftLetter | undefined,
  event: FieldUpdateEvent,
): DraftLetter | undefined {
  if (!currentDraft) {
    return currentDraft;
  }

  const nextUpdatedAt = new Date(event.updatedAt);
  if (currentDraft.updatedAt.getTime() > nextUpdatedAt.getTime()) {
    return currentDraft;
  }

  return {
    ...currentDraft,
    [event.field]: event.value,
    updatedAt: nextUpdatedAt,
  } as DraftLetter;
}

function mergeMutationResult(
  currentDraft: DraftLetter | undefined,
  data: DraftLetter,
  variables: UpdateDraftInputType,
): DraftLetter {
  if (!currentDraft) {
    return data;
  }

  const nextDraft: DraftLetter = { ...currentDraft };
  for (const key of Object.keys(variables) as (keyof UpdateDraftInputType)[]) {
    const draftKey = key as keyof DraftLetter;
    (nextDraft as Record<string, unknown>)[draftKey] = data[draftKey];
  }

  return {
    ...nextDraft,
    updatedAt:
      data.updatedAt.getTime() >= currentDraft.updatedAt.getTime()
        ? data.updatedAt
        : currentDraft.updatedAt,
  };
}

export function draftOptions(draftId: string) {
  return queryOptions({
    queryKey: queryKeys.draft(draftId),
    queryFn: () =>
      apiFetch<{ draft: DraftLetter }>(`/v1/drafts/${draftId}`).then((r) => normalizeDraft(r.draft)),
    staleTime: 30_000,
  });
}

export function useDraft(draftId: string) {
  const queryClient = useQueryClient();
  const { subscribe } = useDraftStream(draftId);
  const query = useQuery(draftOptions(draftId));

  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "field_update") {
        queryClient.setQueryData<DraftLetter | undefined>(
          draftOptions(draftId).queryKey,
          (currentDraft) => mergeFieldUpdate(currentDraft, event.data),
        );
      }
    });
  }, [subscribe, queryClient, draftId]);

  return query;
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

export interface ComposeDraftResponse {
  status: "queued";
  streamUrl: string;
}

export function useCreateDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ draft: DraftLetter }>("/v1/drafts", {
        method: "POST",
        body: JSON.stringify({}),
      }).then((r) => normalizeDraft(r.draft)),
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
      }).then((r) => normalizeDraft(r.draft)),
    onSuccess: (data, variables) => {
      queryClient.setQueryData<DraftLetter | undefined>(
        draftOptions(draftId).queryKey,
        (currentDraft) => mergeMutationResult(currentDraft, data, variables),
      );
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
      }).then((r) => normalizeDraft(r.draft)),
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

export function useComposeDraftFromContext(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<ComposeDraftResponse>(`/v1/drafts/${draftId}/compose`, {
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.draftMessages(draftId) });
      void queryClient.invalidateQueries({ queryKey: draftOptions(draftId).queryKey });
    },
  });
}
