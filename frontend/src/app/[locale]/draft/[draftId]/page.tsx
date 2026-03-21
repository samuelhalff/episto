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
    <div className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white p-1 shadow-sm">
      <button
        type="button"
        onClick={() => setMobileView("conversation")}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${
          mobileView === "conversation"
            ? "bg-stone-950 text-white"
            : "text-stone-500 hover:text-stone-900"
        }`}
      >
        <LayoutPanelLeft className="h-3.5 w-3.5" />
        {t("workspaceTab")}
      </button>
      <button
        type="button"
        onClick={() => setMobileView("preview")}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition ${
          mobileView === "preview"
            ? "bg-stone-950 text-white"
            : "text-stone-500 hover:text-stone-900"
        }`}
      >
        <ScrollText className="h-3.5 w-3.5" />
        {t("preview")}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#fffaf4_0%,#ffffff_30%)]">
      <FlowHeader
        currentStep={0}
        draftId={draftId}
        title={t("title")}
        statusLabel={t("saved")}
        actions={mobileViewToggle}
      />

      <div className="mx-auto flex w-full max-w-7xl flex-1 overflow-hidden px-0 sm:px-4 lg:px-6">
        <div className="hidden flex-1 overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white shadow-[0_24px_70px_rgba(120,53,15,0.08)] lg:flex">
          <div className="flex w-[42%] min-w-0 flex-col border-r border-stone-200/80">
            <ConversationPanel
              messages={conversation.messages}
              draftId={draftId}
              isLoading={conversation.isSending}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-[linear-gradient(180deg,#fbfbfb_0%,#f5f5f4_100%)] p-6">
            <LetterPreview draft={draft.data} />
          </div>
        </div>

        <div className="flex flex-1 flex-col lg:hidden">
          {mobileView === "conversation" ? (
            <ConversationPanel
              messages={conversation.messages}
              draftId={draftId}
              isLoading={conversation.isSending}
            />
          ) : (
            <div className="flex flex-1 flex-col bg-[linear-gradient(180deg,#fbfbfb_0%,#f5f5f4_100%)] px-4 py-5">
              <div className="mb-4 rounded-[1.5rem] border border-stone-200 bg-white/90 px-4 py-3 text-sm text-stone-500 shadow-sm">
                {t("previewHint")}
              </div>
              <div className="flex-1 overflow-y-auto pb-6">
                <LetterPreview draft={draft.data} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
