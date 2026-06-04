"use client";

import { AlertCircle, HelpCircle, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { DictationError } from "@/hooks/use-dictation";

export interface DictationErrorPanelProps {
  error: DictationError | null;
  onRetry: () => void;
  onDismissError: () => void;
}

const AUTO_DISMISS_MS = 5_000;

export function DictationErrorPanel({
  error,
  onRetry,
  onDismissError,
}: DictationErrorPanelProps) {
  const t = useTranslations("draft");
  const tc = useTranslations("common");
  const [helpOpenForError, setHelpOpenForError] = useState<DictationError | null>(null);
  const showPermissionHelp = helpOpenForError !== null && helpOpenForError === error;

  useEffect(() => {
    if (error !== "no_speech" && error !== "network") {
      return;
    }

    const timeoutId = window.setTimeout(onDismissError, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timeoutId);
  }, [error, onDismissError]);

  if (!error) {
    return null;
  }

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
