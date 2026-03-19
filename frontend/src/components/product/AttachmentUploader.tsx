"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Paperclip, Trash2, FileText, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useFiles, useDeleteFile } from "../../hooks/use-api.js";
import { apiFetch } from "../../lib/api.js";
import type { FileAsset } from "@swiss-mail/shared";
import { FileAssetKind } from "@swiss-mail/shared";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 5;
const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentUploader({
  draftId,
  disabled,
}: {
  draftId: string;
  disabled?: boolean;
}) {
  const t = useTranslations("attachments");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const files = useFiles(draftId);
  const deleteFile = useDeleteFile(draftId);

  const attachments = (files.data ?? []).filter(
    (f) => f.kind === FileAssetKind.attachment,
  );

  const upload = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiFetch<FileAsset>(`/v1/drafts/${draftId}/files`, {
        method: "POST",
        body: formData,
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["drafts", draftId, "files"],
      });
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = "";

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t("invalidType"));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(t("tooLarge"));
      return;
    }

    if (attachments.length >= MAX_ATTACHMENTS) {
      setError(t("maxReached"));
      return;
    }

    upload.mutate(file);
  }

  const isMaxReached = attachments.length >= MAX_ATTACHMENTS;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">{t("title")}</h3>

      {attachments.length === 0 ? (
        <p className="text-sm text-gray-400">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-gray-700">
                <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate">{file.originalFilename}</span>
                <span className="shrink-0 text-xs text-gray-400">
                  {formatFileSize(file.sizeBytes)}
                </span>
              </span>
              <button
                type="button"
                disabled={disabled || deleteFile.isPending}
                onClick={() => deleteFile.mutate(file.id)}
                className="ml-2 text-gray-400 transition hover:text-red-500 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">{t("remove")}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || isMaxReached || upload.isPending}
        />
        <button
          type="button"
          disabled={disabled || isMaxReached || upload.isPending}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-600 transition hover:border-gray-400 hover:text-gray-700 disabled:opacity-40"
        >
          {upload.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Paperclip className="h-4 w-4" />
          )}
          {upload.isPending ? t("uploading") : t("uploadLabel")}
        </button>
        <p className="mt-1 text-xs text-gray-400">
          {isMaxReached ? t("maxReached") : t("uploadHint")}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
