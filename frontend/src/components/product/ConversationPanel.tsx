"use client";

import { useRef, useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, FileText } from "lucide-react";
import { useConversation } from "../../hooks/use-api.js";
import { useDictation } from "../../hooks/use-dictation.js";
import type { ConversationMessage } from "@swiss-mail/shared";
import { MessageRole } from "@swiss-mail/shared";
import { InputBar, type InputMode } from "./InputBar.js";

/**
 * Conversation panel — displays the AI/user message history,
 * streams AI token responses via SSE, and provides text input
 * with dictation-first voice input.
 *
 * Voice dictation is presented as the primary, most obvious input method.
 * Users can switch to typing at any time.
 */
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

  // Scroll down when streaming or messages change
  useEffect(() => {
    if (conversation.isStreaming || conversation.messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation.isStreaming, conversation.streamingText, conversation.messages.length]);

  // Append committed dictation text to the input field
  useEffect(() => {
    if (!finalText) return;
    setInput((prev) => (prev ? `${prev} ${finalText}` : finalText).trimStart());
    resetText();
  }, [finalText, resetText]);

  // Switch to keyboard mode once there are messages
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

  return (
    <>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-navy" />
          </div>
        ) : allMessages.length === 0 && !showStreaming ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-4 h-10 w-10 text-gray-300" />
            <p className="text-base font-medium text-gray-900">
              {t("title")}
            </p>
            <p className="mt-1.5 max-w-xs text-sm text-gray-500">
              {t("inputPrompt")}
            </p>
          </div>
        ) : (
          <>
            {allMessages.map((msg) => (
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
            ))}

            {showStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-2.5 text-sm leading-relaxed text-gray-800">
                  {conversation.streamingText}
                  <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-gray-500 align-middle" />
                </div>
              </div>
            )}
          </>
        )}

        {showSpinner && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar — dictation-first with keyboard fallback */}
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
    </>
  );
}
