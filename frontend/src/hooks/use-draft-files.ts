"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  FileAssetKind,
  type FileAsset,
  FILE_LIMITS,
  getUploadByteLimit,
  isAllowedUploadMimeType,
} from "@swiss-mail/shared";
import { apiFetch } from "../lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseDraftFilesReturn {
  attachments: FileAsset[];
  signature: FileAsset | null;
  isUploading: boolean;
  /** 0–100 upload progress (simulated; actual progress not available via fetch) */
  uploadProgress: number;
  uploadFile: (file: File, kind: "attachment" | "signature") => Promise<FileAsset>;
  removeFile: (fileId: string) => Promise<void>;
  /** Client-side pre-check violation message, or null */
  validationError: string | null;
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateFile(
  file: File,
  kind: "attachment" | "signature",
  existingAttachments: FileAsset[],
  hasSignature: boolean,
  existingTotalBytes: number,
): string | null {
  if (!isAllowedUploadMimeType(kind, file.type)) {
    return kind === "attachment"
      ? "Unsupported file type. Allowed: PDF, PNG, JPEG."
      : "Unsupported signature format. Allowed: PNG, JPEG.";
  }

  if (file.size > getUploadByteLimit(kind)) {
    return kind === "attachment"
      ? "Attachment exceeds 5 MB limit."
      : "Signature image exceeds 2 MB limit.";
  }

  if (
    kind === "attachment" &&
    existingAttachments.length >= FILE_LIMITS.maxAttachmentsPerDraft
  ) {
    return `Maximum ${FILE_LIMITS.maxAttachmentsPerDraft} attachments per draft.`;
  }

  if (kind === "signature" && hasSignature) {
    return "Only one signature image is allowed per draft.";
  }

  if (existingTotalBytes + file.size > FILE_LIMITS.totalDraftUploadBytes) {
    return "Total upload would exceed 20 MB limit.";
  }

  return null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDraftFiles(draftId: string): UseDraftFilesReturn {
  const queryClient = useQueryClient();
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const filesQuery = useQuery({
    queryKey: queryKeys.draftFiles(draftId),
    queryFn: () =>
      apiFetch<{ files: FileAsset[] }>(`/v1/drafts/${draftId}/files`).then(
        (r) => r.files,
      ),
    staleTime: 30_000,
  });

  const files = filesQuery.data ?? [];
  const attachments = useMemo(
    () => files.filter((f) => f.kind === FileAssetKind.attachment),
    [files],
  );
  const signature = useMemo(
    () => files.find((f) => f.kind === FileAssetKind.signature) ?? null,
    [files],
  );

  const existingTotalBytes = useMemo(
    () => files.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0),
    [files],
  );

  const uploadMutation = useMutation({
    mutationFn: async ({
      file,
      kind,
    }: {
      file: File;
      kind: "attachment" | "signature";
    }): Promise<FileAsset> => {
      const formData = new FormData();
      formData.append("kind", kind);
      formData.append("file", file);

      // Simulate progress (actual streaming progress is not available via fetch)
      setUploadProgress(10);
      const result = await apiFetch<{ file: FileAsset }>(`/v1/drafts/${draftId}/files`, {
        method: "POST",
        body: formData,
      });
      setUploadProgress(100);
      return result.file;
    },
    onSuccess: () => {
      setUploadProgress(0);
      void queryClient.invalidateQueries({ queryKey: queryKeys.draftFiles(draftId) });
    },
    onError: () => {
      setUploadProgress(0);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (fileId: string) =>
      apiFetch<void>(`/v1/drafts/${draftId}/files/${fileId}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.draftFiles(draftId) });
    },
  });

  const uploadFile = useCallback(
    async (file: File, kind: "attachment" | "signature"): Promise<FileAsset> => {
      const error = validateFile(
        file,
        kind,
        attachments,
        Boolean(signature),
        existingTotalBytes,
      );
      if (error) {
        setValidationError(error);
        throw new Error(error);
      }
      setValidationError(null);
      return uploadMutation.mutateAsync({ file, kind });
    },
    [uploadMutation, attachments, signature, existingTotalBytes],
  );

  const removeFile = useCallback(
    async (fileId: string): Promise<void> => {
      await removeMutation.mutateAsync(fileId);
    },
    [removeMutation],
  );

  return {
    attachments,
    signature,
    isUploading: uploadMutation.isPending,
    uploadProgress,
    uploadFile,
    removeFile,
    validationError,
    isLoading: filesQuery.isLoading,
  };
}
