"use client";

import { useRef, useState, useCallback } from "react";
import { Paperclip, X, FileText, Image, Loader2, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FileAsset } from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AttachmentUploaderProps {
  attachments: FileAsset[];
  isUploading: boolean;
  uploadProgress: number;
  validationError: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: (fileId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants — must match docs/04-product/file-handling.md
// ---------------------------------------------------------------------------

const MAX_ATTACHMENTS = 5;
const MAX_TOTAL_MB = 20;
const MAX_FILE_MB = 5;
const ALLOWED_EXTENSIONS = "PDF, PNG, JPG";
const ALLOWED_MIME = new Set(["application/pdf", "image/png", "image/jpeg"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  return FileText;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AttachmentUploader({
  attachments,
  isUploading,
  uploadProgress,
  validationError,
  onUpload,
  onRemove,
}: AttachmentUploaderProps) {
  const t = useTranslations("files");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const totalBytes = attachments.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0);
  const totalMB = totalBytes / (1024 * 1024);
  const atLimit = attachments.length >= MAX_ATTACHMENTS;
  const atTotalLimit = totalMB >= MAX_TOTAL_MB;
  const dropDisabled = atLimit || atTotalLimit || isUploading;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0]!;

      if (!ALLOWED_MIME.has(file.type)) {
        showToast(t("toast.unsupportedType", { formats: ALLOWED_EXTENSIONS }));
        return;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        showToast(t("toast.fileTooLarge", { mb: MAX_FILE_MB }));
        return;
      }

      await onUpload(file);
    },
    [onUpload, t],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (dropDisabled) return;
      void handleFiles(e.dataTransfer.files);
    },
    [dropDisabled, handleFiles],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragOver(false), []);

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {!atLimit && !atTotalLimit ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={t("dropZone.ariaLabel")}
          aria-disabled={dropDisabled}
          className={[
            "rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30 hover:bg-muted/50 hover:border-primary",
            dropDisabled ? "pointer-events-none opacity-50" : "",
          ].join(" ")}
          onClick={() => !dropDisabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!dropDisabled) inputRef.current?.click();
            }
          }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <Paperclip className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {t("dropZone.prompt")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            {ALLOWED_EXTENSIONS} · {t("dropZone.maxSize", { mb: MAX_FILE_MB })}
          </p>
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {atLimit
            ? t("limit.maxFiles", { max: MAX_ATTACHMENTS })
            : t("limit.totalSize", { mb: MAX_TOTAL_MB })}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {/* Usage summary */}
      {attachments.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("summary", {
            count: attachments.length,
            max: MAX_ATTACHMENTS,
            used: totalMB.toFixed(1),
            limit: MAX_TOTAL_MB,
          })}
        </p>
      )}

      {/* Validation error */}
      {(validationError) && (
        <p className="text-xs text-destructive">{validationError}</p>
      )}

      {/* File list */}
      {attachments.length > 0 && (
        <ul className="space-y-2">
          {attachments.map((file) => {
            const Icon = getFileIcon(file.mimeType ?? "");
            return (
              <li
                key={file.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm">{file.originalFilename}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBytes(file.sizeBytes ?? 0)}
                </span>
                <button
                  type="button"
                  aria-label={t("remove.ariaLabel", { name: file.originalFilename })}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => void onRemove(file.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Active upload progress */}
      {isUploading && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
          {uploadProgress >= 100 && (
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          )}
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
