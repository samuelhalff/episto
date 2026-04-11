"use client";

import { ChevronDown } from "lucide-react";
import { memo } from "react";

interface RefinementMessage {
  id: string;
  role: string;
  content: string;
}

interface BodyRefinementThreadProps {
  isOpen: boolean;
  messages: RefinementMessage[];
  toggleLabel: string;
  historyLabel: string;
  appliedLabel: string;
  onToggle: () => void;
}

export const BodyRefinementThread = memo(function BodyRefinementThread({
  isOpen,
  messages,
  toggleLabel,
  historyLabel,
  appliedLabel,
  onToggle,
}: BodyRefinementThreadProps) {
  return (
    <div className="px-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 rounded-2xl px-2 py-1.5 text-[11px] font-semibold text-zinc-400 transition hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
        {toggleLabel}
      </button>

      {isOpen ? (
        <section className="mt-2 space-y-2 px-2" aria-label={historyLabel}>
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[min(88%,40rem)] rounded-2.5xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    isUser
                      ? "rounded-br-[8px] bg-zinc-900 text-white dark:bg-zinc-800"
                      : "rounded-bl-[8px] text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {isUser ? message.content : appliedLabel}
                </div>
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
});
