"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, RefreshCw, X } from "lucide-react";
import { useDraft } from "../../../hooks/use-api";
import { useLetterPreview } from "../../../hooks/use-letter-preview";
import { LetterPreview } from "../LetterPreview";
import { ScrollShadowViewport } from "../../ui/scroll-shadow";

interface WorkspacePreviewPaneProps {
  draftId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WorkspacePreviewPane({ draftId, isOpen, onClose }: WorkspacePreviewPaneProps) {
  const t = useTranslations("draft");
  const tc = useTranslations("common");
  const draft = useDraft(draftId);
  const { previewData, isStale, isLoading, error, refreshPreview, isRefreshing } =
    useLetterPreview(draftId);
  const shouldShowBlockingError = Boolean(error) && !draft.data;
  const shouldShowInlinePreviewWarning = Boolean(error) && Boolean(draft.data);
  const shouldShowPreviewContent = Boolean(draft.data) || Boolean(previewData);

  const [transitionsEnabled, setTransitionsEnabled] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setTransitionsEnabled(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`flex h-full shrink-0 flex-col overflow-hidden bg-[var(--app-surface-soft)] ${transitionsEnabled ? "transition-[width,opacity] duration-300 ease-out" : "transition-none"} ${
        isOpen
          ? "w-[520px] border-l border-[var(--app-border)] opacity-100"
          : "w-0 border-l border-transparent opacity-0"
      }`}
      aria-hidden={!isOpen}
      {...(!isOpen ? { inert: true } : undefined)}
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {t("preview")}
          </p>
          {isStale && !isRefreshing ? (
            <button
              type="button"
              onClick={refreshPreview}
              className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-400/15 dark:text-amber-300 dark:hover:bg-amber-400/25"
            >
              <RefreshCw className="h-3 w-3" />
              {tc("refresh")}
            </button>
          ) : null}
          {isRefreshing ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500">
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label={tc("close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ScrollShadowViewport surface="muted" className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
        {isLoading && !draft.data ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : shouldShowBlockingError || !shouldShowPreviewContent ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("previewUnavailableRetry")}</p>
            <button
              type="button"
              onClick={refreshPreview}
              className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              <RefreshCw className="h-3 w-3" />
              {tc("refresh")}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {shouldShowInlinePreviewWarning ? (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-left dark:border-amber-400/20 dark:bg-amber-400/10">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {t("previewUnavailableRetry")}
                  </p>
                  <button
                    type="button"
                    onClick={refreshPreview}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/80 px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-white dark:bg-zinc-950/40 dark:text-amber-200 dark:hover:bg-zinc-950/60"
                  >
                    <RefreshCw className="h-3 w-3" />
                    {tc("refresh")}
                  </button>
                </div>
              </div>
            ) : null}
            <LetterPreview
              draft={draft.data}
              senderProfile={previewData?.sender}
              recipientProfile={previewData?.recipient}
              variant="default"
              showHeader={false}
            />
          </div>
        )}
      </ScrollShadowViewport>
    </div>
  );
}
