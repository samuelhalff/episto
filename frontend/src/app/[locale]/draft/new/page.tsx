"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  mergeDraftWorkspaceState,
  queryKeys,
  type DraftLetter,
  type Session,
} from "@episto/shared";
import { useLocale, useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics";
import { useSearchParams } from "next/navigation";

import { Logo } from "@/components/branding/Logo";
import { CustomerSiteMenu } from "@/components/layout/CustomerSiteMenu";
import { HeaderLanguageMenu } from "@/components/layout/HeaderLanguageMenu";
import { ActionButton, ActionLink } from "@/components/product/ActionButton";
import { ConfirmDialog } from "@/components/product/ConfirmDialog";
import { Link, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { ApiError, apiFetch } from "@/lib/api";
import { findRecoverableDraft, shouldForceFreshEntry } from "@/lib/new-draft-entry";
import { isDraftTemplateSlug } from "@/lib/landing-routes";
import { getDraftStarter } from "@/lib/landing-starters";

type BootstrapState =
  | { kind: "loading" }
  | { kind: "ready"; hasActiveSession: boolean }
  | { kind: "resume"; draft: DraftLetter }
  | { kind: "error"; message: string };

type PendingStartAction = "resume" | "fresh" | null;

interface UseCasePromptConfig {
  slug: string;
  aliases: string[];
  prompt: string;
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
    createdAt:
      draft.createdAt instanceof Date ? draft.createdAt : new Date(draft.createdAt),
    updatedAt:
      draft.updatedAt instanceof Date ? draft.updatedAt : new Date(draft.updatedAt),
  };
}

export default function NewDraftPage() {
  const tc = useTranslations("common");
  const tr = useTranslations("resume");
  const td = useTranslations("draft");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const sessionLocale = routing.locales.includes(
    locale as (typeof routing.locales)[number],
  )
    ? (locale as (typeof routing.locales)[number])
    : routing.defaultLocale;

  const [state, setState] = useState<BootstrapState>({ kind: "loading" });
  const [retryCount, setRetryCount] = useState(0);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [pendingStartAction, setPendingStartAction] = useState<PendingStartAction>(null);
  const [showConfirmFresh, setShowConfirmFresh] = useState(false);
  const runIdRef = useRef(0);
  const freshEntryStartedRef = useRef(false);
  const forceFreshEntry = shouldForceFreshEntry(searchParams);
  const isStartingDraft = pendingStartAction !== null;

  const suggestedPrompt = useMemo(() => {
    const requestedUseCase = searchParams.get("useCase");
    if (!requestedUseCase) {
      return null;
    }

    const prompts: UseCasePromptConfig[] = [
      {
        slug: "contract-termination",
        aliases: ["insurance-cancellation", "subscription-cancellation"],
        prompt: td("intakeQuickActionCancelPrompt"),
      },
      {
        slug: "lease-cancellation",
        aliases: [],
        prompt: td("intakeQuickActionLeasePrompt"),
      },
      {
        slug: "formal-complaint",
        aliases: [],
        prompt: td("intakeQuickActionComplaintPrompt"),
      },
      {
        slug: "official-correspondence",
        aliases: ["authority-letter"],
        prompt: td("intakeQuickActionAuthorityPrompt"),
      },
    ];

    const normalizedUseCase = requestedUseCase.trim().toLowerCase();
    const selectedPrompt = prompts.find(
      (item) =>
        item.slug === normalizedUseCase || item.aliases.includes(normalizedUseCase),
    );

    return selectedPrompt?.prompt ?? td("intakeQuickActionOtherPrompt");
  }, [searchParams, td]);

  // A ?template=<slug> from a landing template seeds the intake with that
  // template's topic (drafting templates only; service guides never seed).
  const templatePrompt = useMemo(() => {
    const slug = searchParams.get("template");
    if (!slug || !isDraftTemplateSlug(slug)) return null;
    return getDraftStarter(slug, sessionLocale);
  }, [searchParams, sessionLocale]);

  const seedPrompt = templatePrompt ?? suggestedPrompt;

  const startDraft = useCallback(
    async (options?: {
      forceNewSession?: boolean;
      pendingAction?: Exclude<PendingStartAction, null>;
      initialIntakeInput?: string;
    }) => {
      if (isStartingDraft) {
        return;
      }

      const forceNewSession = options?.forceNewSession ?? false;
      const nextPendingAction = options?.pendingAction ?? "fresh";
      const initialIntakeInput = options?.initialIntakeInput?.trim() ?? "";

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

        let seededDraft = normalizeDraft(draft);

        if (initialIntakeInput) {
          const { draft: updatedDraft } = await apiFetch<{ draft: DraftLetter }>(
            `/v1/drafts/${draft.id}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                metadata: mergeDraftWorkspaceState(seededDraft.metadata, {
                  intakeInput: initialIntakeInput,
                }),
              }),
            },
          );

          seededDraft = normalizeDraft(updatedDraft);
        }

        queryClient.setQueryData(queryKeys.draft(seededDraft.id), seededDraft);

        trackEvent({
          event: "draft_entry_started",
          locale: sessionLocale,
          source: "draft_new",
        });
        startTransition(() => {
          router.replace(`/draft/${seededDraft.id}`);
        });
      } catch (error) {
        if (!forceFreshEntry) {
          try {
            const { drafts } = await apiFetch<{ drafts: DraftLetter[] }>("/v1/drafts");
            const existingDraft = findRecoverableDraft(drafts);
            if (existingDraft) {
              setPendingStartAction(null);
              setState({ kind: "resume", draft: existingDraft });
              return;
            }
          } catch {
            // Ignore fallback lookup failures and show the original error.
          }
        }

        const message = getErrorMessage(error);
        if (state.kind === "resume") {
          setSubmissionError(message);
        } else {
          setState({ kind: "error", message });
        }
        setPendingStartAction(null);
      }
    },
    [forceFreshEntry, isStartingDraft, queryClient, router, sessionLocale, state],
  );

  useEffect(() => {
    const runId = ++runIdRef.current;
    freshEntryStartedRef.current = false;

    async function getRecoverableDraft(): Promise<DraftLetter | null> {
      try {
        const { drafts } = await apiFetch<{ drafts: DraftLetter[] }>("/v1/drafts");
        return findRecoverableDraft(drafts);
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
          const { session } = await apiFetch<{ session: Session }>(
            "/v1/sessions/current",
          );
          queryClient.setQueryData(queryKeys.session("current"), session);

          if (!forceFreshEntry) {
            const existingDraft = await getRecoverableDraft();
            if (existingDraft) {
              setState({ kind: "resume", draft: existingDraft });
              return;
            }
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
        if (!forceFreshEntry) {
          const existingDraft = await getRecoverableDraft().catch(() => null);
          if (existingDraft) {
            setState({ kind: "resume", draft: existingDraft });
            return;
          }
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
  }, [forceFreshEntry, queryClient, retryCount]);

  useEffect(() => {
    if (state.kind !== "ready" || freshEntryStartedRef.current) {
      return;
    }

    freshEntryStartedRef.current = true;
    const startOptions = seedPrompt ? { initialIntakeInput: seedPrompt } : {};

    void startDraft({
      forceNewSession: forceFreshEntry || !state.hasActiveSession,
      pendingAction: "fresh",
      ...startOptions,
    });
  }, [forceFreshEntry, startDraft, state, seedPrompt]);

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
            <p className="text-xs font-semibold tracking-normal text-zinc-400 dark:text-zinc-500">
              {tc("appName")}
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">
              {tr("unfinishedTitle")}
            </h1>
            <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {tr("unfinishedBody")}
            </p>
            <p className="mt-3 text-xs font-medium tracking-normal text-zinc-400 dark:text-zinc-500">
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
                const startOptions = seedPrompt ? { initialIntakeInput: seedPrompt } : {};

                void startDraft({
                  forceNewSession: true,
                  pendingAction: "fresh",
                  ...startOptions,
                });
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
            <p className="text-xs font-semibold tracking-normal text-zinc-400 dark:text-zinc-500">
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
                  freshEntryStartedRef.current = false;
                  setState({ kind: "loading" });
                  setRetryCount((count) => count + 1);
                }}
              >
                {tc("tryAgain")}
              </ActionButton>
              <ActionLink href="/" variant="secondary" fullWidth className="sm:flex-1">
                {tc("backToHome")}
              </ActionLink>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-surface-muted)] transition-colors">
      <EntryHeader />

      <main className="flex min-h-[calc(100vh-73px)] items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg rounded-4xl border border-zinc-200/80 bg-white/90 p-8 text-center shadow-prominent-warm dark:border-zinc-800 dark:bg-zinc-900/90">
          <p className="text-xs font-semibold tracking-normal text-zinc-400 dark:text-zinc-500">
            {tc("appName")}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">
            {td("entryTitle")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {td("entrySubtitle")}
          </p>
          <div className="mx-auto mt-8 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            {pendingStartAction === "fresh" ? tc("loading") : tc("loading")}
          </p>
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
          <Logo iconClassName="h-10 w-10" wordmarkClassName="truncate text-base" />
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
