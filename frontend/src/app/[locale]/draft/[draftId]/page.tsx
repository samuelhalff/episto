"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import {
  useDraft,
  useSession,
  useConversation,
} from "../../../../hooks/use-api.js";
import { Link } from "../../../../i18n/navigation.js";
import { Eye, X } from "lucide-react";
import { StepIndicator } from "../../../../components/product/StepIndicator.js";
import { ConversationPanel } from "../../../../components/product/ConversationPanel.js";
import { LetterPreview } from "../../../../components/product/LetterPreview.js";

// ---------------------------------------------------------------------------
// Main Draft Workspace Page
// ---------------------------------------------------------------------------

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

  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  // No session yet — prompt to start
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

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-3">
        <Link href="/" className="font-bold text-gray-900">
          {tc("appName")}
        </Link>
        <StepIndicator currentStep={0} />
        <span className="text-sm text-gray-500">{t("saved")}</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation panel — left on desktop, full on mobile */}
        <div className="flex flex-1 flex-col border-r lg:w-2/5 lg:flex-none">
          <ConversationPanel
            messages={conversation.messages}
            draftId={draftId}
            isLoading={conversation.isSending}
          />
        </div>

        {/* Letter preview — right on desktop, hidden on mobile */}
        <div className="hidden flex-1 flex-col overflow-y-auto bg-gray-50 p-6 lg:flex">
          <LetterPreview draft={draft.data} />
        </div>
      </div>

      {/* Mobile floating preview button */}
      <button
        type="button"
        onClick={() => setMobilePreviewOpen(true)}
        className="fixed bottom-6 right-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:bg-primary-dark lg:hidden"
      >
        <Eye className="h-5 w-5" />
        <span className="sr-only">{t("preview")}</span>
      </button>

      {/* Mobile preview overlay */}
      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-gray-50 lg:hidden">
          <div className="flex items-center justify-between border-b bg-white px-4 py-3">
            <span className="font-medium text-gray-900">{t("preview")}</span>
            <button
              type="button"
              onClick={() => setMobilePreviewOpen(false)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <LetterPreview draft={draft.data} />
          </div>
        </div>
      )}
    </div>
  );
}
