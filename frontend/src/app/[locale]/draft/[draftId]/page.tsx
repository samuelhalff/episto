"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, LayoutPanelLeft, ScrollText } from "lucide-react";
import {
  useConversation,
  useDraft,
  useSession,
  useUpdateDraft,
} from "../../../../hooks/use-api.js";
import { useVisualViewport } from "../../../../hooks/use-visual-viewport.js";
import { ConversationPanel } from "../../../../components/product/ConversationPanel.js";
import { LetterPreview } from "../../../../components/product/LetterPreview.js";
import { FlowHeader } from "../../../../components/product/FlowHeader.js";
import {
  ZoneEditor,
  type ZoneKind,
} from "../../../../components/product/ZoneEditor.js";

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
  const updateDraft = useUpdateDraft(draftId);
  const viewportHeight = useVisualViewport();

  const [mobileView, setMobileView] = useState<"conversation" | "preview">("conversation");
  const [hasUnseenPreviewChanges, setHasUnseenPreviewChanges] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [activeZone, setActiveZone] = useState<ZoneKind | null>(null);
  const [isMobileZoneEditor, setIsMobileZoneEditor] = useState(false);
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

  const hasPopulatedPreview = Boolean(
    draft.data &&
      [
        draft.data.senderProfileId,
        draft.data.recipientProfileId,
        draft.data.subject?.trim(),
        draft.data.body?.trim(),
      ].some(Boolean),
  );
  const zoneStatus = {
    sender: Boolean(draft.data?.senderProfileId),
    recipient: Boolean(draft.data?.recipientProfileId),
    subject: Boolean(draft.data?.subject?.trim()),
    body: Boolean(draft.data?.body?.trim()),
  };
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
      return;
    }

    if (!previewSignatureRef.current) {
      previewSignatureRef.current = previewSignature;
      if (hasPopulatedPreview && mobileView !== "preview") {
        setHasUnseenPreviewChanges(true);
      }
      return;
    }

    if (previewSignatureRef.current !== previewSignature) {
      previewSignatureRef.current = previewSignature;
      if (mobileView === "preview") {
        setHasUnseenPreviewChanges(false);
        return;
      }

      setHasUnseenPreviewChanges(true);
    }
  }, [hasPopulatedPreview, mobileView, previewSignature]);

  useEffect(() => {
    if (mobileView === "preview") {
      setHasUnseenPreviewChanges(false);
    }
  }, [mobileView]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateEditorMode = () => setIsMobileZoneEditor(mediaQuery.matches);

    updateEditorMode();
    mediaQuery.addEventListener("change", updateEditorMode);
    return () => mediaQuery.removeEventListener("change", updateEditorMode);
  }, []);

  function handleZoneClick(zone: ZoneKind | string) {
    setActiveZone(zone as ZoneKind);
  }

  async function handleZoneSave(value: string | object) {
    if (activeZone === "subject" && typeof value === "string") {
      await updateDraft.mutateAsync({ subject: value });
    } else if (activeZone === "body" && typeof value === "string") {
      await updateDraft.mutateAsync({ body: value });
    }

    setActiveZone(null);
  }

  const mobileViewToggle = (
    <div className="border-b border-stone-200/80 bg-white px-3 py-2 lg:hidden">
      <div className="grid grid-cols-2 gap-2 rounded-[1.25rem] border border-stone-200 bg-stone-50 p-1">
        <button
          type="button"
          onClick={() => setMobileView("conversation")}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] px-3 py-2 text-sm font-semibold transition ${
            mobileView === "conversation"
              ? "bg-white text-stone-950 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          <LayoutPanelLeft className="h-4 w-4" />
          {t("workspaceTab")}
        </button>
        <button
          type="button"
          onClick={() => setMobileView("preview")}
          aria-label={t("preview")}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] px-3 py-2 text-sm font-semibold transition ${
            mobileView === "preview"
              ? "bg-white text-stone-950 shadow-sm"
              : "text-stone-500 hover:text-stone-700"
          }`}
        >
          <span className="relative inline-flex h-5 w-5 items-center justify-center">
            <ScrollText className="h-4 w-4" />
            {hasUnseenPreviewChanges ? (
              <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-amber-500" />
            ) : null}
          </span>
          {t("preview")}
        </button>
      </div>
    </div>
  );

  return (
    <div
      id="draft-workspace-root"
      className="relative flex flex-col overflow-hidden bg-white"
      style={{ height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}
    >
      <FlowHeader
        currentStep={0}
        draftId={draftId}
        title={t("title")}
        statusLabel={t("saved")}
      />
      {mobileViewToggle}

      {/* Desktop: side-by-side panels */}
      <div className="hidden min-h-0 flex-1 lg:flex">
        <div
          className={`flex ${previewCollapsed ? "flex-1" : "w-[58%]"} min-w-0 flex-col border-r border-stone-200/80`}
        >
          <ConversationPanel
            messages={conversation.messages}
            draftId={draftId}
            isLoading={conversation.isSending}
            zoneStatus={zoneStatus}
            onZoneChipClick={handleZoneClick}
          />
        </div>
        {!previewCollapsed && (
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-stone-50 p-6">
            <LetterPreview
              draft={draft.data}
              onZoneClick={handleZoneClick}
              activeZone={activeZone}
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => setPreviewCollapsed((c) => !c)}
          aria-label={previewCollapsed ? t("showPreview") : t("hidePreview")}
          className="flex w-8 shrink-0 items-center justify-center border-l border-stone-200/80 bg-stone-50 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
        >
          {previewCollapsed ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Mobile/Tablet: both panels mounted, CSS toggle */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <div
          className={`${mobileView === "conversation" ? "flex" : "hidden"} min-h-0 flex-1 flex-col`}
        >
          <ConversationPanel
            messages={conversation.messages}
            draftId={draftId}
            isLoading={conversation.isSending}
            zoneStatus={zoneStatus}
            onZoneChipClick={handleZoneClick}
          />
        </div>
        <div
          className={`${mobileView === "preview" ? "flex" : "hidden"} min-h-0 flex-1 flex-col overflow-y-auto bg-stone-50 p-4`}
        >
          <div className="pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <LetterPreview
              draft={draft.data}
              onZoneClick={handleZoneClick}
              activeZone={activeZone}
            />
          </div>
        </div>
      </div>

      {activeZone && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setActiveZone(null)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 lg:absolute lg:inset-auto lg:right-4 lg:top-20 lg:w-96">
            <ZoneEditor
              zone={activeZone}
              initialValue={
                activeZone === "subject"
                  ? (draft.data?.subject ?? null)
                  : activeZone === "body"
                    ? (draft.data?.body ?? null)
                    : null
              }
              onSave={handleZoneSave}
              onCancel={() => setActiveZone(null)}
              isMobile={isMobileZoneEditor}
            />
          </div>
        </>
      )}
    </div>
  );
}
