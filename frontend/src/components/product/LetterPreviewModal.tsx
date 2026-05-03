"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useLetterPreview } from "../../hooks/use-letter-preview";
import { useDraft } from "../../hooks/use-api";
import { getSignaturePreviewUrl } from "../../lib/letter-content";
import { getAppButtonClassName } from "../ui/app-button";
import {
  getSheetSurfaceClassName,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHandle,
  SheetTitle,
} from "../ui/sheet";
import { ActionButton } from "./ActionButton";
import { LetterPreview } from "./LetterPreview";

interface LetterPreviewModalProps {
  draftId: string;
  onClose: () => void;
  onConfirm?: (() => void) | undefined;
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
        className={`${getSheetSurfaceClassName("preview")} h-[100dvh] max-h-[100dvh] min-h-[100dvh] rounded-none md:bottom-4 md:right-auto md:left-1/2 md:h-[calc(100dvh-2rem)] md:w-[min(1180px,calc(100vw-2rem))] md:max-h-[calc(100dvh-2rem)] md:min-h-0 md:-translate-x-1/2 md:rounded-4xl`}
      >
        <SheetHandle className="pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] md:hidden" />

        <header className="flex shrink-0 flex-col gap-3 border-b border-[var(--app-border)] px-4 py-3 sm:px-6 md:py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-sm font-semibold text-[var(--app-fg)] sm:text-base">
                {t("professionalPreview")}
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm text-[var(--app-muted)]">
                {t("previewSheetHint")}
              </SheetDescription>
            </div>
            <SheetClose asChild>
              <button
                type="button"
                aria-label={t("closePreview")}
                className={getAppButtonClassName({
                  variant: "secondary",
                  size: "sm",
                  className:
                    "app-toolbar-button h-11 w-11 shrink-0 rounded-2xl p-0 shadow-none",
                })}
              >
                <X className="h-4 w-4" />
              </button>
            </SheetClose>
          </div>
        </header>

        <SheetBody surface="muted" className="px-0 py-0">
          <div className="mx-auto flex h-full min-h-full w-full max-w-[1120px] bg-[var(--app-surface-soft)] px-0 py-0 sm:px-2 sm:py-2 md:px-6 md:py-6">
            <LetterPreview
              draft={draft.data}
              senderProfile={previewData?.sender}
              recipientProfile={previewData?.recipient}
              signatureMode={previewData?.signatureMode}
              signatureUrl={getSignaturePreviewUrl(previewData?.signatureFileId)}
              variant="immersive"
            />
          </div>
        </SheetBody>

        <SheetFooter sticky surface="muted" className="sm:px-6">
          <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-3 sm:max-w-[320px]">
            {onConfirm ? (
              <ActionButton
                disabled={confirmDisabled}
                onClick={() => {
                  onClose();
                  onConfirm();
                }}
                fullWidth
              >
                {t("confirmContent")}
              </ActionButton>
            ) : null}
            <ActionButton variant="secondary" onClick={onClose} fullWidth>
              {t("hidePreview")}
            </ActionButton>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
