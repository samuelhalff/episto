"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import {
  useDraft,
  useSession,
  useConversation,
} from "../../../../hooks/use-api.js";
import { Link } from "../../../../i18n/navigation.js";
import { Eye, X, Mail, PanelRightClose, PanelRightOpen } from "lucide-react";
import { StepIndicator } from "../../../../components/product/StepIndicator.js";
import { ConversationPanel } from "../../../../components/product/ConversationPanel.js";
import { LetterPreview } from "../../../../components/product/LetterPreview.js";
import { Button } from "../../../../components/ui/button.js";
import { Badge } from "../../../../components/ui/badge.js";
import { cn } from "../../../../lib/utils.js";

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
  const [previewCollapsed, setPreviewCollapsed] = useState(false);

  // No session yet
  if (!session.session && !session.isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Mail className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{tc("appName")}</h1>
        <Button
          onClick={() => void session.createSession("en-CH")}
          size="lg"
        >
          {t("title")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Mail className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="hidden font-semibold text-foreground sm:inline">
            {tc("appName")}
          </span>
        </Link>

        <StepIndicator currentStep={0} />

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {t("saved")}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={() => setPreviewCollapsed(!previewCollapsed)}
            aria-label="Toggle preview"
          >
            {previewCollapsed ? (
              <PanelRightOpen className="h-4 w-4" />
            ) : (
              <PanelRightClose className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation panel */}
        <div
          className={cn(
            "flex flex-1 flex-col border-r border-border",
            !previewCollapsed && "lg:w-[45%] lg:flex-none"
          )}
        >
          <ConversationPanel
            messages={conversation.messages}
            draftId={draftId}
            isLoading={conversation.isSending}
          />
        </div>

        {/* Letter preview — right on desktop */}
        {!previewCollapsed && (
          <div className="hidden flex-1 flex-col overflow-y-auto bg-muted/30 p-8 lg:flex">
            <div className="mx-auto w-full max-w-2xl">
              <LetterPreview draft={draft.data} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile floating preview button */}
      <Button
        size="icon"
        onClick={() => setMobilePreviewOpen(true)}
        className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full shadow-lg lg:hidden"
      >
        <Eye className="h-5 w-5" />
        <span className="sr-only">{t("preview")}</span>
      </Button>

      {/* Mobile preview overlay */}
      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-background lg:hidden">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <span className="font-medium text-foreground">{t("preview")}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobilePreviewOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto bg-muted/30 p-6">
            <div className="mx-auto max-w-2xl">
              <LetterPreview draft={draft.data} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
