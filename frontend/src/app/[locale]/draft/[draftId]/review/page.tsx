"use client";

import { use, useState } from "react";
import { useTranslations } from "next-intl";
import {
  useDraft,
  useUpdateDraft,
  useDraftFiles,
  useReviewDraft,
  useLetterPreview,
  useTransitionDraft,
} from "../../../../../hooks/use-api";
import { useRouter } from "../../../../../i18n/navigation";
import { ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { FlowHeader } from "../../../../../components/product/FlowHeader";
import { FlowActionDock } from "../../../../../components/product/FlowActionDock";
import { LetterPreview } from "../../../../../components/product/LetterPreview";
import { PriceSummary } from "../../../../../components/product/PriceSummary";
import { ActionButton } from "../../../../../components/product/ActionButton";
import { DeliveryTypeBadge } from "../../../../../components/product/DeliveryTypeBadge";
import { DraftStepMenu } from "../../../../../components/product/DraftStepMenu";
import { StatusBadge } from "../../../../../components/ui/status-badge";
import { useDispatchQuote } from "../../../../../hooks/use-dispatch-quote";
import { formatCentsAsCHF } from "../../../../../hooks/use-pricing";
import { captureError } from "../../../../../lib/error-tracking";
import { getApiErrorUserMessage } from "../../../../../lib/api";
import { getCustomerFlowPath } from "../../../../../lib/customer-flow";
import {
  getAddressLines,
  getSignatureFileUrl,
  hasConcreteSignature,
  normalizeLetterSubject,
} from "../../../../../lib/letter-content";

export default function ReviewPage({ params }: { params: Promise<{ draftId: string }> }) {
  const { draftId } = use(params);
  const t = useTranslations("review");
  const tc = useTranslations("common");
  const draft = useDraft(draftId);
  const updateDraft = useUpdateDraft(draftId);
  const reviewDraft = useReviewDraft(draftId);
  const transitionDraft = useTransitionDraft(draftId);
  const preview = useLetterPreview(draftId);
  const { attachments } = useDraftFiles(draftId);
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
  const allComplete =
    Boolean(draftData) && hasSender && hasRecipient && hasBody && hasSubject;
  const canRequestQuote =
    allComplete && !["reviewed", "rendering"].includes(draftData?.status ?? "");
  const quote = useDispatchQuote(draftId, canRequestQuote);
  const quoteErrorMessage = getApiErrorUserMessage(quote.error);

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
  const alreadyPrepared = [
    "reviewed",
    "rendering",
    "ready",
    "submitted",
    "dispatched",
  ].includes(d.status);
  const canProceedToPayment =
    allComplete &&
    canRequestQuote &&
    Boolean(quote.data) &&
    !quote.isLoading &&
    !quote.isError &&
    !reviewDraft.isPending &&
    !updateDraft.isPending;

  function handleProceedToPayment() {
    if (!canProceedToPayment) return;

    if (alreadyPrepared) {
      router.push(`/draft/${draftId}/checkout`);
      return;
    }

    const reviewUpdates: {
      subject?: string;
      signatureMode?: "typed" | "image" | null;
      signatureAssetId?: string | null;
    } = {};

    if (normalizedDraftSubject && normalizedDraftSubject !== d.subject) {
      reviewUpdates.subject = normalizedDraftSubject;
    }

    if ((d.signatureMode ?? null) !== (signatureMode ?? null)) {
      reviewUpdates.signatureMode = signatureMode ?? null;
    }

    if ((d.signatureAssetId ?? null) !== (signatureFileId ?? null)) {
      reviewUpdates.signatureAssetId = signatureFileId ?? null;
    }

    const prepareDraft =
      Object.keys(reviewUpdates).length > 0
        ? updateDraft.mutateAsync(reviewUpdates)
        : Promise.resolve(d);

    void prepareDraft
      .then(() => reviewDraft.mutateAsync())
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

  function handleBackToDraft() {
    if (transitionDraft.isPending) return;
    setBackError(null);

    void transitionDraft
      .mutateAsync({ status: "fields_complete" })
      .then(() => {
        router.push(getCustomerFlowPath(draftId, "logistics"));
      })
      .catch((err: unknown) => {
        setBackError(getApiErrorUserMessage(err) ?? tc("error"));
        captureError(err instanceof Error ? err : new Error(String(err)), {
          component: "ReviewPage",
          route: `/draft/${draftId}/review`,
        });
      });
  }

  return (
    <div className="min-h-screen bg-[var(--app-surface-muted)] transition-colors">
      <FlowHeader currentStep={1} draftId={draftId} title={t("title")} />

      <main
        id="main-content"
        className="mx-auto max-w-7xl space-y-8 px-4 pb-[calc(11rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 lg:pb-[calc(9rem+env(safe-area-inset-bottom))]"
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
                draft={{
                  ...d,
                  locale: previewLocale,
                  deliveryType: displayDeliveryType,
                  subject: displaySubject,
                  body: displayBody,
                  enclosureNote: displayEnclosureNote,
                  signatureMode,
                  signatureAssetId: signatureFileId,
                }}
                senderProfile={previewData?.sender}
                recipientProfile={previewData?.recipient}
                signatureMode={hasSignature ? signatureMode : null}
                signatureUrl={hasSignature ? signatureUrl : null}
                showHeader={false}
              />
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-28">
            <div className="app-panel rounded-3xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    {t("summaryTitle")}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                    {t("reviewReadOnly")}
                  </p>
                </div>
                <StatusBadge tone={allComplete ? "success" : "warning"}>
                  {allComplete ? t("readyToSend") : t("needsAttention")}
                </StatusBadge>
              </div>

              <div className="mt-6 space-y-4">
                <SummaryBlock
                  label={t("senderDetails")}
                  value={senderLines}
                  emptyLabel={
                    preview.isLoading ? tc("loading") : t("requiredBeforeSending")
                  }
                />
                <SummaryBlock
                  label={t("recipientDetails")}
                  value={recipientLines}
                  emptyLabel={
                    preview.isLoading ? tc("loading") : t("requiredBeforeSending")
                  }
                />
                <SummaryBlock
                  label={t("subjectLine")}
                  value={displaySubject ?? ""}
                  emptyLabel={t("requiredBeforeSending")}
                />
                <div className="app-list-item-muted rounded-2xl p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                    {t("deliveryTypeLabel")}
                  </p>
                  <div className="mt-2">
                    <DeliveryTypeBadge
                      deliveryType={displayDeliveryType}
                      label={
                        displayDeliveryType === "registered"
                          ? t("deliveryRegistered")
                          : t("deliveryStandard")
                      }
                    />
                  </div>
                </div>
                <SummaryBlock
                  label={t("signature")}
                  value={
                    hasSignature
                      ? signatureMode === "image"
                        ? t("uploadedSignature")
                        : t("typedSignature")
                      : t("noSignature")
                  }
                  helperText={!hasSignature ? t("signatureMissingHelp") : undefined}
                />
                <SummaryBlock
                  label={t("attachments")}
                  value={
                    hasAttachments
                      ? t("attachmentCount", { count: attachmentCount })
                      : t("noAttachments")
                  }
                  helperText={!hasAttachments ? t("attachmentsOptionalHelp") : undefined}
                />
              </div>
            </div>

            <PriceSummary
              draftId={draftId}
              deliveryType={displayDeliveryType}
              subject={displaySubject}
              quoteEnabled={canRequestQuote}
              pendingLabel={
                allComplete ? t("pricingPending") : t("requiredBeforeSending")
              }
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
        secondaryAction={
          <ActionButton
            variant="secondary"
            onClick={handleBackToDraft}
            fullWidth
            className="sm:w-auto"
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
              <DraftStepMenu
                draftId={draftId}
                draft={d}
                fullWidth
                buttonClassName="sm:w-auto"
              />
            ) : null}
            <ActionButton
              onClick={handleProceedToPayment}
              fullWidth
              className="sm:w-auto"
              disabled={!canProceedToPayment}
              loading={reviewDraft.isPending || updateDraft.isPending}
              trailingIcon={<ChevronRight className="h-4 w-4 shrink-0" />}
              trailingMeta={
                quote.data ? (
                  <span className="hidden rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--action-primary-fg)] sm:inline-flex">
                    {formatCentsAsCHF(quote.data.totalCents)}
                  </span>
                ) : null
              }
            >
              {t("proceedToPayment")}
            </ActionButton>
          </>
        }
      />
    </div>
  );
}

function SummaryBlock({
  label,
  value,
  helperText,
  emptyLabel,
}: {
  label: string;
  value: string | string[];
  helperText?: string | undefined;
  emptyLabel?: string | undefined;
}) {
  const values = Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
  const hasValue = values.length > 0;

  return (
    <div className="app-list-item-muted rounded-2xl p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
        {label}
      </p>
      <div className="mt-2 space-y-1">
        {hasValue ? (
          values.map((line, index) => (
            <p key={`${label}-${index}`} className="text-sm leading-6 text-zinc-900 dark:text-zinc-100">
              {line}
            </p>
          ))
        ) : (
          <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {emptyLabel ?? "—"}
          </p>
        )}
      </div>
      {helperText ? (
        <p className="mt-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
