"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import {
  useDraft,
  useUpdateDraft,
  useDraftFiles,
  useReviewDraft,
} from "../../../../../hooks/use-api.js";
import { Link, useRouter } from "../../../../../i18n/navigation.js";
import { ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { ChecklistItem } from "../../../../../components/product/ChecklistItem.js";
import { DeliverySelector } from "../../../../../components/product/DeliverySelector.js";
import { FlowHeader } from "../../../../../components/product/FlowHeader.js";
import { LetterPreview } from "../../../../../components/product/LetterPreview.js";
import { PriceSummary } from "../../../../../components/product/PriceSummary.js";
import { captureError } from "../../../../../lib/error-tracking.js";

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
        <p className="text-gray-500">{tc("error")}</p>
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf4_0%,#ffffff_28%)]">
      <FlowHeader currentStep={1} draftId={draftId} title={t("title")} />

      <main
        id="main-content"
        className="mx-auto max-w-7xl space-y-8 px-4 pb-24 pt-8 sm:px-6 lg:pb-12"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
            {t("checklist")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-stone-950 md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-500 md:text-base">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-8">
            <LetterPreview draft={d} />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28">
            <div className="rounded-[2rem] border border-stone-200/80 bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                {t("checklist")}
              </h2>
              <ul role="list" className="divide-y divide-stone-100">
                <ChecklistItem
                  label={t("senderDetails")}
                  tone={hasSender ? "complete" : "missing"}
                  helperText={!hasSender ? t("requiredBeforeSending") : undefined}
                  href={`/draft/${draftId}`}
                  actionLabel={hasSender ? t("edit") : t("add")}
                />
                <ChecklistItem
                  label={t("recipientDetails")}
                  tone={hasRecipient ? "complete" : "missing"}
                  helperText={!hasRecipient ? t("requiredBeforeSending") : undefined}
                  href={`/draft/${draftId}`}
                  actionLabel={hasRecipient ? t("edit") : t("add")}
                />
                <ChecklistItem
                  label={t("letterBody")}
                  tone={hasBody ? "complete" : "missing"}
                  helperText={!hasBody ? t("requiredBeforeSending") : undefined}
                  href={`/draft/${draftId}`}
                  actionLabel={hasBody ? t("edit") : t("add")}
                />
                <ChecklistItem
                  label={t("subjectLine")}
                  tone={hasSubject ? "complete" : "missing"}
                  helperText={!hasSubject ? t("requiredBeforeSending") : undefined}
                  href={`/draft/${draftId}`}
                  actionLabel={hasSubject ? t("edit") : t("add")}
                />
                <ChecklistItem
                  label={t("signature")}
                  tone={hasSignature ? "complete" : "warning"}
                  helperText={hasSignature ? undefined : t("signatureMissingHelp")}
                  href={`/draft/${draftId}`}
                  actionLabel={hasSignature ? t("edit") : t("add")}
                />
                <ChecklistItem
                  label={t("attachments")}
                  tone={hasAttachments ? "complete" : "optional"}
                  helperText={hasAttachments ? undefined : t("attachmentsOptionalHelp")}
                  href={`/draft/${draftId}`}
                  actionLabel={hasAttachments ? t("edit") : t("add")}
                />
              </ul>
            </div>

            <div className="rounded-[2rem] border border-stone-200/80 bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
                {t("deliveryTypeLabel")}
              </h2>
              <DeliverySelector value={d.deliveryType} onChange={handleDeliveryChange} />
            </div>

            <PriceSummary deliveryType={d.deliveryType} subject={d.subject} />
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200/80 bg-white/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {!allComplete ? (
              <p className="text-sm text-red-700">{t("requiredBeforeSending")}</p>
            ) : (
              <p className="text-sm text-stone-500">{t("subtitle")}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/draft/${draftId}`}
              className="inline-flex h-12 items-center justify-center rounded-full border border-stone-200 px-4 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{t("backToEditing")}</span>
            </Link>
            <button
              type="button"
              onClick={handleProceedToPayment}
              disabled={!allComplete || reviewDraft.isPending}
              aria-disabled={!allComplete || reviewDraft.isPending}
              className={`cta-sheen inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(120,53,15,0.18)] transition-all duration-300 ${
                allComplete
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:-translate-y-0.5 hover:from-amber-600 hover:to-amber-700 disabled:opacity-60"
                  : "pointer-events-none bg-stone-300 shadow-none"
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
