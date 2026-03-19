"use client";

import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@swiss-mail/shared";
import { apiFetch } from "../lib/api.js";
import type { FileAsset } from "@swiss-mail/shared";
import { FileAssetKind } from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// File limits — canonical values from docs/04-product/file-handling.md
// ---------------------------------------------------------------------------

const MAX_ATTACHMENT_FILE_BYTES = 5 * 1024 * 1024;    // 5 MB
const MAX_SIGNATURE_FILE_BYTES = 2 * 1024 * 1024;     // 2 MB
const MAX_TOTAL_UPLOAD_BYTES = 20 * 1024 * 1024;      // 20 MB
const MAX_ATTACHMENTS_PER_DRAFT = 5;

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

const ALLOWED_SIGNATURE_TYPES = new Set([
  "image/png",
  "image/jpeg",
]);

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
  existingTotalBytes: number,
): string | null {
  if (kind === "attachment") {
    if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
      return `Unsupported file type. Allowed: PDF, PNG, JPEG.`;
    }
    if (file.size > MAX_ATTACHMENT_FILE_BYTES) {
      return `Attachment exceeds 5 MB limit.`;
    }
    if (existingAttachments.length >= MAX_ATTACHMENTS_PER_DRAFT) {
      return `Maximum ${MAX_ATTACHMENTS_PER_DRAFT} attachments per draft.`;
    }
    if (existingTotalBytes + file.size > MAX_TOTAL_UPLOAD_BYTES) {
      return `Total upload would exceed 20 MB limit.`;
    }
  } else {
    if (!ALLOWED_SIGNATURE_TYPES.has(file.type)) {
      return `Unsupported signature format. Allowed: PNG, JPEG.`;
    }
    if (file.size > MAX_SIGNATURE_FILE_BYTES) {
      return `Signature image exceeds 2 MB limit.`;
    }
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
      apiFetch<FileAsset[]>(`/v1/drafts/${draftId}/files`),
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
      formData.append("file", file);
      formData.append("kind", kind);

      // Simulate progress (actual streaming progress is not available via fetch)
      setUploadProgress(10);
      const result = await apiFetch<FileAsset>(`/v1/drafts/${draftId}/files`, {
        method: "POST",
        body: formData,
        // Do not set Content-Type — browser sets it with boundary for multipart
      });
      setUploadProgress(100);
      return result;
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
      const error = validateFile(file, kind, attachments, existingTotalBytes);
      if (error) {
        setValidationError(error);
        throw new Error(error);
      }
      setValidationError(null);
      return uploadMutation.mutateAsync({ file, kind });
    },
    [uploadMutation, attachments, existingTotalBytes],
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
