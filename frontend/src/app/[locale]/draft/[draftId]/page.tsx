"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import { LayoutPanelLeft, ScrollText } from "lucide-react";
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

  const [mobileView, setMobileView] = useState<"conversation" | "preview">(
    "conversation",
  );

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

  const mobileViewToggle = (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-stone-200 bg-stone-100 p-0.5 lg:hidden">
      <button
        type="button"
        onClick={() => setMobileView("conversation")}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:py-2 sm:text-xs ${
          mobileView === "conversation"
            ? "bg-white text-stone-950 shadow-sm"
            : "text-stone-500 hover:text-stone-700"
        }`}
      >
        <LayoutPanelLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        {t("workspaceTab")}
      </button>
      <button
        type="button"
        onClick={() => setMobileView("preview")}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold transition sm:px-3 sm:py-2 sm:text-xs ${
          mobileView === "preview"
            ? "bg-white text-stone-950 shadow-sm"
            : "text-stone-500 hover:text-stone-700"
        }`}
      >
        <ScrollText className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        {t("preview")}
      </button>
    </div>
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-white">
      <FlowHeader
        currentStep={0}
        draftId={draftId}
        title={t("title")}
        statusLabel={t("saved")}
        actions={mobileViewToggle}
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

      {/* Mobile/Tablet: tabbed view */}
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        {mobileView === "conversation" ? (
          <ConversationPanel
            messages={conversation.messages}
            draftId={draftId}
            isLoading={conversation.isSending}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-stone-50 p-4">
            <LetterPreview draft={draft.data} />
          </div>
        )}
      </div>
    </div>
  );
}
