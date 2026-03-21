"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Send, Keyboard, Square } from "lucide-react";

export type InputMode = "initial" | "voice" | "keyboard";

function VoiceBars() {
  return (
    <div className="flex items-center justify-center gap-[3px]" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="inline-block w-[3px] rounded-full bg-white"
          style={{
            animation: `voice-bar 1s ease-in-out ${i * 0.12}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes voice-bar {
          0%, 100% { height: 8px; }
          50% { height: 20px; }
        }
      `}</style>
    </div>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

export interface InputBarProps {
  mode: InputMode;
  input: string;
  hasMessages: boolean;
  isRecording: boolean;
  isSending: boolean;
  interimText: string;
  dictationSupported: boolean;
  dictationError: string | null;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onStartRecording: () => void;
  onSwitchToKeyboard: () => void;
  onSwitchToVoice: () => void;
}

export function InputBar({
  mode,
  input,
  hasMessages,
  isRecording,
  isSending,
  interimText,
  dictationSupported,
  dictationError,
  onInputChange,
  onSend,
  onStartVoice,
  onStopVoice,
  onStartRecording,
  onSwitchToKeyboard,
  onSwitchToVoice,
}: InputBarProps) {
  const t = useTranslations("draft");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasInput = input.trim().length > 0;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  function handleSwitchToKeyboard() {
    onSwitchToKeyboard();
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  return (
    <div className="border-t border-stone-200/80 bg-white/95 px-3 py-3 backdrop-blur sm:px-5 sm:py-4">
      {mode === "initial" && !hasMessages && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {dictationSupported && (
            <button
              type="button"
              onClick={onStartVoice}
              className="group flex w-full items-center gap-2.5 rounded-[1.25rem] bg-primary px-3 py-3 text-left text-white shadow-[0_20px_45px_rgba(245,158,11,0.28)] transition hover:bg-primary-dark sm:gap-3 sm:rounded-[1.5rem] sm:px-4 sm:py-4"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/18 sm:h-11 sm:w-11">
                <MicIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold sm:text-base">
                  {t("voicePrimary")}
                </span>
                <span className="mt-0.5 hidden text-xs leading-5 text-white/75 sm:block sm:text-sm">
                  {t("voicePrimaryHint")}
                </span>
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSwitchToKeyboard}
            className="flex w-full items-center gap-2.5 rounded-[1.25rem] border border-stone-200 bg-stone-50/70 px-3 py-3 text-left text-stone-700 transition hover:border-stone-300 hover:bg-white sm:gap-3 sm:rounded-[1.5rem] sm:px-4 sm:py-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm sm:h-11 sm:w-11">
              <Keyboard className="h-4 w-4 text-stone-500 sm:h-5 sm:w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold sm:text-base">
                {t("typePrimary")}
              </span>
              <span className="mt-0.5 hidden text-xs leading-5 text-stone-500 sm:block sm:text-sm">
                {t("typePrimaryHint")}
              </span>
            </span>
          </button>
        </div>
      )}

      {(mode === "voice" || isRecording) && (
        <div className="space-y-3">
          {(interimText || (input && mode === "voice")) && (
            <div className="rounded-[1.25rem] border border-stone-200 bg-stone-50 px-4 py-3 shadow-sm">
              <p className="text-sm leading-6 text-stone-600">
                {input}
                {interimText && (
                  <span className="text-stone-400">
                    {input ? " " : ""}
                    {interimText}
                  </span>
                )}
              </p>
            </div>
          )}

          {dictationError && (
            <p className="text-xs text-red-500">{t("dictationError")}</p>
          )}

          <div className="flex items-center gap-3">
            {isRecording ? (
              <button
                type="button"
                onClick={onStopVoice}
                className="flex flex-1 items-center justify-center gap-3 rounded-[1.25rem] bg-red-500 py-3.5 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                <Square className="h-4 w-4 fill-current" />
                <span>{t("stopDictation")}</span>
                <VoiceBars />
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartRecording}
                className="flex flex-1 items-center justify-center gap-2 rounded-[1.25rem] bg-primary py-3.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                <MicIcon className="h-4 w-4" />
                <span>{t("startDictation")}</span>
              </button>
            )}

            {hasInput && (
              <button
                type="button"
                onClick={onSend}
                disabled={isSending}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-stone-950 text-white transition hover:bg-stone-800 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSwitchToKeyboard}
            className="mx-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
          >
            <Keyboard className="h-3.5 w-3.5" />
            {t("switchToKeyboard")}
          </button>
        </div>
      )}

      {mode === "keyboard" && !isRecording && (
        <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-2 shadow-sm">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              className="min-h-[48px] flex-1 resize-none rounded-[1.1rem] border-0 bg-transparent px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-0"
              rows={1}
              placeholder={t("messagePlaceholder")}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {dictationSupported && (
              <button
                type="button"
                onClick={onSwitchToVoice}
                aria-label={t("startDictation")}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:border-primary hover:text-primary"
              >
                <MicIcon className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              disabled={!hasInput || isSending}
              onClick={onSend}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-950 text-white transition hover:bg-stone-800 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">{t("sendMessage")}</span>
            </button>
          </div>
        </div>
      )}

      {mode === "initial" && hasMessages && (
        <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-2 shadow-sm">
          <div className="flex items-end gap-2">
            <textarea
              className="min-h-[48px] flex-1 resize-none rounded-[1.1rem] border-0 bg-transparent px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-0"
              rows={1}
              placeholder={t("messagePlaceholder")}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {dictationSupported && (
              <button
                type="button"
                onClick={onSwitchToVoice}
                aria-label={t("startDictation")}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 transition hover:border-primary hover:text-primary"
              >
                <MicIcon className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              disabled={!hasInput || isSending}
              onClick={onSend}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-stone-950 text-white transition hover:bg-stone-800 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">{t("sendMessage")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
