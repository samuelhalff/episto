"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useDraft, useUpdateDraft, useDraftFiles, useReviewDraft } from "../../../../../hooks/use-api.js";
import { usePricing, formatCentsAsCHF } from "../../../../../hooks/use-pricing.js";
import { Link, useRouter } from "../../../../../i18n/navigation.js";
import { ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { DeliveryType } from "@swiss-mail/shared";
import { ChecklistItem } from "../../../../../components/product/ChecklistItem.js";
import { DeliverySelector } from "../../../../../components/product/DeliverySelector.js";
import { LetterPreview } from "../../../../../components/product/LetterPreview.js";
import { captureError } from "../../../../../lib/error-tracking.js";

// ---------------------------------------------------------------------------
// Review Page
// ---------------------------------------------------------------------------

export default function ReviewPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = use(params);
  const t = useTranslations("review");
  const tc = useTranslations("common");
  const draft = useDraft(draftId);
  const updateDraft = useUpdateDraft(draftId);
  const reviewDraft = useReviewDraft(draftId);
  const { attachments } = useDraftFiles(draftId);
  const pricing = usePricing();
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
  const allComplete = hasSender && hasRecipient && hasBody && hasSubject;

  // Compute display price from backend pricing
  const isRegistered = d.deliveryType === DeliveryType.registered;
  const totalDisplay = pricing.data
    ? isRegistered
      ? pricing.data.registered.displayPrice
      : pricing.data.standard.displayPrice
    : formatCentsAsCHF(isRegistered ? 890 : 490);

  function handleDeliveryChange(type: string) {
    updateDraft.mutate({ deliveryType: type as "standard" | "registered" });
  }

  function handleProceedToPayment() {
    if (reviewDraft.isPending) return;

    const alreadyPrepared = ["reviewed", "rendering", "ready", "submitted", "dispatched"].includes(
      d.status,
    );
    if (alreadyPrepared) {
      router.push(`/draft/${draftId}/checkout`);
      return;
    }

    void reviewDraft.mutateAsync().then(() => {
      router.push(`/draft/${draftId}/checkout`);
    }).catch((err: unknown) => {
      captureError(err instanceof Error ? err : new Error(String(err)), { component: "ReviewPage", route: `/draft/${draftId}/review` });
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="font-bold text-gray-900">
            {tc("appName")}
          </Link>
          <span className="text-sm font-medium text-gray-900">{t("title")}</span>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        {/* Subtitle */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
        </div>

        {/* Letter preview */}
        <LetterPreview draft={d} />

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Completion checklist */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-900">
              {t("checklist")}
            </h2>
            <ul className="divide-y divide-gray-100">
              <ChecklistItem label={t("senderDetails")} complete={hasSender} />
              <ChecklistItem
                label={t("recipientDetails")}
                complete={hasRecipient}
              />
              <ChecklistItem label={t("letterBody")} complete={hasBody} />
              <ChecklistItem label={t("subjectLine")} complete={hasSubject} />
              <ChecklistItem
                label={t("signature")}
                complete={Boolean(d.signatureMode)}
              />
              <ChecklistItem label={t("attachments")} complete={hasAttachments} />
            </ul>
          </div>

          {/* Delivery + pricing */}
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <DeliverySelector
                value={d.deliveryType}
                onChange={handleDeliveryChange}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-6 py-4 text-sm">
              <span className="font-medium text-gray-700">{t("total")}</span>
              <span className="text-lg font-bold text-gray-900">
                {totalDisplay}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <Link
            href={`/draft/${draftId}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToEditing")}
          </Link>

          <button
            type="button"
            onClick={handleProceedToPayment}
            disabled={!allComplete || reviewDraft.isPending}
            className={`inline-flex items-center gap-2 rounded-lg px-8 py-3 text-sm font-semibold text-white transition ${
              allComplete
                ? "bg-primary hover:bg-primary-dark disabled:opacity-60"
                : "pointer-events-none bg-gray-300"
            }`}
          >
            {reviewDraft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("proceedToPayment")}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </main>
    </div>
  );
}
