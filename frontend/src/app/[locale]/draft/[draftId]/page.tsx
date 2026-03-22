"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LayoutPanelLeft, ScrollText } from "lucide-react";
import {
  useConversation,
  useDraft,
  useLetterPreview,
  useSession,
  useUpdateDraft,
} from "../../../../hooks/use-api.js";
import { useVisualViewport } from "../../../../hooks/use-visual-viewport.js";
import { useMediaQuery } from "../../../../hooks/use-media-query.js";
import { useSetSender, useSetRecipient } from "../../../../hooks/use-profiles.js";
import { ConversationPanel } from "../../../../components/product/ConversationPanel.js";
import { LetterPreview } from "../../../../components/product/LetterPreview.js";
import { FlowHeader } from "../../../../components/product/FlowHeader.js";
import {
  ZoneEditor,
  type ZoneKind,
  type AddressFields,
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
  const setSender = useSetSender(draftId);
  const setRecipient = useSetRecipient(draftId);
  const letterPreview = useLetterPreview(draftId);
  const viewportHeight = useVisualViewport();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [mobileView, setMobileView] = useState<"conversation" | "preview">("conversation");
  const [hasUnseenPreviewChanges, setHasUnseenPreviewChanges] = useState(false);
  const [editingZone, setEditingZone] = useState<ZoneKind | null>(null);
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

  const zoneStatus = {
    sender: Boolean(draft.data?.senderProfileId),
    recipient: Boolean(draft.data?.recipientProfileId),
    subject: Boolean(draft.data?.subject?.trim()),
    body: Boolean(draft.data?.body?.trim()),
  };
  const hasPopulatedPreview = Object.values(zoneStatus).some(Boolean);

  const previewSignature = useMemo(() => {
    if (!draft.data) return null;
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
    if (mobileView === "preview") setHasUnseenPreviewChanges(false);
  }, [mobileView]);

  function handleZoneClick(zone: ZoneKind | string) {
    const z = zone as ZoneKind;
    setEditingZone(z);
    // For text zones on mobile, switch to preview where inline editors live
    if ((z === "subject" || z === "body") && !isDesktop) {
      setMobileView("preview");
    }
  }

  async function handleZoneSave(zone: ZoneKind, value: string | object) {
    if (zone === "subject" && typeof value === "string") {
      await updateDraft.mutateAsync({ subject: value });
    } else if (zone === "body" && typeof value === "string") {
      await updateDraft.mutateAsync({ body: value });
    } else if (zone === "sender" && typeof value === "object") {
      const addr = value as AddressFields;
      await setSender.mutateAsync({
        firstName: addr.firstName,
        lastName: addr.lastName,
        addressLine1: addr.street,
        companyName: addr.company || undefined,
        postalCode: addr.postalCode,
        city: addr.city,
      });
    } else if (zone === "recipient" && typeof value === "object") {
      const addr = value as AddressFields;
      await setRecipient.mutateAsync({
        firstName: addr.firstName || undefined,
        lastName: addr.lastName || undefined,
        addressLine1: addr.street,
        companyName: addr.company || undefined,
        postalCode: addr.postalCode,
        city: addr.city,
      });
    } else {
      return; // unhandled zone — don't close editor
    }
    setEditingZone(null);
  }

  function handleZoneCancel() {
    setEditingZone(null);
  }

  const isAddressEditing = editingZone === "sender" || editingZone === "recipient";

  // Derive initial address fields from preview data for re-editing
  const addressInitialValue = useMemo((): AddressFields | null => {
    if (!isAddressEditing || !letterPreview.previewData) return null;
    const profile = editingZone === "sender"
      ? letterPreview.previewData.sender
      : letterPreview.previewData.recipient;
    if (!profile) return null;
    const nameParts = (profile.name ?? "").split(" ");
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ");
    return {
      firstName,
      lastName,
      company: "",
      street: profile.addressLine1 ?? "",
      postalCode: profile.postalCode ?? "",
      city: profile.city ?? "",
    };
  }, [isAddressEditing, editingZone, letterPreview.previewData]);

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

      {/* Mobile: conversation / preview toggle bar */}
      <div className="flex items-center justify-center bg-stone-50/80 py-1.5 lg:hidden">
        <div className="inline-grid grid-cols-2 gap-0.5 rounded-lg bg-stone-200/50 p-0.5">
          <button
            type="button"
            onClick={() => setMobileView("conversation")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold transition ${
              mobileView === "conversation"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500"
            }`}
          >
            <LayoutPanelLeft className="h-3.5 w-3.5" />
            {t("workspaceTab")}
          </button>
          <button
            type="button"
            onClick={() => setMobileView("preview")}
            className={`relative inline-flex items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-semibold transition ${
              mobileView === "preview"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500"
            }`}
          >
            <ScrollText className="h-3.5 w-3.5" />
            {t("preview")}
            {hasUnseenPreviewChanges && mobileView !== "preview" ? (
              <span className="absolute right-1 top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
            ) : null}
          </button>
        </div>
      </div>

      {/* Desktop: side-by-side — conversation 40%, preview 60% */}
      <div className="hidden min-h-0 flex-1 lg:flex">
        <div className="flex w-[40%] min-w-0 flex-col bg-white">
          <ConversationPanel
            messages={conversation.messages}
            draftId={draftId}
            isLoading={conversation.isSending}
            zoneStatus={zoneStatus}
            onZoneChipClick={handleZoneClick}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-stone-50 p-6">
          <LetterPreview
            draft={draft.data}
            editingZone={editingZone}
            onZoneClick={handleZoneClick}
            onZoneSave={handleZoneSave}
            onZoneCancel={handleZoneCancel}
          />
        </div>
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
              editingZone={editingZone}
              onZoneClick={handleZoneClick}
              onZoneSave={handleZoneSave}
              onZoneCancel={handleZoneCancel}
            />
          </div>
        </div>
      </div>

      {/* Address zone editor — backdrop + popover (desktop) or sheet (mobile) */}
      {isAddressEditing && (
        <div
          className="fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px]"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleZoneCancel();
          }}
          role="presentation"
        >
          {isDesktop ? (
            <div className="flex h-full items-center justify-center p-8">
              <ZoneEditor
                zone={editingZone}
                initialValue={addressInitialValue}
                onSave={async (value) => { await handleZoneSave(editingZone, value); }}
                onCancel={handleZoneCancel}
                isMobile={false}
              />
            </div>
          ) : (
            <ZoneEditor
              zone={editingZone}
              initialValue={addressInitialValue}
              onSave={async (value) => { await handleZoneSave(editingZone, value); }}
              onCancel={handleZoneCancel}
              isMobile
            />
          )}
        </div>
      )}
    </div>
  );
}
