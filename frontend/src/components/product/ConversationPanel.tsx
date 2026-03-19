"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Send, FileText, Loader2 } from "lucide-react";
import { useSendMessage } from "../../hooks/use-api.js";
import type { ConversationMessage } from "@swiss-mail/shared";
import { MessageRole } from "@swiss-mail/shared";

/**
 * Conversation panel — displays the AI/user message history
 * and provides a text input for sending new messages.
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
