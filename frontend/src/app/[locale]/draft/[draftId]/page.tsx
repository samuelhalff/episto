"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, ScrollText, X } from "lucide-react";
import { useDraft, useSession, useConversation } from "../../../../hooks/use-api.js";
import { ConversationPanel } from "../../../../components/product/ConversationPanel.js";
import { LetterPreview } from "../../../../components/product/LetterPreview.js";
import { FlowHeader } from "../../../../components/product/FlowHeader.js";

export default function DraftWorkspacePage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = use(params);
  const t = useTranslations("draft");
  const tc = useTranslations("common");

  const session = useSession();
  const draft = useDraft(draftId);
  const conversation = useConversation(draftId);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [hasUnseenPreviewChanges, setHasUnseenPreviewChanges] = useState(false);
  const [showPreviewCue, setShowPreviewCue] = useState(false);
  const previewSignatureRef = useRef<string | null>(null);

  if (!session.session && !session.isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold text-gray-900">{tc("appName")}</h1>
        <button
          type="button"
          onClick={() => void session.createSession("en-CH")}
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-50"
        >
          {t("title")}
        </button>
      </div>
    );
  }

  const hasPreviewSurface = Boolean(draft.data);
  const hasPopulatedPreview = Boolean(
    draft.data &&
      [
        draft.data.senderProfileId,
        draft.data.recipientProfileId,
        draft.data.subject?.trim(),
        draft.data.body?.trim(),
      ].some(Boolean),
  );
  const previewSignature = useMemo(() => {
    if (!draft.data) {
      return null;
    }

    return JSON.stringify({
      senderProfileId: draft.data.senderProfileId,
      recipientProfileId: draft.data.recipientProfileId,
      subject: draft.data.subject ?? "",
      body: draft.data.body ?? "",
      updatedAt: new Date(draft.data.updatedAt).toISOString(),
    });
  }, [draft.data]);

  useEffect(() => {
    if (!previewSignature) {
      previewSignatureRef.current = null;
      setHasUnseenPreviewChanges(false);
      setShowPreviewCue(false);
      return;
    }

    if (!previewSignatureRef.current) {
      previewSignatureRef.current = previewSignature;
      if (hasPopulatedPreview) {
        setHasUnseenPreviewChanges(true);
        setShowPreviewCue(true);
      }
      return;
    }

    if (previewSignatureRef.current !== previewSignature) {
      previewSignatureRef.current = previewSignature;
      if (isPreviewOpen) {
        setHasUnseenPreviewChanges(false);
        setShowPreviewCue(false);
        return;
      }

      setHasUnseenPreviewChanges(true);
      if (hasPopulatedPreview) {
        setShowPreviewCue(true);
      }
    }
  }, [hasPopulatedPreview, isPreviewOpen, previewSignature]);

  useEffect(() => {
    if (!isPreviewOpen) {
      return;
    }

    setHasUnseenPreviewChanges(false);
    setShowPreviewCue(false);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isPreviewOpen]);

  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      <FlowHeader
        currentStep={0}
        draftId={draftId}
        title={t("title")}
        statusLabel={t("saved")}
      />

      {/* Desktop: side-by-side panels */}
      <div className="hidden min-h-0 flex-1 lg:flex">
        <div className="flex w-[42%] min-w-0 flex-col border-r border-stone-200/80">
          <ConversationPanel
            messages={conversation.messages}
            draftId={draftId}
            isLoading={conversation.isSending}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-stone-50 p-6">
          <LetterPreview draft={draft.data} />
        </div>
      </div>

      {/* Mobile/Tablet: conversation first, preview stays one tap away */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <ConversationPanel
          messages={conversation.messages}
          draftId={draftId}
          isLoading={conversation.isSending}
        />
      </div>

      {showPreviewCue && hasPopulatedPreview ? (
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+6.25rem)] z-30 rounded-[1.35rem] border border-amber-200 bg-white/95 px-4 py-3 text-left shadow-[0_18px_44px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-stone-950">{t("previewReadyToast")}</p>
              <p className="text-xs text-stone-500">{t("previewSheetHint")}</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              {t("preview")}
            </span>
          </div>
        </button>
      ) : null}

      {hasPreviewSurface ? (
        <button
          type="button"
          onClick={() => setIsPreviewOpen(true)}
          aria-label={t("preview")}
          className={`fixed right-4 z-30 inline-flex items-center justify-center gap-2 border text-sm font-semibold shadow-[0_18px_44px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 lg:hidden ${
            hasPopulatedPreview
              ? "bottom-[calc(env(safe-area-inset-bottom)+8.5rem)] min-h-12 rounded-full px-4 py-3"
              : "bottom-[calc(env(safe-area-inset-bottom)+7.5rem)] h-12 w-12 rounded-full"
          } ${
            hasUnseenPreviewChanges
              ? "border-amber-200 bg-stone-950 text-white"
              : "border-stone-200 bg-white text-stone-900"
          }`}
        >
          <span
            className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full ${
              hasUnseenPreviewChanges ? "bg-white/12 text-white" : "bg-stone-100 text-stone-700"
            }`}
          >
            <ScrollText className="h-4 w-4" />
            {hasUnseenPreviewChanges ? (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-300" />
            ) : null}
          </span>
          {hasPopulatedPreview ? <span>{t("preview")}</span> : null}
        </button>
      ) : null}

      {isPreviewOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" aria-modal="true" role="dialog">
          <button
            type="button"
            aria-label={t("closePreview")}
            onClick={() => setIsPreviewOpen(false)}
            className="absolute inset-0 bg-stone-950/45"
          />

          <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[2rem] border-t border-stone-200 bg-stone-50 shadow-[0_-24px_80px_rgba(15,23,42,0.24)]">
            <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-stone-300" />
            <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                  {t("preview")}
                </p>
                <p className="mt-1 text-sm text-stone-500">{t("previewSheetHint")}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 transition hover:bg-stone-100"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">{t("closePreview")}</span>
              </button>
            </div>

            <div className="max-h-[calc(88dvh-5.5rem)] overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              <LetterPreview draft={draft.data} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
