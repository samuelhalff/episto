"use client";

import { AlertCircle, HelpCircle, Loader2, Square, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { DictationError } from "@/hooks/use-dictation";

export interface DictationPanelProps {
  isRecording: boolean;
  isProcessing: boolean;
  audioLevel: number;
  elapsedSeconds: number;
  maxCaptureSeconds: number;
  interimText: string;
  locale: string;
  error: DictationError | null;
  onStop: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onDismissError: () => void;
}

const BAR_COUNT = 28;
const AUTO_DISMISS_MS = 5_000;

function formatDuration(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function resolveLanguageKey(locale: string): string {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("de")) return "languageDeCH";
  if (normalized.startsWith("fr")) return "languageFrCH";
  if (normalized.startsWith("it")) return "languageItCH";
  return "languageEnCH";
}

function useBarHeights(level: number, active: boolean) {
  const [heights, setHeights] = useState<number[]>(() => new Array(BAR_COUNT).fill(0.08));
  const historyRef = useRef<number[]>(new Array(BAR_COUNT).fill(0.08));

  useEffect(() => {
    if (!active) {
      historyRef.current = new Array(BAR_COUNT).fill(0.08);
      setHeights(historyRef.current.slice());
      return;
    }

    const next = [...historyRef.current.slice(1), Math.max(0.08, Math.min(1, level))];
    historyRef.current = next;
    setHeights(next);
  }, [active, level]);

  return heights;
}

export function DictationPanel({
  isRecording,
  isProcessing,
  audioLevel,
  elapsedSeconds,
  maxCaptureSeconds,
  interimText,
  locale,
  error,
  onStop,
  onCancel,
  onRetry,
  onDismissError,
}: DictationPanelProps) {
  const t = useTranslations("draft");
  const tc = useTranslations("common");
  const [helpOpenForError, setHelpOpenForError] = useState<DictationError | null>(null);
  const showPermissionHelp = helpOpenForError !== null && helpOpenForError === error;

  const bars = useBarHeights(audioLevel, isRecording);
  const isVisible = isRecording || isProcessing || error !== null;

  useEffect(() => {
    if (error !== "no_speech" && error !== "network") {
      return;
    }

    const timeoutId = window.setTimeout(onDismissError, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeoutId);
  }, [error, onDismissError]);

  const language = useMemo(() => t(resolveLanguageKey(locale)), [locale, t]);
  const timerLabel = `${formatDuration(elapsedSeconds)} / ${formatDuration(maxCaptureSeconds)}`;
  const liveTranscriptText = interimText.trim();

  if (!isVisible) {
    return null;
  }

  if (error) {
    return (
      <section
        aria-live="assertive"
        role="alert"
        className="app-panel mx-auto mb-3 flex w-full max-w-3xl items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 shadow-sm dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-100"
      >
        <AlertCircle className="mt-0.5 h-5 w-5 flex-none" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-5">{resolveErrorCopy(t, error)}</p>
          {error === "permission_denied" && showPermissionHelp ? (
            <div className="mt-3 space-y-1 rounded-xl bg-white/70 p-3 text-[13px] leading-5 text-red-900 dark:bg-red-950/60 dark:text-red-50">
              <p className="font-semibold">{t("dictationPermissionHelpTitle")}</p>
              <p>{t("dictationPermissionHelpChrome")}</p>
              <p>{t("dictationPermissionHelpSafari")}</p>
              <p>{t("dictationPermissionHelpFirefox")}</p>
              <p>{t("dictationPermissionHelpEdge")}</p>
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {error === "permission_denied" ? (
              <button
                type="button"
                onClick={() =>
                  setHelpOpenForError((prev) => (prev === error ? null : error))
                }
                className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white/70 px-3 py-1 text-xs font-semibold text-red-800 transition-colors hover:bg-white dark:border-red-500/40 dark:bg-red-950/40 dark:text-red-50"
              >
                <HelpCircle className="h-3.5 w-3.5" aria-hidden />
                {t("dictationErrorPermissionHelp")}
              </button>
            ) : null}
            {error === "no_speech" ||
            error === "network" ||
            error === "permission_denied" ? (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700"
              >
                {t("dictationPanelRetry")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDismissError}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100 dark:text-red-100 dark:hover:bg-red-900/40"
            >
              {t("dictationPanelDismiss")}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismissError}
          aria-label={tc("close")}
          className="-m-1 rounded-full p-1 text-red-700 transition-colors hover:bg-red-100 dark:text-red-100 dark:hover:bg-red-900/40"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </section>
    );
  }

  const statusLabel = isProcessing
    ? t("dictationPanelTranscribing")
    : audioLevel < 0.05 && !liveTranscriptText
      ? t("dictationPanelWaiting")
      : t("dictationPanelListening", { language });

  return (
    <section
      aria-live="polite"
      aria-atomic="false"
      className="app-panel mx-auto mb-3 w-full max-w-3xl rounded-2xl border border-amber-200/70 p-4 shadow-lg shadow-amber-100/50 dark:border-amber-400/20 dark:shadow-none"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`relative inline-flex h-2.5 w-2.5 items-center justify-center ${
              isProcessing ? "" : "text-amber-600"
            }`}
            aria-hidden
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
            ) : (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              </>
            )}
          </span>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {statusLabel}
          </p>
        </div>
        <p
          className={`font-mono text-xs tabular-nums ${
            elapsedSeconds / maxCaptureSeconds > 0.85
              ? "text-amber-700 dark:text-amber-300"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
          aria-hidden
        >
          {timerLabel}
        </p>
      </div>

      <div
        className="mt-3 flex h-10 items-center gap-[3px] overflow-hidden rounded-xl bg-amber-50/70 px-3 dark:bg-amber-950/20"
        aria-hidden
      >
        {bars.map((heightRatio, index) => (
          <span
            key={index}
            className="w-[3px] flex-none rounded-full bg-amber-500/80 transition-[height] duration-150 ease-out dark:bg-amber-400/80"
            style={{ height: `${Math.round(heightRatio * 100)}%` }}
          />
        ))}
      </div>

      {liveTranscriptText ? (
        <p className="mt-3 max-h-24 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-[var(--app-surface-soft)] p-3 text-sm leading-6 text-zinc-800 dark:text-zinc-100">
          {liveTranscriptText}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isProcessing}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {t("dictationPanelCancel")}
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={isProcessing}
          aria-label={t("dictationPanelStop")}
          className="inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-amber-200 transition-all hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300 disabled:shadow-none dark:shadow-none"
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Square className="h-4 w-4 fill-current" aria-hidden />
          )}
          <span>{t("dictationPanelStop")}</span>
        </button>
      </div>
    </section>
  );
}

function resolveErrorCopy(
  t: ReturnType<typeof useTranslations>,
  error: DictationError,
): string {
  switch (error) {
    case "permission_denied":
      return t("dictationErrorPermissionDenied");
    case "not_supported":
      return t("dictationErrorNotSupported");
    case "no_speech":
      return t("dictationErrorNoSpeech");
    case "network":
      return t("dictationErrorNetwork");
    case "aborted":
      return t("dictationError");
  }
}
