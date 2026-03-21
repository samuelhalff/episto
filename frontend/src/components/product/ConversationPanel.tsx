"use client";

import { useRef, useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, FileText, Sparkles } from "lucide-react";
import { useConversation } from "../../hooks/use-api.js";
import { useDictation } from "../../hooks/use-dictation.js";
import type { ConversationMessage } from "@swiss-mail/shared";
import { MessageRole } from "@swiss-mail/shared";
import { InputBar, type InputMode } from "./InputBar.js";

export function ConversationPanel({
  messages: _externalMessages,
  draftId,
  isLoading,
}: {
  messages: ConversationMessage[];
  draftId: string;
  isLoading: boolean;
}) {
  const t = useTranslations("draft");
  const locale = useLocale();

  const [input, setInput] = useState("");
  const [mode, setMode] = useState<InputMode>("initial");

  const bottomRef = useRef<HTMLDivElement>(null);
  const conversation = useConversation(draftId);

  const {
    isSupported: dictationSupported,
    isRecording,
    interimText,
    finalText,
    startRecording,
    stopRecording,
    resetText,
    error: dictationError,
  } = useDictation();

  useEffect(() => {
    if (conversation.isStreaming || conversation.messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [
    conversation.isStreaming,
    conversation.streamingText,
    conversation.messages.length,
  ]);

  useEffect(() => {
    if (!finalText) return;
    setInput((prev) => (prev ? `${prev} ${finalText}` : finalText).trimStart());
    resetText();
  }, [finalText, resetText]);

  useEffect(() => {
    if (conversation.messages.length > 0 && mode === "initial") {
      setMode("keyboard");
    }
  }, [conversation.messages.length, mode]);

  function handleSend() {
    const content = input.trim();
    if (!content) return;
    setInput("");
    void conversation.sendMessage(content);
  }

  const allMessages = conversation.messages;
  const showStreaming = conversation.isStreaming && conversation.streamingText.length > 0;
  const showSpinner = conversation.isSending && !conversation.isStreaming;
  const isEmpty =
    allMessages.length === 0 && !showStreaming && !showSpinner && !isLoading;

  return (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,#fffdf9_0%,#ffffff_60%)]">
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isEmpty ? (
          <div className="flex h-full min-h-[200px] flex-col justify-end sm:min-h-[280px]">
            <div className="mx-auto mb-4 w-full max-w-md rounded-[2rem] border border-stone-200/80 bg-white/90 p-4 text-center shadow-[0_18px_50px_rgba(120,53,15,0.08)] sm:p-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-amber-50 text-amber-600 sm:h-14 sm:w-14 sm:rounded-[1.5rem]">
                <FileText className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-stone-950 sm:mt-5 sm:text-xl">
                {t("title")}
              </p>
              <p className="mt-1.5 text-sm leading-6 text-stone-500 sm:mt-2">{t("inputPrompt")}</p>
              <div className="mt-3 flex items-center justify-center gap-2 rounded-full bg-stone-50 px-4 py-1.5 text-xs font-medium text-stone-500 sm:mt-5 sm:py-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                {t("welcomeHint")}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {allMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === MessageRole.user ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-[1.5rem] px-4 py-3 text-sm leading-6 shadow-sm ${
                    msg.role === MessageRole.user
                      ? "bg-stone-950 text-white"
                      : "border border-stone-200 bg-white text-stone-700"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {showStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-[1.5rem] border border-stone-200 bg-white px-4 py-3 text-sm leading-6 text-stone-700 shadow-sm">
                  {conversation.streamingText}
                  <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-stone-400 align-middle" />
                </div>
              </div>
            )}
          </div>
        )}

        {showSpinner && (
          <div className="mt-4 flex justify-start">
            <div className="max-w-[85%] rounded-[1.5rem] border border-stone-200 bg-white px-4 py-3 shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-stone-500" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 bg-white/92 backdrop-blur">
        <InputBar
          mode={mode}
          input={input}
          hasMessages={allMessages.length > 0}
          isRecording={isRecording}
          isSending={conversation.isSending}
          interimText={interimText}
          dictationSupported={dictationSupported}
          dictationError={dictationError}
          onInputChange={setInput}
          onSend={handleSend}
          onStartVoice={() => {
            setMode("voice");
            startRecording(locale);
          }}
          onStopVoice={stopRecording}
          onStartRecording={() => startRecording(locale)}
          onSwitchToKeyboard={() => {
            if (isRecording) stopRecording();
            setMode("keyboard");
          }}
          onSwitchToVoice={() => {
            setMode("voice");
            startRecording(locale);
          }}
        />
      </div>
    </div>
  );
}
