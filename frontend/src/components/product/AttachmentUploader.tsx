"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Paperclip, Trash2, FileText, Image, Loader2, CheckCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { FileAsset } from "@swiss-mail/shared";
import { toast } from "sonner";

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
  isCompactViewport?: boolean | undefined;
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

function getFilenameLabel(file: FileAsset): string {
  return file.originalFilename?.trim() || "Unnamed file";
}

function splitFilename(filename: string): { stem: string; extension: string } {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === trimmed.length - 1) {
    return { stem: trimmed, extension: "" };
  }

  return {
    stem: trimmed.slice(0, lastDot),
    extension: trimmed.slice(lastDot),
  };
}

function getDuplicateSignature(name: string, sizeBytes: number): string {
  return `${name.trim().toLowerCase()}::${sizeBytes}`;
}

async function hashFile(file: File): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) {
    return getDuplicateSignature(file.name, file.size);
  }

  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
  isCompactViewport = false,
}: AttachmentUploaderProps) {
  const t = useTranslations("files");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const uploadedHashMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (expandedFileId && !attachments.some((file) => file.id === expandedFileId)) {
      setExpandedFileId(null);
    }
  }, [attachments, expandedFileId]);

  useEffect(() => {
    const activeSignatures = new Set(
      attachments.map((file) => getDuplicateSignature(getFilenameLabel(file), file.sizeBytes ?? 0)),
    );

    for (const [hash, signature] of uploadedHashMapRef.current.entries()) {
      if (!activeSignatures.has(signature)) {
        uploadedHashMapRef.current.delete(hash);
      }
    }
  }, [attachments]);

  useEffect(() => {
    if (!validationError) {
      return;
    }

    toast.warning(validationError, {
      id: "attachment-upload-warning",
      duration: 4500,
    });
  }, [validationError]);

  const totalBytes = attachments.reduce((sum, f) => sum + (f.sizeBytes ?? 0), 0);
  const totalMB = totalBytes / (1024 * 1024);
  const atLimit = attachments.length >= MAX_ATTACHMENTS;
  const atTotalLimit = totalMB >= MAX_TOTAL_MB;
  const dropDisabled = atLimit || atTotalLimit || isUploading;
  const useCompactUploadControl = isCompactViewport && attachments.length > 0 && !atLimit && !atTotalLimit;
  const clampedUploadProgress = Math.max(0, Math.min(uploadProgress, 100));
  const listSpacingClass = isCompactViewport ? "space-y-1.5" : "space-y-2.5";
  const summaryClass = isCompactViewport
    ? "flex items-center justify-between gap-2 rounded-2xl bg-zinc-50 px-3 py-2 dark:bg-zinc-900/80"
    : "flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 px-3.5 py-2.5 dark:bg-zinc-900/80";
  const addMoreButtonClass = isCompactViewport
    ? "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
    : "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-600 dark:hover:bg-zinc-900";
  const listItemClass = isCompactViewport
    ? "flex overflow-hidden gap-2 rounded-2xl border border-zinc-200 bg-white px-2.5 py-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    : "flex overflow-hidden gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950";
  const iconClass = isCompactViewport
    ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400"
    : "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400";
  const filenameButtonClass = isCompactViewport
    ? "min-w-0 flex flex-1 overflow-hidden rounded-lg px-0.5 py-0.5 text-left transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-zinc-900"
    : "min-w-0 flex flex-1 overflow-hidden rounded-xl px-1 py-0.5 text-left transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-zinc-900";
  const collapsedFilenameClass = isCompactViewport
    ? "flex w-full items-center gap-1 text-xs font-medium text-zinc-900 dark:text-zinc-100"
    : "flex w-full items-center gap-1 text-sm font-medium text-zinc-900 dark:text-zinc-100";
  const expandedFilenameClass = isCompactViewport
    ? "min-w-0 w-full break-all text-xs font-medium leading-5 text-zinc-900 dark:text-zinc-100"
    : "min-w-0 w-full break-all text-sm font-medium text-zinc-900 dark:text-zinc-100";
  const metaGroupClass = isCompactViewport
    ? "flex shrink-0 items-center gap-1"
    : "flex shrink-0 items-center gap-1.5";
  const removeButtonClass = isCompactViewport
    ? "flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-full p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-zinc-500 dark:hover:bg-zinc-900"
    : "flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-zinc-500 dark:hover:bg-zinc-900";

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      let nextCount = attachments.length;
      let nextBytes = totalBytes;
      let firstError: string | null = null;
      let duplicateCount = 0;
      const knownDuplicateSignatures = new Set(
        attachments.map((file) => getDuplicateSignature(getFilenameLabel(file), file.sizeBytes ?? 0)),
      );
      const batchHashes = new Set<string>();

      for (const file of Array.from(files)) {
        if (nextCount >= MAX_ATTACHMENTS) {
          firstError ??= t("limit.maxFiles", { max: MAX_ATTACHMENTS });
          break;
        }

        if (!ALLOWED_MIME.has(file.type)) {
          firstError ??= t("toast.unsupportedType", { formats: ALLOWED_EXTENSIONS });
          continue;
        }
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
          firstError ??= t("toast.fileTooLarge", { mb: MAX_FILE_MB });
          continue;
        }
        if (nextBytes + file.size > MAX_TOTAL_MB * 1024 * 1024) {
          firstError ??= t("limit.totalSize", { mb: MAX_TOTAL_MB });
          continue;
        }

        const fileHash = await hashFile(file);
        const duplicateSignature = getDuplicateSignature(file.name, file.size);
        if (
          knownDuplicateSignatures.has(duplicateSignature) ||
          uploadedHashMapRef.current.has(fileHash) ||
          batchHashes.has(fileHash)
        ) {
          duplicateCount += 1;
          continue;
        }

        try {
          await onUpload(file);
          batchHashes.add(fileHash);
          uploadedHashMapRef.current.set(fileHash, duplicateSignature);
          knownDuplicateSignatures.add(duplicateSignature);
          nextCount += 1;
          nextBytes += file.size;
        } catch (error) {
          firstError ??= error instanceof Error ? error.message : t("toast.uploadFailed");
        }
      }

      const feedbackMessages = [
        duplicateCount > 0 ? t("toast.duplicateSkipped", { count: duplicateCount }) : null,
        firstError,
      ].filter((message): message is string => Boolean(message));

      if (feedbackMessages.length > 0) {
        toast.warning(feedbackMessages[0], {
          id: "attachment-upload-warning",
          duration: 4500,
          description: feedbackMessages.slice(1).join(" • ") || undefined,
        });
      }
    },
    [attachments, onUpload, t, totalBytes],
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
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        multiple
        className="sr-only"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Usage summary */}
      {attachments.length > 0 && (
        <div className={summaryClass}>
          <p className={isCompactViewport ? "min-w-0 text-[11px] text-zinc-500 dark:text-zinc-400" : "min-w-0 text-xs text-zinc-500 dark:text-zinc-400"}>
            {t("summary", {
              count: attachments.length,
              max: MAX_ATTACHMENTS,
              used: totalMB.toFixed(1),
              limit: MAX_TOTAL_MB,
            })}
          </p>
          {useCompactUploadControl ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={dropDisabled}
              className={addMoreButtonClass}
            >
              <Paperclip className={isCompactViewport ? "h-3 w-3" : "h-3.5 w-3.5"} />
              {t("addMore")}
            </button>
          ) : null}
        </div>
      )}

      {/* File list */}
      {attachments.length > 0 && (
        <ul className={listSpacingClass}>
          {attachments.map((file) => {
            const Icon = getFileIcon(file.mimeType ?? "");
            const filename = getFilenameLabel(file);
            const { stem, extension } = splitFilename(filename);
            const isExpanded = expandedFileId === file.id;
            return (
              <li
                key={file.id}
                className={[
                  listItemClass,
                  isExpanded ? "items-start" : "items-center",
                ].join(" ")}
              >
                <div className={iconClass}>
                  <Icon className={isCompactViewport ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0"} />
                </div>
                <button
                  type="button"
                  className={filenameButtonClass}
                  aria-expanded={isExpanded}
                  onClick={() => {
                    setExpandedFileId((current) => (current === file.id ? null : file.id));
                  }}
                >
                  {isExpanded ? (
                    <span className={expandedFilenameClass}>
                      {filename}
                    </span>
                  ) : (
                    <span className={collapsedFilenameClass}>
                      <span className="min-w-0 truncate" title={filename}>
                        {stem}
                      </span>
                      {extension ? <span className="shrink-0">{extension}</span> : null}
                    </span>
                  )}
                </button>
                <div
                  className={[
                    metaGroupClass,
                    isExpanded ? "self-start pt-0.5" : "self-center",
                  ].join(" ")}
                >
                  <span className={isCompactViewport ? "text-[11px] text-zinc-500 dark:text-zinc-400" : "text-xs text-zinc-500 dark:text-zinc-400"}>
                    {formatBytes(file.sizeBytes ?? 0)}
                  </span>
                  <button
                    type="button"
                    aria-label={t("remove.ariaLabel", { name: filename })}
                    className={removeButtonClass}
                    onClick={() => void onRemove(file.id)}
                  >
                    <Trash2 className={isCompactViewport ? "h-3.5 w-3.5" : "h-3.5 w-3.5"} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Drop zone */}
      {!useCompactUploadControl ? (
        !atLimit && !atTotalLimit ? (
          <div
            role="button"
            tabIndex={0}
            aria-label={t("dropZone.ariaLabel")}
            aria-disabled={dropDisabled}
            className={[
              "flex w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 text-center transition-colors",
              attachments.length > 0
                ? isCompactViewport
                  ? "min-h-[96px] py-4"
                  : "min-h-[112px] py-5"
                : isCompactViewport
                  ? "min-h-[152px] py-6"
                  : "min-h-[176px] py-8",
              isDragOver
                ? "border-primary bg-primary/5"
                : "border-zinc-200 bg-white hover:border-primary/40 hover:bg-primary/5 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-primary/40 dark:hover:bg-primary/10",
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
            <Paperclip className={isCompactViewport ? "mx-auto mb-2 h-5 w-5 text-zinc-400 dark:text-zinc-500" : "mx-auto mb-3 h-6 w-6 text-zinc-400 dark:text-zinc-500"} />
            <p className={isCompactViewport ? "text-xs font-semibold text-zinc-700 dark:text-zinc-200" : "text-sm font-semibold text-zinc-700 dark:text-zinc-200"}>
              {isCompactViewport ? t("addMore") : t("dropZone.prompt")}
            </p>
            <p className={isCompactViewport ? "mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400" : "mt-2 text-xs text-zinc-500 dark:text-zinc-400"}>
              {ALLOWED_EXTENSIONS} · {t("dropZone.maxSize", { mb: MAX_FILE_MB })}
            </p>
            <p className={isCompactViewport ? "mt-1 text-[11px] text-zinc-400 dark:text-zinc-500" : "mt-1 text-xs text-zinc-400 dark:text-zinc-500"}>
              {t("multiSelectHint")}
            </p>
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {atLimit
              ? t("limit.maxFiles", { max: MAX_ATTACHMENTS })
              : t("limit.totalSize", { mb: MAX_TOTAL_MB })}
          </p>
        )
      ) : null}

      {/* Active upload progress */}
      {isUploading && (
        <div className="flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary-light" />
          <div className="min-w-0 flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary-light transition-all"
                style={{ width: `${clampedUploadProgress}%` }}
              />
            </div>
          </div>
          {uploadProgress >= 100 && (
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          )}
        </div>
      )}

    </div>
  );
}
