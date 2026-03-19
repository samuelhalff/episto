"use client";

import { useRef, useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Mic, MicOff, Loader2, FileText } from "lucide-react";
import { queryKeys } from "@swiss-mail/shared";
import { useSendMessage } from "../../hooks/use-api.js";
import { useDraftStream } from "../../hooks/use-draft-stream.js";
import { useDictation } from "../../hooks/use-dictation.js";
import type { ConversationMessage } from "@swiss-mail/shared";
import { MessageRole } from "@swiss-mail/shared";

/**
 * Conversation panel — displays the AI/user message history,
 * streams AI token responses via SSE, and provides text input
 * with optional voice dictation.
 */
export function ConversationPanel({
  messages,
  draftId,
  isLoading,
}: {
  messages: ConversationMessage[];
  draftId: string;
  isLoading: boolean;
}) {
  const t = useTranslations("draft");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const sendMessage = useSendMessage(draftId);

  // SSE connection for real-time AI token streaming
  const { subscribe } = useDraftStream(draftId);

  // Dictation (Web Speech API)
  const {
    isSupported: dictationSupported,
    isRecording,
    interimText,
    finalText,
    startRecording,
    stopRecording,
    resetText,
  } = useDictation();

  // Subscribe to SSE events
  useEffect(() => {
    return subscribe((event) => {
      if (event.type === "ai_token") {
        setIsStreaming(true);
        setStreamingContent((prev) => prev + event.data.token);
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      } else if (event.type === "ai_message_complete") {
        setStreamingContent("");
        setIsStreaming(false);
        // Fetch the finalised message from the server
        void queryClient.invalidateQueries({
          queryKey: queryKeys.draftMessages(draftId),
        });
      }
    });
  }, [subscribe, draftId, queryClient]);

  // Append committed dictation text to the input field
  useEffect(() => {
    if (!finalText) return;
    setInput((prev) => (prev ? `${prev} ${finalText}` : finalText).trimStart());
    resetText();
  }, [finalText, resetText]);

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

  function handleMicToggle() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording(locale);
    }
  }

  const showStreaming = isStreaming && streamingContent.length > 0;
  const showSpinner = sendMessage.isPending && !isStreaming;

  return (
    <>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-navy" />
          </div>
        ) : messages.length === 0 && !showStreaming ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500">
            <FileText className="mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm">{t("title")}</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
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

            {/* Live streaming AI response */}
            {showStreaming && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl bg-gray-100 px-4 py-2.5 text-sm leading-relaxed text-gray-800">
                  {streamingContent}
                  {/* Blinking cursor */}
                  <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-gray-500 align-middle" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Thinking spinner (before first token arrives) */}
        {showSpinner && (
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
        {/* Interim dictation preview (greyed, not yet committed) */}
        {interimText && (
          <p className="mb-2 text-sm italic text-gray-400">{interimText}</p>
        )}

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

          {/* Mic button — only rendered when Web Speech API is available */}
          {dictationSupported && (
            <button
              type="button"
              onClick={handleMicToggle}
              aria-pressed={isRecording}
              aria-label={isRecording ? t("stopDictation") : t("startDictation")}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                isRecording
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "border border-gray-200 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
          )}

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
