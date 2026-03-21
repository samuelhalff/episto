"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { DraftLetter } from "@swiss-mail/shared";
import { useRouter } from "../../../../i18n/navigation.js";
import { routing } from "../../../../i18n/routing.js";
import { ApiError, apiFetch } from "../../../../lib/api.js";

type BootstrapState =
  | { kind: "loading" }
  | { kind: "error"; message: string };

function sortDraftsByActivity(drafts: DraftLetter[]): DraftLetter[] {
  return [...drafts].sort((left, right) => {
    const leftDate = new Date(left.updatedAt ?? left.createdAt).getTime();
    const rightDate = new Date(right.updatedAt ?? right.createdAt).getTime();
    return rightDate - leftDate;
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const body = error.body as
      | {
          error?: {
            userMessage?: string;
            userAction?: string | null;
            message?: string;
          };
        }
      | null;

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

/**
 * /draft/new — entry point that creates a session + draft, then redirects
 * to the draft workspace. This is the primary CTA destination.
 */
export default function NewDraftPage() {
  const t = useTranslations("common");
  const locale = useLocale();
  const sessionLocale = routing.locales.includes(
    locale as (typeof routing.locales)[number],
  )
    ? (locale as (typeof routing.locales)[number])
    : routing.defaultLocale;
  const router = useRouter();
  const [state, setState] = useState<BootstrapState>({ kind: "loading" });
  const runIdRef = useRef(0);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const runId = ++runIdRef.current;

    async function getLatestDraftId(): Promise<string | null> {
      const { drafts } = await apiFetch<{ drafts: DraftLetter[] }>("/v1/drafts");
      return sortDraftsByActivity(drafts)[0]?.id ?? null;
    }

    async function bootstrap() {
      try {
        setState({ kind: "loading" });

        try {
          await apiFetch("/v1/sessions/current");
          const existingDraftId = await getLatestDraftId();
          if (existingDraftId) {
            router.replace(`/draft/${existingDraftId}`);
            return;
          }
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 401) {
            throw error;
          }
        }

        try {
          await apiFetch("/v1/sessions", {
            method: "POST",
            body: JSON.stringify({ locale: sessionLocale }),
          });
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 429) {
            throw error;
          }

          const existingDraftId = await getLatestDraftId().catch(() => null);
          if (existingDraftId) {
            router.replace(`/draft/${existingDraftId}`);
            return;
          }

          throw error;
        }

        const { draft } = await apiFetch<{ draft: DraftLetter }>("/v1/drafts", {
          method: "POST",
          body: JSON.stringify({}),
        });
        router.replace(`/draft/${draft.id}`);
      } catch (error) {
        const existingDraftId = await getLatestDraftId().catch(() => null);
        if (existingDraftId) {
          router.replace(`/draft/${existingDraftId}`);
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
  }, [retryCount, router, sessionLocale]);

  if (state.kind === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-[2rem] border border-stone-200/80 bg-white/90 p-8 text-center shadow-[0_30px_90px_rgba(120,53,15,0.12)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
            {t("appName")}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-stone-950">
            {t("error")}
          </h1>
          <p className="mt-4 text-sm leading-6 text-stone-600">{state.message}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              className="cta-sheen inline-flex flex-1 items-center justify-center rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5 hover:bg-stone-800"
              onClick={() => {
                setState({ kind: "loading" });
                setRetryCount((count) => count + 1);
              }}
            >
              {t("tryAgain")}
            </button>
            <button
              type="button"
              className="inline-flex flex-1 items-center justify-center rounded-full border border-stone-300/80 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition-transform duration-300 hover:-translate-y-0.5 hover:border-amber-300 hover:text-stone-950"
              onClick={() => {
                router.replace("/");
              }}
            >
              {t("backToHome")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">{t("loading")}</p>
      </div>
    </div>
  );
}
