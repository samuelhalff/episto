"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Check, Pencil } from "lucide-react";
import { useLetterPreview } from "../../hooks/use-letter-preview.js";
import { useDraft } from "../../hooks/use-api.js";
import { LetterPreview } from "./LetterPreview.js";

interface LetterPreviewModalProps {
  draftId: string;
  onClose: () => void;
  onEditManually: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
}

/**
 * Full-viewport letter preview modal.
 * Uses fixed positioning to escape any parent overflow/positioning context.
 * Includes focus trap, Escape key, and aria attributes.
 */
export function LetterPreviewModal({
  draftId,
  onClose,
  onEditManually,
  onConfirm,
  confirmDisabled = false,
}: LetterPreviewModalProps) {
  const t = useTranslations("draft");
  const panelRef = useRef<HTMLDivElement>(null);
  const draft = useDraft(draftId);
  const { previewData } = useLetterPreview(draftId);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the close button on mount
    const closeBtn = panel.querySelector<HTMLElement>("[data-preview-close]");
    closeBtn?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = panel!.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    // Prevent body scroll while preview is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("professionalPreview")}
      className="fixed inset-0 z-[200] flex flex-col bg-[#f6f4ef] dark:bg-zinc-950"
    >
      {/* ── Top bar ── */}
      <header className="flex shrink-0 items-center justify-between border-b border-black/5 px-4 py-3 dark:border-white/10 sm:px-6">
        <button
          type="button"
          data-preview-close
          onClick={onClose}
          className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
          {t("backToEditor")}
        </button>

        <div className="hidden text-center sm:block">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
            {t("professionalPreview")}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onEditManually();
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-100 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("editBodyManuallyBadge")}</span>
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
          >
            <Check className="h-4 w-4" />
            <span className="hidden sm:inline">{t("confirmContent")}</span>
          </button>
        </div>
      </header>

      {/* ── Document viewport ── */}
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
          <LetterPreview
            draft={draft.data}
            senderProfile={previewData?.sender}
            recipientProfile={previewData?.recipient}
          />
        </div>
      </div>
    </div>
  );
}
