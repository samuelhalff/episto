"use client";

import { use, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  useDraft,
  useMessages,
  useSendMessage,
  useSession,
  useCreateSession,
} from "../../../../hooks/use-api.js";
import { Link } from "../../../../i18n/navigation.js";
import {
  Send,
  FileText,
  ChevronRight,
  Loader2,
  Eye,
  X,
} from "lucide-react";
import type { ConversationMessage, DraftLetter } from "@swiss-mail/shared";
import { MessageRole } from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Step Indicator
// ---------------------------------------------------------------------------

const STEPS = ["stepDraft", "stepReview", "stepPay", "stepDone"] as const;

function StepIndicator({ currentStep }: { currentStep: number }) {
  const t = useTranslations("draft");

  return (
    <nav className="hidden items-center gap-2 sm:flex" aria-label="Progress">
      {STEPS.map((key, i) => {
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        return (
          <span key={key} className="flex items-center gap-1.5 text-sm">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
            )}
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                isActive
                  ? "bg-navy text-white"
                  : isDone
                    ? "bg-success/10 text-success"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {isDone ? "✓" : i + 1}
            </span>
            <span
              className={
                isActive ? "font-medium text-navy" : "text-gray-500"
              }
            >
              {t(key)}
            </span>
          </span>
        );
      })}
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Conversation Panel
// ---------------------------------------------------------------------------

function ConversationPanel({
  messages,
  draftId,
  isLoading,
}: {
  messages: ConversationMessage[];
  draftId: string;
  isLoading: boolean;
}) {
  const t = useTranslations("draft");
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendMessage = useSendMessage(draftId);

  function handleSend() {
    const content = input.trim();
    if (!content) return;
    setInput("");
    sendMessage.mutate(
      { content },
      {
        onSuccess: () => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        },
      },
    );
  }

  return (
    <>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-navy" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
            <FileText className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm">{t("title")}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === MessageRole.user ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === MessageRole.user
                    ? "bg-navy text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {sendMessage.isPending && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t bg-white p-4">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
            rows={1}
            placeholder={t("messagePlaceholder")}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            type="button"
            disabled={!input.trim() || sendMessage.isPending}
            onClick={handleSend}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy text-white transition hover:bg-navy-light disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">{t("sendMessage")}</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Letter Preview
// ---------------------------------------------------------------------------

function LetterPreview({ draft }: { draft: DraftLetter | undefined }) {

  if (!draft) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[595px]">
      <div className="rounded-lg border border-gray-200 bg-white p-10 shadow-sm">
        {/* A4-like letter format */}
        <div className="min-h-[600px] space-y-8 text-sm text-gray-700">
          {/* Sender placeholder */}
          <div className="text-xs text-gray-400">
            {draft.senderProfileId ? (
              <span className="text-gray-600">&#x2709; Sender</span>
            ) : (
              <span className="italic">Sender address…</span>
            )}
          </div>

          {/* Recipient placeholder */}
          <div className="mt-6 text-gray-400">
            {draft.recipientProfileId ? (
              <span className="text-gray-600">Recipient</span>
            ) : (
              <span className="italic">Recipient address…</span>
            )}
          </div>

          {/* Date */}
          <div className="text-right text-xs text-gray-400">
            {new Date().toLocaleDateString(draft.locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>

          {/* Subject */}
          <div className="font-semibold text-gray-900">
            {draft.subject ?? (
              <span className="font-normal italic text-gray-400">
                Subject…
              </span>
            )}
          </div>

          {/* Body */}
          <div className="whitespace-pre-wrap leading-relaxed">
            {draft.body ?? (
              <span className="italic text-gray-400">
                Letter body…
              </span>
            )}
          </div>

          {/* Closing */}
          {draft.signatureMode && (
            <div className="pt-6 text-gray-500">
              <span className="italic">Signature</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  const createSession = useCreateSession();
  const draft = useDraft(draftId);
  const messages = useMessages(draftId);

  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

  // No session yet — prompt to start
  if (!session.data && !session.isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
        <h1 className="text-2xl font-bold text-navy">{tc("appName")}</h1>
        <button
          type="button"
          onClick={() => createSession.mutate({})}
          disabled={createSession.isPending}
          className="rounded-lg bg-navy px-6 py-3 text-sm font-medium text-white transition hover:bg-navy-light disabled:opacity-50"
        >
          {createSession.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("title")
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b bg-white px-4 py-3">
        <Link href="/" className="font-bold text-navy">
          {tc("appName")}
        </Link>
        <StepIndicator currentStep={0} />
        <span className="text-sm text-gray-500">{t("saved")}</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Conversation panel — left on desktop, full on mobile */}
        <div className="flex flex-1 flex-col border-r lg:w-2/5 lg:flex-none">
          <ConversationPanel
            messages={messages.data ?? []}
            draftId={draftId}
            isLoading={messages.isLoading}
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
        className="fixed bottom-6 right-6 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-lg transition hover:bg-navy-light lg:hidden"
      >
        <Eye className="h-5 w-5" />
        <span className="sr-only">{t("preview")}</span>
      </button>

      {/* Mobile preview overlay */}
      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-gray-50 lg:hidden">
          <div className="flex items-center justify-between border-b bg-white px-4 py-3">
            <span className="font-medium text-navy">{t("preview")}</span>
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
