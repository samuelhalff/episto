"use client";

import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import type { DraftSnapshot } from "@swiss-mail/shared";
import { draftOptions } from "./use-draft.js";

export function useReviewDraft(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ snapshot: DraftSnapshot }>(`/v1/drafts/${draftId}/review`, {
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: draftOptions(draftId).queryKey,
      });
    },
  });
}

interface LetterPreview {
  draftId: string;
  snapshotId: string | null;
  locale: string;
  deliveryType: string;
  subject: string | null;
  body: string | null;
  enclosureNote: string | null;
  signatureMode: string | null;
  sender: Record<string, unknown> | null;
  recipient: Record<string, unknown> | null;
  attachmentFileIds: string[];
  signatureFileId: string | null;
  estimatedPages: number | null;
}

function previewOptions(draftId: string) {
  return queryOptions({
    queryKey: ["drafts", draftId, "preview"] as const,
    queryFn: () =>
      apiFetch<{ preview: LetterPreview }>(`/v1/drafts/${draftId}/preview`),
    staleTime: 30_000,
  });
}

export function useLetterPreview(draftId: string) {
  return useQuery(previewOptions(draftId));
}
