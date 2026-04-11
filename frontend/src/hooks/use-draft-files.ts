"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  DraftFilesResponseSchema,
  FileAssetKind,
  type FileAsset,
  type DraftAttachmentConstraints,
  type DraftFilesResponse,
  FILE_LIMITS,
  getUploadByteLimit,
  isAllowedUploadMimeType,
} from "@swiss-mail/shared";
import { ApiError, apiFetch } from "../lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseDraftFilesReturn {
  attachments: FileAsset[];
  signature: FileAsset | null;
  attachmentConstraints: DraftAttachmentConstraints;
  isUploading: boolean;
  isRemoving: boolean;
  removingFileId: string | null;
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

const DEFAULT_ATTACHMENT_CONSTRAINTS: DraftAttachmentConstraints = {
  maxAttachmentsPerDraft: FILE_LIMITS.maxAttachmentsPerDraft,
  maxFileBytes: getUploadByteLimit("attachment"),
  maxTotalBytes: FILE_LIMITS.totalDraftUploadBytes,
  allowedMimeTypes: [...FILE_LIMITS.attachment.allowedMimeTypes],
};
const EMPTY_FILES: FileAsset[] = [];

function formatAllowedAttachmentFormats(allowedMimeTypes: readonly string[]): string {
  return allowedMimeTypes
    .map((mimeType) => {
      switch (mimeType) {
        case "application/pdf":
          return "PDF";
        case "image/png":
          return "PNG";
        case "image/jpeg":
          return "JPG";
        default:
          return mimeType.toUpperCase();
      }
    })
    .join(", ");
}

function validateFile(
  file: File,
  kind: "attachment" | "signature",
  existingAttachments: FileAsset[],
  existingTotalBytes: number,
  attachmentConstraints: DraftAttachmentConstraints,
): string | null {
  if (
    kind === "attachment" &&
    !attachmentConstraints.allowedMimeTypes.includes(file.type)
  ) {
    return `Unsupported file type. Allowed: ${formatAllowedAttachmentFormats(attachmentConstraints.allowedMimeTypes)}.`;
  }

  if (kind === "signature" && !isAllowedUploadMimeType(kind, file.type)) {
    return "Unsupported signature format. Allowed: PNG, JPEG.";
  }

  if (kind === "attachment" && file.size > attachmentConstraints.maxFileBytes) {
    return `Attachment exceeds ${Math.round(attachmentConstraints.maxFileBytes / 1024 / 1024)} MB limit.`;
  }

  if (kind === "signature" && file.size > getUploadByteLimit(kind)) {
    return "Signature image exceeds 2 MB limit.";
  }

  if (
    kind === "attachment" &&
    existingAttachments.length >= attachmentConstraints.maxAttachmentsPerDraft
  ) {
    return `Maximum ${attachmentConstraints.maxAttachmentsPerDraft} attachments per draft.`;
  }

  // Signature uniqueness is handled server-side via atomic replacement

  if (existingTotalBytes + file.size > attachmentConstraints.maxTotalBytes) {
    return `Total upload would exceed ${Math.round(attachmentConstraints.maxTotalBytes / 1024 / 1024)} MB limit.`;
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
  const [removingFileId, setRemovingFileId] = useState<string | null>(null);

  const filesQuery = useQuery({
    queryKey: queryKeys.draftFiles(draftId),
    queryFn: async () =>
      DraftFilesResponseSchema.parse(
        await apiFetch<DraftFilesResponse>(`/v1/drafts/${draftId}/files`),
      ),
    staleTime: 30_000,
  });

  const files = filesQuery.data?.files ?? EMPTY_FILES;
  const attachmentConstraints =
    filesQuery.data?.attachmentConstraints ?? DEFAULT_ATTACHMENT_CONSTRAINTS;
  const attachments = useMemo(
    () => files.filter((f) => f.kind === FileAssetKind.attachment),
    [files],
  );
  const signature = useMemo(
    () => files.find((f) => f.kind === FileAssetKind.signature) ?? null,
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
    onSuccess: (_data, variables) => {
      setUploadProgress(0);
      setValidationError(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.draftFiles(draftId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.draftPreview(draftId) });
      // Signature uploads also set signatureMode server-side; refresh draft
      // but use exact match to avoid cascading to quote/messages sub-queries
      if (variables.kind === "signature") {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.draft(draftId),
          exact: true,
        });
      }
    },
    onError: (error) => {
      setUploadProgress(0);
      const message =
        error instanceof ApiError
          ? (error.getUserMessage() ?? error.message)
          : error instanceof Error
            ? error.message
            : "Upload failed.";
      setValidationError(message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (fileId: string) =>
      apiFetch<void>(`/v1/drafts/${draftId}/files/${fileId}`, { method: "DELETE" }),
    onMutate: async (fileId) => {
      setRemovingFileId(fileId);

      // Optimistically remove the file from cache so subsequent uploadFile
      // calls see the updated state immediately (no stale-closure race).
      await queryClient.cancelQueries({ queryKey: queryKeys.draftFiles(draftId) });
      const previous = queryClient.getQueryData<DraftFilesResponse>(
        queryKeys.draftFiles(draftId),
      );
      if (previous) {
        queryClient.setQueryData<DraftFilesResponse>(queryKeys.draftFiles(draftId), {
          ...previous,
          files: previous.files.filter((f) => f.id !== fileId),
        });
      }
      return { previous };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.draftFiles(draftId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.draftPreview(draftId) });
    },
    onError: (_err, _fileId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.draftFiles(draftId), context.previous);
      }
    },
    onSettled: () => {
      setRemovingFileId(null);
    },
  });

  const uploadFile = useCallback(
    async (file: File, kind: "attachment" | "signature"): Promise<FileAsset> => {
      const cached = queryClient.getQueryData<DraftFilesResponse>(
        queryKeys.draftFiles(draftId),
      );
      const currentFiles = cached?.files ?? [];
      const currentAttachments = currentFiles.filter(
        (f) => f.kind === FileAssetKind.attachment,
      );
      const currentTotalBytes = currentFiles.reduce(
        (sum, f) => sum + (f.sizeBytes ?? 0),
        0,
      );
      const currentConstraints =
        cached?.attachmentConstraints ?? DEFAULT_ATTACHMENT_CONSTRAINTS;

      const error = validateFile(
        file,
        kind,
        currentAttachments,
        currentTotalBytes,
        currentConstraints,
      );
      if (error) {
        setValidationError(error);
        throw new Error(error);
      }
      setValidationError(null);
      return uploadMutation.mutateAsync({ file, kind });
    },
    [uploadMutation, queryClient, draftId],
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
    attachmentConstraints,
    isUploading: uploadMutation.isPending,
    isRemoving: removeMutation.isPending,
    removingFileId,
    uploadProgress,
    uploadFile,
    removeFile,
    validationError,
    isLoading: filesQuery.isLoading,
  };
}
