"use client";

import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "../lib/api.js";
import type { FileAsset } from "@swiss-mail/shared";

function filesOptions(draftId: string) {
  return queryOptions({
    queryKey: ["drafts", draftId, "files"] as const,
    queryFn: () => apiFetch<FileAsset[]>(`/v1/drafts/${draftId}/files`),
  });
}

export function useFiles(draftId: string) {
  return useQuery(filesOptions(draftId));
}

export function useDeleteFile(draftId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) =>
      apiFetch<void>(`/v1/drafts/${draftId}/files/${fileId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: filesOptions(draftId).queryKey,
      });
    },
  });
}
