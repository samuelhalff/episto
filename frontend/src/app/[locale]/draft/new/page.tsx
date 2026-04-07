"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import type { ConversationMessage, DraftLetter, Session } from "@swiss-mail/shared";
import { queryKeys } from "@swiss-mail/shared";
import {
  Building2,
  FileWarning,
  Home,
  Loader2,
  Mic,
  Send,
  Square,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { Link, useRouter } from "../../../../i18n/navigation";
import { routing } from "../../../../i18n/routing";
import { ConfirmDialog } from "../../../../components/product/ConfirmDialog";
import { CustomerSiteMenu } from "../../../../components/layout/CustomerSiteMenu";
import { HeaderLanguageMenu } from "../../../../components/layout/HeaderLanguageMenu";
import { AppButton } from "../../../../components/ui/app-button";
import { useDictation } from "../../../../hooks/use-dictation";
import { ApiError, apiFetch } from "../../../../lib/api";
import { ActionButton, ActionLink } from "../../../../components/product/ActionButton";
import { primePendingDraftTurn } from "../../../../lib/pending-draft-turn";

type BootstrapState =
  | { kind: "loading" }
  | { kind: "ready"; hasActiveSession: boolean }
  | { kind: "resume"; draft: DraftLetter }
  | { kind: "error"; message: string };

type QuickStartConfig = {
  slug: string;
  aliases: string[];
  label: string;
  prompt: string;
  icon: LucideIcon;
};

type ConversationMessagePayload = Omit<ConversationMessage, "createdAt"> & {
  createdAt: string | Date;
};

type PendingStartAction =
  | "resume"
  | "fresh"
  | "composer"
  | `quick-start:${string}`
  | null;

function sortDraftsByActivity(drafts: DraftLetter[]): DraftLetter[] {
  return [...drafts].sort((left, right) => {
    const leftDate = new Date(left.updatedAt ?? left.createdAt).getTime();
    const rightDate = new Date(right.updatedAt ?? right.createdAt).getTime();
    return rightDate - leftDate;
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as {
      error?: {
        userMessage?: string;
        userAction?: string | null;
        message?: string;
      };
    } | null;

    const detail =
      body?.error?.userMessage ??
      body?.error?.message ??
      (error.status === 429
        ? "Too many attempts were made from this connection. Please wait a moment and try again."
        : null);

    if (body?.error?.userAction) {
      return detail ? `${detail} ${body.error.userAction}` : body.error.userAction;
    }

    if (detail) {
      return detail;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "We could not open your letter workspace. Please try again.";
}

function normalizeDraft(draft: DraftLetter): DraftLetter {
  return {
    ...draft,
    createdAt: draft.createdAt instanceof Date ? draft.createdAt : new Date(draft.createdAt),
    updatedAt: draft.updatedAt instanceof Date ? draft.updatedAt : new Date(draft.updatedAt),
  };
}

function getQuickStartAction(slug: string): `quick-start:${string}` {
  return `quick-start:${slug}`;
}

export default function NewDraftPage() {
  const tc = useTranslations("common");
  const tr = useTranslations("resume");
  const td = useTranslations("draft");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const dictation = useDictation();
  const sessionLocale = routing.locales.includes(
    locale as (typeof routing.locales)[number],
  )
    ? (locale as (typeof routing.locales)[number])
    : routing.defaultLocale;

  const [state, setState] = useState<BootstrapState>({ kind: "loading" });
  const [retryCount, setRetryCount] = useState(0);
  const [composerValue, setComposerValue] = useState("");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [pendingStartAction, setPendingStartAction] = useState<PendingStartAction>(null);
  const [showConfirmFresh, setShowConfirmFresh] = useState(false);
  const runIdRef = useRef(0);
  const useCasePrefillAppliedRef = useRef(false);
  const isStartingDraft = pendingStartAction !== null;

  const quickStarts = useMemo<QuickStartConfig[]>(
    () => [
      {
        slug: "contract-termination",
        aliases: ["insurance-cancellation", "subscription-cancellation"],
        label: td("intakeQuickActionCancel"),
        prompt: td("intakeQuickActionCancelPrompt"),
        icon: XCircle,
      },
      {
        slug: "lease-cancellation",
        aliases: [],
        label: td("intakeQuickActionLease"),
        prompt: td("intakeQuickActionLeasePrompt"),
        icon: Home,
      },
      {
        slug: "formal-complaint",
        aliases: [],
        label: td("intakeQuickActionComplaint"),
        prompt: td("intakeQuickActionComplaintPrompt"),
        icon: FileWarning,
      },
      {
        slug: "official-correspondence",
        aliases: ["authority-letter"],
        label: td("intakeQuickActionAuthority"),
        prompt: td("intakeQuickActionAuthorityPrompt"),
        icon: Building2,
      },
    ],
    [td],
  );

  const requestedUseCase = searchParams.get("useCase");
  const suggestedPrompt = useMemo(() => {
    if (!requestedUseCase) {
      return null;
    }

    const normalizedUseCase = requestedUseCase.trim().toLowerCase();
    const quickStart = quickStarts.find(
      (item) =>
        item.slug === normalizedUseCase || item.aliases.includes(normalizedUseCase),
    );

    return quickStart?.prompt ?? td("intakeQuickActionOtherPrompt");
  }, [quickStarts, requestedUseCase, td]);

  useEffect(() => {
    if (!suggestedPrompt || useCasePrefillAppliedRef.current) {
      return;
    }

    setComposerValue((current) => current || suggestedPrompt);
    useCasePrefillAppliedRef.current = true;
  }, [suggestedPrompt]);

  useEffect(() => {
    const spokenText = dictation.finalText.trim();
    if (!spokenText) {
      return;
    }

    setComposerValue(
      (current) => `${current.trim()}${current.trim() ? " " : ""}${spokenText}`,
    );
    dictation.resetText();
  }, [dictation.finalText, dictation.resetText]);

  useEffect(() => {
    const runId = ++runIdRef.current;

    async function getLatestDraft(): Promise<DraftLetter | null> {
      try {
        const { drafts } = await apiFetch<{ drafts: DraftLetter[] }>("/v1/drafts");
        return sortDraftsByActivity(drafts)[0] ?? null;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    }

    async function bootstrap() {
      try {
        setState({ kind: "loading" });

        try {
          const { session } = await apiFetch<{ session: Session }>("/v1/sessions/current");
          queryClient.setQueryData(queryKeys.session("current"), session);
          const existingDraft = await getLatestDraft();
          if (existingDraft) {
            setState({ kind: "resume", draft: existingDraft });
            return;
          }

          if (runId === runIdRef.current) {
            setState({ kind: "ready", hasActiveSession: true });
          }
          return;
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) {
            throw error;
          }
        }

        if (runId === runIdRef.current) {
          setState({ kind: "ready", hasActiveSession: false });
        }
      } catch (error) {
        const existingDraft = await getLatestDraft().catch(() => null);
        if (existingDraft) {
          setState({ kind: "resume", draft: existingDraft });
          return;
        }

        if (runId !== runIdRef.current) {
          return;
        }

        setState({
          kind: "error",
          message: getErrorMessage(error),
        });
      }
    }

    void bootstrap();
  }, [queryClient, retryCount]);

  async function startDraft(options?: {
    forceNewSession?: boolean;
    initialMessage?: string;
    pendingAction?: Exclude<PendingStartAction, null>;
  }) {
    if (isStartingDraft) {
      return;
    }

    const initialMessage = options?.initialMessage?.trim() ?? "";
    const forceNewSession = options?.forceNewSession ?? false;
    const nextPendingAction = options?.pendingAction ?? (initialMessage ? "composer" : "fresh");

    setSubmissionError(null);
    setPendingStartAction(nextPendingAction);

    try {
      const mustCreateSession =
        forceNewSession || (state.kind === "ready" && !state.hasActiveSession);

      if (mustCreateSession) {
        const { session } = await apiFetch<{ session: Session }>("/v1/sessions", {
          method: "POST",
          body: JSON.stringify({ locale: sessionLocale }),
        });
        queryClient.setQueryData(queryKeys.session("current"), session);

        if (state.kind === "ready") {
          setState({ kind: "ready", hasActiveSession: true });
        }
      }

      const { draft } = await apiFetch<{ draft: DraftLetter }>("/v1/drafts", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const seededDraft = normalizeDraft(draft);
      queryClient.setQueryData(queryKeys.draft(draft.id), seededDraft);

      if (initialMessage) {
        const response = await apiFetch<{ message: ConversationMessagePayload }>(
          `/v1/drafts/${draft.id}/messages`,
          {
            method: "POST",
            body: JSON.stringify({ content: initialMessage }),
          },
        );

        const seededMessage: ConversationMessage = {
          ...response.message,
          createdAt:
            response.message.createdAt instanceof Date
              ? response.message.createdAt
              : new Date(response.message.createdAt),
        };

        queryClient.setQueryData<ConversationMessage[]>(
          queryKeys.draftMessages(draft.id),
          [seededMessage],
        );
        primePendingDraftTurn({ draftId: draft.id, messageId: seededMessage.id });
      }

      startTransition(() => {
        router.replace(`/draft/${draft.id}`);
      });
    } catch (error) {
      try {
        const { drafts } = await apiFetch<{ drafts: DraftLetter[] }>("/v1/drafts");
        const existingDraft = sortDraftsByActivity(drafts)[0] ?? null;
        if (existingDraft) {
          setPendingStartAction(null);
          setState({ kind: "resume", draft: existingDraft });
          return;
        }
      } catch {
        // Ignore fallback lookup failures and show the original error.
      }

      setSubmissionError(getErrorMessage(error));
      setPendingStartAction(null);
    }
  }

  function handleEntrySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!composerValue.trim()) {
      return;
    }

    void startDraft({ initialMessage: composerValue });
  }

  if (state.kind === "resume") {
    const updatedAt = new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(state.draft.updatedAt ?? state.draft.createdAt));

    return (
      <div className="min-h-screen bg-[var(--app-surface-muted)] transition-colors">
        <EntryHeader />

        <main className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-10">
          <div className="w-full max-w-lg rounded-4xl border border-zinc-200/80 bg-white/90 p-8 text-center shadow-prominent-warm dark:border-zinc-800 dark:bg-zinc-900/90">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {tc("appName")}
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">
              {tr("unfinishedTitle")}
            </h1>
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {tr("unfinishedBody")}
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {tr("lastUpdated", { value: updatedAt })}
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <ActionButton
                fullWidth
                loading={pendingStartAction === "resume"}
                disabled={isStartingDraft}
                onClick={() => {
                  setPendingStartAction("resume");
                  startTransition(() => {
                    router.replace(`/draft/${state.draft.id}`);
                  });
                }}
              >
                {tr("continueDraft")}
              </ActionButton>
            </div>

            <button
              type="button"
              className="mt-4 text-sm text-zinc-500 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-zinc-200"
              disabled={isStartingDraft}
              onClick={() => setShowConfirmFresh(true)}
            >
              {tr("startFreshLink")}
            </button>

            {submissionError ? (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {submissionError}
              </p>
            ) : null}

            <ConfirmDialog
              open={showConfirmFresh}
              title={tr("startFreshConfirmTitle")}
              description={tr("startFreshConfirmBody")}
              confirmLabel={tc("startNewLetter")}
              cancelLabel={tc("cancel")}
              confirmLoading={pendingStartAction === "fresh"}
              onConfirm={() => {
                void startDraft({ forceNewSession: true, pendingAction: "fresh" });
              }}
              onCancel={() => {
                if (isStartingDraft) {
                  return;
                }
                setShowConfirmFresh(false);
              }}
              cancelDisabled={isStartingDraft}
            />
          </div>
        </main>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="min-h-screen bg-[var(--app-surface-muted)] transition-colors">
        <EntryHeader />

        <main className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-10">
          <div className="w-full max-w-md rounded-4xl border border-zinc-200/80 bg-white/90 p-8 text-center shadow-prominent-warm dark:border-zinc-800 dark:bg-zinc-900/90">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {tc("appName")}
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">
              {tc("error")}
            </h1>
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {state.message}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ActionButton
                className="sm:flex-1"
                onClick={() => {
                  setState({ kind: "loading" });
                  setRetryCount((count) => count + 1);
                }}
              >
                {tc("tryAgain")}
              </ActionButton>
              <ActionLink
                href="/"
                variant="secondary"
                fullWidth
                className="sm:flex-1"
              >
                {tc("backToHome")}
              </ActionLink>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (state.kind === "loading") {
    return (
      <div className="min-h-screen bg-[var(--app-surface-muted)] transition-colors">
        <EntryHeader />

        <main className="flex min-h-[calc(100vh-73px)] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              {tc("loading")}
            </p>
          </div>
        </main>
      </div>
    );
  }

  const helperText = dictation.error
    ? td("dictationError")
    : dictation.isRecording
      ? dictation.interimText || td("voicePrimaryHint")
      : null;

  return (
    <div className="min-h-screen bg-[var(--app-surface-muted)] transition-colors">
      <EntryHeader />

      <main
        id="main-content"
        className="mx-auto flex min-h-[calc(100vh-73px)] max-w-4xl items-center px-4 py-10 sm:px-6"
      >
        <div className="w-full rounded-[2rem] border border-zinc-200/80 bg-white/92 p-6 shadow-elevated dark:border-zinc-800 dark:bg-zinc-900/92 sm:p-8">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {tc("appName")}
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 sm:text-4xl">
              {td("entryTitle")}
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400 sm:text-base">
              {td("entrySubtitle")}
            </p>
          </div>

          <form onSubmit={handleEntrySubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="sr-only">{td("entryTitle")}</span>
              <textarea
                autoFocus
                rows={6}
                value={composerValue}
                onChange={(event) => {
                  setComposerValue(event.target.value);
                  setSubmissionError(null);
                }}
                placeholder={td("messagePlaceholder")}
                className="app-form-control w-full resize-none rounded-[1.75rem] border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-5 py-4 text-base leading-7 text-[var(--app-fg)] placeholder:text-[var(--app-muted)] focus:border-[var(--app-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--app-border)]"
              />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <AppButton
                  type="button"
                  size="md"
                  variant={dictation.isRecording ? "warning" : "secondary"}
                  leadingIcon={
                    dictation.isRecording ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )
                  }
                  onClick={() => {
                    if (dictation.isRecording) {
                      dictation.stopRecording();
                      return;
                    }

                    dictation.startRecording(locale);
                  }}
                >
                  {dictation.isRecording ? td("stopDictation") : td("startDictation")}
                </AppButton>
                {helperText ? (
                  <p className="text-sm text-[var(--app-muted)]">{helperText}</p>
                ) : null}
              </div>

              <ActionButton
                type="submit"
                loading={pendingStartAction === "composer"}
                disabled={!composerValue.trim() || isStartingDraft}
                leadingIcon={
                  pendingStartAction === "composer" ? null : <Send className="h-4 w-4" />
                }
              >
                {td("entryStart")}
              </ActionButton>
            </div>

            {submissionError ? (
              <p role="alert" className="text-sm text-destructive">
                {submissionError}
              </p>
            ) : null}
          </form>

          <div className="mt-8 border-t border-zinc-200/80 pt-8 dark:border-zinc-800">
            <div className="mb-4 flex items-center gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {td("entryCommonTypes")}
              </span>
              <div className="h-px flex-1 bg-zinc-200/80 dark:bg-zinc-800" />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {quickStarts.map((quickStart) => {
                const Icon = quickStart.icon;
                return (
                  <button
                    key={quickStart.slug}
                    type="button"
                    disabled={isStartingDraft}
                    onClick={() => {
                      setComposerValue(quickStart.prompt);
                      void startDraft({
                        initialMessage: quickStart.prompt,
                        pendingAction: getQuickStartAction(quickStart.slug),
                      });
                    }}
                    className="app-list-item group rounded-[1.5rem] px-5 py-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <div className="flex items-start gap-3">
                      <span className="app-field-surface inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[var(--app-muted-strong)]">
                        {pendingStartAction === getQuickStartAction(quickStart.slug) ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Icon className="h-5 w-5" />
                        )}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--app-fg)] transition-colors group-hover:text-[var(--app-fg)]">
                          {quickStart.label}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[var(--app-muted)]">
                          {quickStart.prompt}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              {td("entryAttachmentsHint")}
            </p>
            <p className="text-xs leading-5 text-zinc-400 dark:text-zinc-500">
              {td("entrySessionNotice")}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function EntryHeader() {
  const t = useTranslations("marketing");
  const tc = useTranslations("common");

  return (
    <header className="border-b border-[var(--app-border)] bg-[var(--app-surface-strong)] transition-colors">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex min-w-0 items-center gap-3 text-sm font-semibold tracking-tight text-[var(--app-fg)]"
        >
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--action-primary-bg)] text-xs font-semibold uppercase tracking-widest text-[var(--action-primary-fg)] shadow-sm">
            SM
          </span>
          <span className="truncate">{tc("appName")}</span>
        </Link>

        <div className="hidden items-center gap-2 sm:flex">
          <HeaderLanguageMenu />
          <CustomerSiteMenu title={tc("appName")} description={t("nav.writeLetter")} />
        </div>
        <div className="sm:hidden">
          <CustomerSiteMenu
            title={tc("appName")}
            description={t("nav.writeLetter")}
            isCompactViewport
          />
        </div>
      </div>
    </header>
  );
}
