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

  const showInitialPicker = mode === "initial" && !hasMessages;
  const showTextarea = (mode === "keyboard" && !isRecording) || (mode === "initial" && hasMessages);

  return (
    <div className="border-t border-stone-200/80 bg-white px-3 pb-[env(safe-area-inset-bottom,8px)] pt-3 sm:px-4 sm:pt-4">
      {showInitialPicker && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {dictationSupported && (
            <button
              type="button"
              onClick={onStartVoice}
              className="group flex w-full flex-col items-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#f59e0b_0%,#d97706_100%)] px-3 py-5 text-center text-white shadow-[0_16px_40px_rgba(245,158,11,0.3)] transition hover:brightness-105 sm:gap-4 sm:px-5 sm:py-7"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 sm:h-16 sm:w-16">
                <MicIcon className="h-6 w-6 sm:h-7 sm:w-7" />
              </span>
              <span>
                <span className="block text-base font-bold sm:text-lg">
                  {t("voicePrimary")}
                </span>
                <span className="mt-1 block text-[11px] leading-4 text-white/70 sm:text-sm">
                  {t("voicePrimaryHint")}
                </span>
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSwitchToKeyboard}
            className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-stone-200 bg-white px-3 py-5 text-center text-stone-700 shadow-sm transition hover:border-stone-300 hover:shadow-md sm:gap-4 sm:px-5 sm:py-7"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 sm:h-16 sm:w-16">
              <Keyboard className="h-6 w-6 text-stone-500 sm:h-7 sm:w-7" />
            </span>
            <span>
              <span className="block text-base font-bold sm:text-lg">
                {t("typePrimary")}
              </span>
              <span className="mt-1 block text-[11px] leading-4 text-stone-500 sm:text-sm">
                {t("typePrimaryHint")}
              </span>
            </span>
          </button>
        </div>
      )}

      {(mode === "voice" || isRecording) && (
        <div className="space-y-3">
          {(interimText || (input && mode === "voice")) && (
            <div className="rounded-2xl bg-stone-100 px-4 py-3">
              <p className="text-[15px] leading-relaxed text-stone-700">
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
                className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-red-500 py-3.5 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                <Square className="h-4 w-4 fill-current" />
                <span>{t("stopDictation")}</span>
                <VoiceBars />
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartRecording}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
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
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white transition hover:bg-stone-800 disabled:opacity-40"
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

      {showTextarea && (
        <div className="flex items-end gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-1.5 sm:p-2">
          <textarea
            ref={textareaRef}
            className="min-h-[44px] max-h-[120px] flex-1 resize-none rounded-xl border-0 bg-transparent px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-0"
            rows={1}
            placeholder={t("messagePlaceholder")}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {dictationSupported && !isRecording && (
            <button
              type="button"
              onClick={onSwitchToVoice}
              aria-label={t("startDictation")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-200 hover:text-stone-600"
            >
              <MicIcon className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            disabled={!hasInput || isSending}
            onClick={onSend}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-900 text-white transition hover:bg-stone-800 disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">{t("sendMessage")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
