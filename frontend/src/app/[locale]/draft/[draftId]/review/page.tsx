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

// ---------------------------------------------------------------------------
// Review Page
// ---------------------------------------------------------------------------

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
    <div className="min-h-screen bg-gray-50">
      <FlowHeader currentStep={1} draftId={draftId} title={t("title")} />

      <main
        id="main-content"
        className="mx-auto max-w-5xl space-y-8 px-4 pb-28 pt-8 md:pb-8"
      >
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
          <p className="mt-2 text-sm text-gray-500">{t("subtitle")}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-8">
            <LetterPreview draft={d} />
          </div>

          <aside className="space-y-6 lg:sticky lg:top-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                {t("checklist")}
              </h2>
              <ul role="list" className="divide-y divide-gray-100">
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

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
                {t("deliveryTypeLabel")}
              </h2>
              <DeliverySelector value={d.deliveryType} onChange={handleDeliveryChange} />
            </div>

            <PriceSummary deliveryType={d.deliveryType} subject={d.subject} />
          </aside>
        </div>

        <div className="hidden items-center justify-between gap-4 sm:flex">
          <Link
            href={`/draft/${draftId}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToEditing")}
          </Link>

          <div className="text-right">
            {!allComplete ? (
              <p className="mb-2 text-sm text-red-700">{t("requiredBeforeSending")}</p>
            ) : null}
            <button
              type="button"
              onClick={handleProceedToPayment}
              disabled={!allComplete || reviewDraft.isPending}
              aria-disabled={!allComplete || reviewDraft.isPending}
              className={`inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-semibold text-white transition ${
                allComplete
                  ? "bg-primary hover:bg-primary-dark disabled:opacity-60"
                  : "pointer-events-none bg-gray-300"
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
      </main>

      <div className="fixed inset-x-0 bottom-0 border-t border-gray-200 bg-white/95 p-4 backdrop-blur sm:hidden">
        {!allComplete ? (
          <p className="mb-3 text-sm text-red-700">{t("requiredBeforeSending")}</p>
        ) : null}
        <div className="flex items-center gap-3">
          <Link
            href={`/draft/${draftId}`}
            className="inline-flex h-12 items-center justify-center rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={handleProceedToPayment}
            disabled={!allComplete || reviewDraft.isPending}
            aria-disabled={!allComplete || reviewDraft.isPending}
            className={`flex-1 rounded-lg px-5 py-3 text-sm font-semibold text-white transition ${
              allComplete
                ? "bg-primary hover:bg-primary-dark disabled:opacity-60"
                : "pointer-events-none bg-gray-300"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              {reviewDraft.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {t("proceedToPayment")}
              <ChevronRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
