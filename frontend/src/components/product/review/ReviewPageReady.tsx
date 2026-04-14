"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { UseQueryResult } from "@tanstack/react-query";
import type { DraftLetter, DispatchQuote } from "@swiss-mail/shared";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { useUpdateDraft, useReviewDraft, useTransitionDraft } from "@/hooks/use-api";
import type { UseLetterPreviewReturn } from "@/hooks/use-letter-preview";
import type { FileAsset } from "@swiss-mail/shared";
import { useRouter } from "@/i18n/navigation";
import { FlowHeader } from "../FlowHeader";
import { FlowActionDock } from "../FlowActionDock";
import { LetterPreview } from "../LetterPreview";
import { PriceSummary } from "../PriceSummary";
import { ActionButton } from "../ActionButton";
import { DraftStepMenu } from "../DraftStepMenu";
import { StatusBadge } from "../../ui/status-badge";
import { ReviewSummaryCard, type ReviewSummaryItem } from "./ReviewSummaryCard";
import { useReviewPrimaryActionState } from "./review-action-state";
import { formatCentsAsCHF } from "@/hooks/use-pricing";
import { captureException } from "@/lib/error-tracking";
import { getApiErrorUserMessage } from "@/lib/api";
import {
  APP_PAGE_STACK_CLASS_NAME,
  APP_WIDE_PAGE_SHELL_CLASS_NAME,
} from "@/components/layout/page-spacing";
import { getCustomerFlowPath } from "@/lib/customer-flow";
import {
  getAddressLines,
  getSignatureFileUrl,
  hasConcreteSignature,
  normalizeLetterSubject,
} from "@/lib/letter-content";

interface ReviewPageReadyProps {
  draftId: string;
  draft: UseQueryResult<DraftLetter>;
  preview: UseLetterPreviewReturn;
  attachments: FileAsset[];
  quote: UseQueryResult<DispatchQuote>;
}

export function ReviewPageReady({
  draftId,
  draft,
  preview,
  attachments,
  quote,
}: ReviewPageReadyProps) {
  const t = useTranslations("review");
  const tc = useTranslations("common");
  const updateDraft = useUpdateDraft(draftId);
  const reviewDraft = useReviewDraft(draftId);
  const transitionDraft = useTransitionDraft(draftId);
  const router = useRouter();
  const [backError, setBackError] = useState<string | null>(null);
  const draftData = draft.data;
  const previewData = preview.previewData;
  const previewLocale = previewData?.locale ?? draftData?.locale ?? "de-CH";
  const normalizedDraftSubject = normalizeLetterSubject(
    draftData?.subject,
    draftData?.locale ?? previewLocale,
  );
  const displaySubject = normalizeLetterSubject(
    previewData?.subject ?? draftData?.subject,
    previewLocale,
  );
  const signatureMode = previewData?.signatureMode ?? draftData?.signatureMode ?? null;
  const signatureFileId =
    previewData?.signatureFileId ?? draftData?.signatureAssetId ?? null;
  const signatureUrl = getSignatureFileUrl(signatureFileId);
  const senderLines = getAddressLines(previewData?.sender, "sender");
  const recipientLines = getAddressLines(previewData?.recipient, "recipient");
  const attachmentCount = previewData?.attachmentCount ?? attachments.length;
  const displayDeliveryType =
    previewData?.deliveryType ?? draftData?.deliveryType ?? "standard";
  const displayBody = previewData?.body ?? draftData?.body ?? null;
  const displayEnclosureNote =
    previewData?.enclosureNote ?? draftData?.enclosureNote ?? null;
  const hasSender = senderLines.length > 0;
  const hasRecipient = recipientLines.length > 0;
  const hasBody = Boolean(displayBody?.trim());
  const hasSubject = Boolean(displaySubject);
  const hasAttachments = attachmentCount > 0;
  const hasSignature = hasConcreteSignature(signatureMode, signatureFileId);
  const allComplete = hasSender && hasRecipient && hasBody && hasSubject;
  const isRenderPending = draftData
    ? ["reviewed", "rendering"].includes(draftData.status)
    : false;
  const canRequestQuote = allComplete && !isRenderPending;
  const quoteErrorMessage = getApiErrorUserMessage(quote.error);

  const alreadyPrepared = draftData
    ? ["ready", "submitted", "dispatched", "closed"].includes(draftData.status)
    : false;
  const isSubmittingReview = reviewDraft.isPending || updateDraft.isPending;
  const reviewActionState = useReviewPrimaryActionState({
    allComplete,
    alreadyPrepared,
    hasQuote: Boolean(quote.data),
    hasQuoteError: quote.isError,
    isQuoteLoading: quote.isLoading,
    isSubmitting: isSubmittingReview,
    isRenderPending,
  });

  const reviewSummaryItems = useMemo<ReviewSummaryItem[]>(
    () => [
      {
        label: t("senderDetails"),
        value: senderLines,
        emptyLabel: preview.isLoading ? tc("loading") : t("requiredBeforeSending"),
      },
      {
        label: t("recipientDetails"),
        value: recipientLines,
        emptyLabel: preview.isLoading ? tc("loading") : t("requiredBeforeSending"),
      },
      {
        label: t("signature"),
        value: hasSignature
          ? signatureMode === "drawn"
            ? t("drawnSignature")
            : t("typedSignature")
          : t("noSignature"),
        helperText: !hasSignature ? t("signatureMissingHelp") : undefined,
      },
      {
        label: t("attachments"),
        value: hasAttachments
          ? t("attachmentCount", { count: attachmentCount })
          : t("noAttachments"),
        helperText: !hasAttachments ? t("attachmentsOptionalHelp") : undefined,
      },
    ],
    [
      attachmentCount,
      hasAttachments,
      hasSignature,
      preview.isLoading,
      recipientLines,
      senderLines,
      signatureMode,
      t,
      tc,
    ],
  );

  const previewDraft = useMemo(
    () =>
      draftData
        ? {
            ...draftData,
            locale: previewLocale,
            deliveryType: displayDeliveryType,
            subject: displaySubject,
            body: displayBody,
            enclosureNote: displayEnclosureNote,
            signatureMode,
            signatureAssetId: signatureFileId,
          }
        : null,
    [
      draftData,
      displayBody,
      displayDeliveryType,
      displayEnclosureNote,
      displaySubject,
      previewLocale,
      signatureFileId,
      signatureMode,
    ],
  );

  const desktopStepAction = useMemo(
    () =>
      draftData && !alreadyPrepared ? (
        <DraftStepMenu draftId={draftId} draft={draftData} triggerStyle="toolbar" />
      ) : null,
    [alreadyPrepared, draftData, draftId],
  );

  const handleProceedToPayment = useCallback(() => {
    if (!draftData || !reviewActionState.canProceed) return;

    if (alreadyPrepared) {
      router.push(`/draft/${draftId}/checkout`);
      return;
    }

    const reviewUpdates: {
      subject?: string;
      signatureMode?: "typed" | "drawn" | null;
      signatureAssetId?: string | null;
    } = {};

    if (normalizedDraftSubject && normalizedDraftSubject !== draftData.subject) {
      reviewUpdates.subject = normalizedDraftSubject;
    }

    if ((draftData.signatureMode ?? null) !== (signatureMode ?? null)) {
      reviewUpdates.signatureMode = signatureMode ?? null;
    }

    if ((draftData.signatureAssetId ?? null) !== (signatureFileId ?? null)) {
      reviewUpdates.signatureAssetId = signatureFileId ?? null;
    }

    const prepareDraft =
      Object.keys(reviewUpdates).length > 0
        ? updateDraft.mutateAsync(reviewUpdates)
        : Promise.resolve(draftData);

    void prepareDraft
      .then(() => reviewDraft.mutateAsync())
      .then(() => {
        router.push(`/draft/${draftId}/checkout`);
      })
      .catch((err: unknown) => {
        captureException(err instanceof Error ? err : new Error(String(err)), {
          component: "ReviewPageReady",
          route: `/draft/${draftId}/review`,
        });
      });
  }, [
    alreadyPrepared,
    draftData,
    draftId,
    normalizedDraftSubject,
    reviewActionState.canProceed,
    reviewDraft,
    router,
    signatureFileId,
    signatureMode,
    updateDraft,
  ]);

  const handleBackToDraft = useCallback(() => {
    if (!draftData || transitionDraft.isPending) return;
    setBackError(null);

    void transitionDraft
      .mutateAsync({ status: "collecting" })
      .then(() => {
        router.push(getCustomerFlowPath(draftId, "logistics"));
      })
      .catch((err: unknown) => {
        setBackError(getApiErrorUserMessage(err) ?? tc("error"));
        captureException(err instanceof Error ? err : new Error(String(err)), {
          component: "ReviewPageReady",
          route: `/draft/${draftId}/review`,
        });
      });
  }, [draftData, draftId, router, tc, transitionDraft]);

  if (!draftData || !previewDraft) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--app-surface-muted)] transition-colors">
      <FlowHeader
        currentStep={1}
        draftId={draftId}
        title={t("title")}
        headerAction={desktopStepAction}
      />

      <main
        id="main-content"
        className={[
          APP_WIDE_PAGE_SHELL_CLASS_NAME,
          APP_PAGE_STACK_CLASS_NAME,
          "pb-[calc(11rem+env(safe-area-inset-bottom))] lg:pb-[calc(12rem+env(safe-area-inset-bottom))]",
        ].join(" ")}
      >
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {t("finalCheck")}
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
            <section className="app-panel-muted rounded-[2rem] p-4 sm:p-5">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    {t("letterPreviewTitle")}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {t("letterPreviewBody")}
                  </p>
                </div>
                <StatusBadge tone="neutral">A4</StatusBadge>
              </div>

              <LetterPreview
                draft={previewDraft}
                senderProfile={previewData?.sender}
                recipientProfile={previewData?.recipient}
                signatureMode={hasSignature ? signatureMode : null}
                signatureUrl={hasSignature ? signatureUrl : null}
                showHeader={false}
              />
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28">
            <ReviewSummaryCard
              title={t("summaryTitle")}
              description={t("reviewReadOnly")}
              statusTone={
                isRenderPending ? "warning" : allComplete ? "success" : "warning"
              }
              statusLabel={
                isRenderPending
                  ? t("calculatingPrice")
                  : allComplete
                    ? t("readyToSend")
                    : t("needsAttention")
              }
              items={reviewSummaryItems}
            />

            <PriceSummary
              draftId={draftId}
              deliveryType={displayDeliveryType}
              subject={displaySubject}
              quoteEnabled={canRequestQuote}
              pendingLabel={
                allComplete ? t("pricingPending") : t("requiredBeforeSending")
              }
              loadingMessage={t("calculatingPriceDetail")}
            />

            {quoteErrorMessage ? (
              <p className="text-sm text-destructive">{quoteErrorMessage}</p>
            ) : null}
          </aside>
        </div>
      </main>

      {backError ? (
        <p className="px-4 pb-2 text-center text-sm text-destructive lg:text-right">
          {backError}
        </p>
      ) : null}

      <FlowActionDock
        desktopSticky
        secondaryAction={
          <ActionButton
            variant="secondary"
            onClick={handleBackToDraft}
            fullWidth
            desktopMinWidth
            loading={transitionDraft.isPending}
            disabled={transitionDraft.isPending}
            leadingIcon={<ArrowLeft className="h-4 w-4 shrink-0" />}
          >
            {t("backToDraft")}
          </ActionButton>
        }
        primaryAction={
          <>
            {!alreadyPrepared ? (
              <div className="lg:hidden">
                <DraftStepMenu draftId={draftId} draft={draftData} fullWidth />
              </div>
            ) : null}
            <ActionButton
              onClick={handleProceedToPayment}
              fullWidth
              desktopMinWidth
              contentClassName="w-full"
              disabled={reviewActionState.disabled}
              loading={reviewActionState.loading}
              trailingIcon={<ChevronRight className="h-4 w-4 shrink-0" />}
              trailingMeta={
                reviewActionState.showTrailingMeta && quote.data ? (
                  <span className="hidden rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--action-primary-fg)] sm:inline-flex">
                    {formatCentsAsCHF(quote.data.totalCents)}
                  </span>
                ) : null
              }
            >
              {t(reviewActionState.labelKey)}
            </ActionButton>
          </>
        }
      />
    </div>
  );
}
