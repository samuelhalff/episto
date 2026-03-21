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
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 sm:h-16 sm:w-16">
              <FileText className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <p className="mt-5 text-center text-xl font-semibold tracking-[-0.03em] text-stone-950 sm:text-2xl">
              {t("title")}
            </p>
            <p className="mt-2 max-w-xs text-center text-sm leading-relaxed text-stone-500 sm:max-w-sm sm:text-base">
              {t("inputPrompt")}
            </p>
            <div className="mt-4 hidden items-center gap-2 rounded-full bg-stone-100 px-4 py-2 text-xs font-medium text-stone-500 sm:inline-flex">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              {t("welcomeHint")}
            </div>
          </div>
        ) : (
          <div className="space-y-3 px-4 py-4 sm:px-5">
            {allMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === MessageRole.user ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                    msg.role === MessageRole.user
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-800"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {showStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl bg-stone-100 px-4 py-2.5 text-[15px] leading-relaxed text-stone-800">
                  {conversation.streamingText}
                  <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-stone-400 align-middle" />
                </div>
              </div>
            )}

            {showSpinner && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-stone-100 px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Pinned input area */}
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
  );
}
