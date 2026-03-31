"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import {
  useDraft,
  useUpdateDraft,
  useDraftFiles,
  useReviewDraft,
} from "../../../../../hooks/use-api";
import { Link, useRouter } from "../../../../../i18n/navigation";
import { ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { ChecklistItem } from "../../../../../components/product/ChecklistItem";
import { DeliverySelector } from "../../../../../components/product/DeliverySelector";
import { FlowHeader } from "../../../../../components/product/FlowHeader";
import { LetterPreview } from "../../../../../components/product/LetterPreview";
import { PriceSummary } from "../../../../../components/product/PriceSummary";
import { captureError } from "../../../../../lib/error-tracking";

export default function ReviewPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = use(params);
  const t = useTranslations("review");
  const tc = useTranslations("common");
  const draft = useDraft(draftId);
  const updateDraft = useUpdateDraft(draftId);
  const reviewDraft = useReviewDraft(draftId);
  const { attachments } = useDraftFiles(draftId);
  const router = useRouter();

  if (draft.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (draft.error || !draft.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">{tc("error")}</p>
      </div>
    );
  }

  const d = draft.data;

  const hasSender = Boolean(d.senderProfileId);
  const hasRecipient = Boolean(d.recipientProfileId);
  const hasBody = Boolean(d.body);
  const hasSubject = Boolean(d.subject);
  const hasAttachments = attachments.length > 0;
  const hasSignature = Boolean(d.signatureMode);
  const allComplete = hasSender && hasRecipient && hasBody && hasSubject;

  function handleDeliveryChange(type: string) {
    updateDraft.mutate({ deliveryType: type as "standard" | "registered" });
  }

  function handleProceedToPayment() {
    if (reviewDraft.isPending) return;

    const alreadyPrepared = [
      "reviewed",
      "rendering",
      "ready",
      "submitted",
      "dispatched",
    ].includes(d.status);
    if (alreadyPrepared) {
      router.push(`/draft/${draftId}/checkout`);
      return;
    }

    void reviewDraft
      .mutateAsync()
      .then(() => {
        router.push(`/draft/${draftId}/checkout`);
      })
      .catch((err: unknown) => {
        captureError(err instanceof Error ? err : new Error(String(err)), {
          component: "ReviewPage",
          route: `/draft/${draftId}/review`,
        });
      });
  }

  return (
    <div className="min-h-screen bg-[var(--app-surface-muted)] transition-colors dark:bg-zinc-950">
      <FlowHeader currentStep={1} draftId={draftId} title={t("title")} />

      <main
        id="main-content"
        className="mx-auto max-w-7xl space-y-8 px-4 pb-24 pt-8 sm:px-6 lg:pb-12"
      >
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {t("checklist")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500 dark:text-zinc-400 md:text-base">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-8">
            <LetterPreview draft={d} />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28">
            <div
              className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-900"
              style={{ outline: "1px solid var(--app-border)" }}
            >
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {t("checklist")}
              </h2>
              <ul role="list" className="divide-y divide-zinc-100 dark:divide-zinc-800">
                <ChecklistItem
                  label={t("senderDetails")}
                  tone={hasSender ? "complete" : "missing"}
                  helperText={!hasSender ? t("requiredBeforeSending") : undefined}
                  href={`/draft/${draftId}/sender`}
                  actionLabel={hasSender ? t("edit") : t("add")}
                />
                <ChecklistItem
                  label={t("recipientDetails")}
                  tone={hasRecipient ? "complete" : "missing"}
                  helperText={!hasRecipient ? t("requiredBeforeSending") : undefined}
                  href={`/draft/${draftId}/recipient`}
                  actionLabel={hasRecipient ? t("edit") : t("add")}
                />
                <ChecklistItem
                  label={t("letterBody")}
                  tone={hasBody ? "complete" : "missing"}
                  helperText={!hasBody ? t("requiredBeforeSending") : undefined}
                  href={`/draft/${draftId}/body`}
                  actionLabel={hasBody ? t("edit") : t("add")}
                />
                <ChecklistItem
                  label={t("subjectLine")}
                  tone={hasSubject ? "complete" : "missing"}
                  helperText={!hasSubject ? t("requiredBeforeSending") : undefined}
                  href={`/draft/${draftId}/subject`}
                  actionLabel={hasSubject ? t("edit") : t("add")}
                />
                <ChecklistItem
                  label={t("signature")}
                  tone={hasSignature ? "complete" : "warning"}
                  helperText={hasSignature ? undefined : t("signatureMissingHelp")}
                  href={`/draft/${draftId}/logistics`}
                  actionLabel={hasSignature ? t("edit") : t("add")}
                />
                <ChecklistItem
                  label={t("attachments")}
                  tone={hasAttachments ? "complete" : "optional"}
                  helperText={hasAttachments ? undefined : t("attachmentsOptionalHelp")}
                  href={`/draft/${draftId}/attachments`}
                  actionLabel={hasAttachments ? t("edit") : t("add")}
                />
              </ul>
            </div>

            <div
              className="rounded-3xl bg-white p-6 shadow-sm dark:bg-zinc-900"
              style={{ outline: "1px solid var(--app-border)" }}
            >
              <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {t("deliveryTypeLabel")}
              </h2>
              <DeliverySelector value={d.deliveryType} onChange={handleDeliveryChange} />
            </div>

            <PriceSummary deliveryType={d.deliveryType} subject={d.subject} />
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-[var(--app-surface-muted)]/95 p-4 shadow-[0_-1px_0_rgba(0,0,0,0.05)] backdrop-blur-md dark:bg-zinc-950/95 dark:shadow-[0_-1px_0_rgba(255,255,255,0.06)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {!allComplete ? (
              <p className="text-sm text-red-700">{t("requiredBeforeSending")}</p>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("subtitle")}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/draft/${draftId}`}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
              style={{ outline: "1px solid var(--app-border)" }}
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("backToEditing")}</span>
            </Link>
            <button
              type="button"
              onClick={handleProceedToPayment}
              disabled={!allComplete || reviewDraft.isPending}
              aria-disabled={!allComplete || reviewDraft.isPending}
              className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all active:scale-[0.98] ${
                allComplete
                  ? "bg-zinc-950 hover:bg-zinc-800 disabled:opacity-60 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
                  : "pointer-events-none bg-zinc-300 shadow-none dark:bg-zinc-700 dark:text-zinc-400"
              }`}
            >
              {reviewDraft.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {t("proceedToPayment")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
