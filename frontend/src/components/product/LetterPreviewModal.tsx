"use client";

import { useTranslations } from "next-intl";
import { useLetterPreview } from "../../hooks/use-letter-preview";
import { useDraft } from "../../hooks/use-api";
import {
  getSheetSurfaceClassName,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHandle,
  SheetTitle,
} from "../ui/sheet";
import { LetterPreview } from "./LetterPreview";

interface LetterPreviewModalProps {
  draftId: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
}

export function LetterPreviewModal({
  draftId,
  onClose,
  onConfirm,
  confirmDisabled = false,
}: LetterPreviewModalProps) {
  const t = useTranslations("draft");
  const draft = useDraft(draftId);
  const { previewData } = useLetterPreview(draftId);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        className={`${getSheetSurfaceClassName("preview")} h-[100dvh] max-h-[100dvh] min-h-[100dvh] rounded-none md:bottom-4 md:left-1/2 md:h-[min(94dvh,1040px)] md:w-[min(1080px,calc(100vw-2rem))] md:max-h-[94dvh] md:min-h-0 md:-translate-x-1/2 md:rounded-4xl`}
      >
        <SheetHandle className="pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] md:hidden" />

        <header className="flex shrink-0 flex-col gap-3 border-b border-[var(--app-border)] px-4 py-3 sm:px-6 md:py-4">
          <div className="min-w-0">
            <SheetTitle className="text-sm font-semibold text-[var(--app-fg)] sm:text-base">
              {t("professionalPreview")}
            </SheetTitle>
            <SheetDescription className="mt-1 text-sm text-[var(--app-muted)]">
              {t("previewSheetHint")}
            </SheetDescription>
          </div>
        </header>

        <SheetBody surface="muted" className="px-0 py-0">
          <div className="mx-auto flex h-full min-h-full w-full max-w-[1120px] bg-[var(--app-surface-soft)] px-0 py-0 sm:px-2 sm:py-2 md:px-6 md:py-6">
            <LetterPreview
              draft={draft.data}
              senderProfile={previewData?.sender}
              recipientProfile={previewData?.recipient}
              variant="immersive"
            />
          </div>
        </SheetBody>

        <SheetFooter sticky surface="muted" className="sm:px-6">
          <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3 sm:max-w-[320px]">
            <button
              type="button"
              disabled={confirmDisabled}
              onClick={() => {
                onClose();
                onConfirm();
              }}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold tracking-tight text-white transition-colors hover:bg-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
            >
              {t("confirmContent")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-5 text-sm font-semibold tracking-tight text-[var(--app-fg)] transition-colors hover:border-[var(--app-border-strong)] hover:bg-[var(--app-surface-soft)]"
            >
              {t("hidePreview")}
            </button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
