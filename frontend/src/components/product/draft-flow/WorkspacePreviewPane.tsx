"use client";

import { useTranslations } from "next-intl";
import { Loader2, RefreshCw, X } from "lucide-react";
import { useDraft } from "../../../hooks/use-api";
import { useLetterPreview } from "../../../hooks/use-letter-preview";
import { LetterPreview } from "../LetterPreview";
import { ScrollShadowViewport } from "../../ui/scroll-shadow";

interface WorkspacePreviewPaneProps {
  draftId: string;
  onClose: () => void;
}

export function WorkspacePreviewPane({ draftId, onClose }: WorkspacePreviewPaneProps) {
  const t = useTranslations("draft");
  const tc = useTranslations("common");
  const draft = useDraft(draftId);
  const { previewData, isStale, isLoading, refreshPreview, isRefreshing } =
    useLetterPreview(draftId);

  return (
    <div className="flex h-full w-[520px] shrink-0 flex-col border-l border-[var(--app-border)] bg-[var(--app-surface-soft)]">
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
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <LetterPreview
            draft={draft.data}
            senderProfile={previewData?.sender}
            recipientProfile={previewData?.recipient}
            variant="default"
            showHeader={false}
          />
        )}
      </ScrollShadowViewport>
    </div>
  );
}
