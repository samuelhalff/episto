"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Send, Keyboard, Square } from "lucide-react";

// ---------------------------------------------------------------------------
// Input mode — user can switch between voice and keyboard
// ---------------------------------------------------------------------------

export type InputMode = "initial" | "voice" | "keyboard";

// ---------------------------------------------------------------------------
// Animated voice bars — visual feedback during recording
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Clean mic icon (replaces lucide Mic which user disliked)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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
    <div className="border-t bg-white">
      {/* ── Initial state: two clear input options ── */}
      {mode === "initial" && !hasMessages && (
        <div className="px-4 py-5 space-y-3">
          {dictationSupported && (
            <button
              type="button"
              onClick={onStartVoice}
              className="group flex w-full items-center gap-3 rounded-xl bg-primary px-5 py-4 text-left text-white transition hover:bg-primary-dark"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
                <MicIcon className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">
                  {t("voicePrimary")}
                </span>
                <span className="block text-xs text-white/60">
                  {t("voicePrimaryHint")}
                </span>
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSwitchToKeyboard}
            className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
              <Keyboard className="h-5 w-5 text-gray-500" />
            </span>
            <span>
              <span className="block text-sm font-medium">
                {t("typePrimary")}
              </span>
              <span className="block text-xs text-gray-400">
                {t("typePrimaryHint")}
              </span>
            </span>
          </button>
        </div>
      )}

      {/* ── Voice recording state ── */}
      {(mode === "voice" || isRecording) && (
        <div className="px-4 py-4 space-y-3">
          {(interimText || (input && mode === "voice")) && (
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-sm text-gray-600">
                {input}
                {interimText && (
                  <span className="text-gray-400">
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
                className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-red-500 py-3.5 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                <Square className="h-4 w-4 fill-current" />
                <span>{t("stopDictation")}</span>
                <VoiceBars />
              </button>
            ) : (
              <button
                type="button"
                onClick={onStartRecording}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
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
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary-dark disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSwitchToKeyboard}
            className="mx-auto flex items-center gap-1.5 text-xs text-gray-400 transition hover:text-gray-600"
          >
            <Keyboard className="h-3.5 w-3.5" />
            {t("switchToKeyboard")}
          </button>
        </div>
      )}

      {/* ── Keyboard input state ── */}
      {mode === "keyboard" && !isRecording && (
        <div className="px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition hover:border-primary hover:text-primary"
              >
                <MicIcon className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              disabled={!hasInput || isSending}
              onClick={onSend}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-dark disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">{t("sendMessage")}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Fallback: initial mode with existing messages ── */}
      {mode === "initial" && hasMessages && (
        <div className="px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
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
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition hover:border-primary hover:text-primary"
              >
                <MicIcon className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              disabled={!hasInput || isSending}
              onClick={onSend}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-dark disabled:opacity-40"
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
