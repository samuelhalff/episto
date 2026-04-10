"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCircle2, Loader2, Mail, Paperclip, Send } from "lucide-react";
import {
  useDraft,
  useUpdateDraft,
  useDraftFiles,
  useReviewDraft,
  useLetterPreview,
} from "../../../hooks/use-api";
import { usePricing } from "../../../hooks/use-pricing";
import { useRouter } from "../../../i18n/navigation";
import {
  normalizeLetterSubject,
  getRecipientDisplayName,
  getSenderDisplayName,
} from "../../../lib/letter-content";
import { useTheme } from "../../../lib/theme";
import { AttachmentUploader } from "../AttachmentUploader";
import { ActionCard, Card, DashedCard, DraftShell, PrimaryButton } from "./ui";
import { showStepErrorToast } from "./step-feedback";
import type { DraftWorkspaceStepShellProps } from "./step-props";

type StepProps = DraftWorkspaceStepShellProps;

export function LogisticsStep({
  draftId,
  onPrevious,
  onStepClick,
  isStepMenuOpen,
  isCompactViewport,
  isNavigating,
  beginNavigation,
  previousStepLabel,
}: StepProps) {
  const t = useTranslations("draft");
  const router = useRouter();
  const { theme } = useTheme();
  const draft = useDraft(draftId);
  const updateDraft = useUpdateDraft(draftId);
  const files = useDraftFiles(draftId);
  const reviewDraft = useReviewDraft(draftId);
  const preview = useLetterPreview(draftId);
  const pricing = usePricing();
  const signatureBootstrapRef = useRef(false);
  const [showAttachmentManager, setShowAttachmentManager] = useState(false);
  const [pendingDeliveryType, setPendingDeliveryType] = useState<
    "standard" | "registered" | null
  >(null);

  const deliveryType = draft.data?.deliveryType ?? "standard";
  const senderName = getSenderDisplayName(preview.previewData?.sender);
  const signatureDisplayName = senderName || t("signatureFallbackName");
  const recipientName = getRecipientDisplayName(preview.previewData?.recipient);
  const normalizedSubject = normalizeLetterSubject(
    draft.data?.subject,
    draft.data?.locale ?? preview.previewData?.locale ?? "de-CH",
  );
  const hasSubject = Boolean(draft.data?.subject?.trim());
  const hasBody = Boolean(draft.data?.body?.trim());
  const hasSender = Boolean(senderName.trim());
  const hasRecipient = Boolean(recipientName.trim());
  const canReview = hasSubject && hasBody && hasSender && hasRecipient;

  const attachmentCount = files.attachments.length;
  const registeredPrice = pricing.data?.registered?.displayPrice ?? t("priceUnavailable");
  const standardPrice = pricing.data?.standard?.displayPrice ?? t("priceUnavailable");
  const isDeliverySelectionPending = pendingDeliveryType !== null;

  useEffect(() => {
    if (attachmentCount > 0) {
      setShowAttachmentManager(true);
    }
  }, [attachmentCount]);

  useEffect(() => {
    if (signatureBootstrapRef.current || !draft.data) {
      return;
    }

    signatureBootstrapRef.current = true;
    if (draft.data.signatureMode === "typed" && draft.data.signatureAssetId === null) {
      return;
    }

    void updateDraft.mutateAsync({
      signatureMode: "typed",
      signatureAssetId: null,
    });
  }, [draft.data, updateDraft]);

  async function handleSelectDelivery(type: "standard" | "registered") {
    if (type === deliveryType || isDeliverySelectionPending) {
      return;
    }

    setPendingDeliveryType(type);
    try {
      await updateDraft.mutateAsync({ deliveryType: type });
    } finally {
      setPendingDeliveryType(null);
    }
  }

  async function handleReview() {
    if (reviewDraft.isPending || isNavigating || isDeliverySelectionPending) return;
    try {
      const reviewUpdates: {
        subject?: string;
        signatureMode?: "typed";
        signatureAssetId?: string | null;
      } = {};

      if (normalizedSubject && normalizedSubject !== draft.data?.subject) {
        reviewUpdates.subject = normalizedSubject;
      }

      if (draft.data?.signatureMode !== "typed") {
        reviewUpdates.signatureMode = "typed";
      }

      if ((draft.data?.signatureAssetId ?? null) !== null) {
        reviewUpdates.signatureAssetId = null;
      }

      if (Object.keys(reviewUpdates).length > 0) {
        await updateDraft.mutateAsync(reviewUpdates);
      }

      await reviewDraft.mutateAsync();
      beginNavigation?.();
      router.push(`/draft/${draftId}/review`);
    } catch {
      showStepErrorToast({
        id: "logistics-step-review-error",
        title: t("stepSaveFailed"),
      });
    }
  }

  const selectedDeliveryCardClass =
    "ring-amber-200 shadow-lg shadow-amber-200/40 dark:ring-amber-300/30 dark:shadow-none";
  const unselectedDeliveryCardClass =
    "bg-[var(--app-surface)] text-zinc-600 ring-[var(--app-border)] hover:bg-[var(--app-surface-strong)] hover:text-zinc-900 dark:text-[var(--app-muted-strong)] dark:hover:text-[var(--app-fg)]";
  const selectedDeliveryCardStyle =
    theme === "dark"
      ? {
          backgroundColor: "rgba(251, 191, 36, 0.16)",
          color: "rgb(255, 251, 235)",
        }
      : {
          backgroundColor: "rgba(255, 251, 235, 0.85)",
          color: "rgb(9, 9, 11)",
        };

  return (
    <DraftShell
      step={6}
      totalSteps={7}
      title={t("logisticsTitle")}
      subtitle={t("logisticsSubtitle")}
      onStepClick={onStepClick}
      stepTriggerLabel={t("stepMenuLabel")}
      secondaryActionLabel={previousStepLabel}
      onSecondaryAction={onPrevious}
      isStepMenuOpen={isStepMenuOpen}
      isCompactViewport={isCompactViewport}
      isNavigating={isNavigating}
      primaryAction={
        <PrimaryButton
          onClick={handleReview}
          disabled={!canReview || reviewDraft.isPending || isDeliverySelectionPending}
          loading={reviewDraft.isPending || isDeliverySelectionPending || Boolean(isNavigating)}
          tone={canReview ? "primary" : "warning"}
          hideIcon={!canReview}
        >
          {t("continueToReview")}
        </PrimaryButton>
      }
    >
      <div className="space-y-10 pb-4">
        <section className="space-y-5">
          <h3 className="px-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            {t("deliveryMethodLabel")}
          </h3>
          <div className="grid gap-3">
            <ActionCard
              onClick={() => void handleSelectDelivery("registered")}
              isCompactViewport={isCompactViewport}
              disabled={isDeliverySelectionPending}
              selected={deliveryType === "registered"}
              selectedClassName={selectedDeliveryCardClass}
              unselectedClassName={unselectedDeliveryCardClass}
              className="flex items-center justify-between"
              style={
                deliveryType === "registered" ? selectedDeliveryCardStyle : undefined
              }
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    deliveryType === "registered"
                      ? "bg-amber-100/70 text-amber-900 dark:bg-amber-400/22 dark:text-amber-100"
                      : "bg-[var(--app-surface-soft)] text-[var(--app-muted)] dark:text-[var(--app-muted-strong)]"
                  }`}
                >
                  <Mail className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold">{t("registeredMail")}</div>
                  <div
                    className={`mt-0.5 text-[10px] ${
                      deliveryType === "registered"
                        ? "text-amber-900/70 dark:text-amber-100/80"
                        : "text-zinc-400"
                    }`}
                  >
                    {t("registeredMailDesc")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                    deliveryType === "registered"
                      ? "border-emerald-400 bg-emerald-400"
                      : "border-zinc-300 bg-transparent dark:border-zinc-600"
                  }`}
                >
                  {pendingDeliveryType === "registered" ? (
                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                  ) : deliveryType === "registered" ? (
                    <Check className="h-3 w-3 text-white" />
                  ) : null}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    deliveryType === "registered"
                      ? "text-emerald-700 dark:text-amber-50"
                      : "text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {registeredPrice}
                </div>
              </div>
            </ActionCard>

            <ActionCard
              onClick={() => void handleSelectDelivery("standard")}
              isCompactViewport={isCompactViewport}
              disabled={isDeliverySelectionPending}
              selected={deliveryType === "standard"}
              selectedClassName={selectedDeliveryCardClass}
              unselectedClassName={unselectedDeliveryCardClass}
              className="flex items-center justify-between"
              style={deliveryType === "standard" ? selectedDeliveryCardStyle : undefined}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    deliveryType === "standard"
                      ? "bg-amber-100/70 text-amber-900 dark:bg-amber-400/22 dark:text-amber-100"
                      : "bg-[var(--app-surface-soft)] text-[var(--app-muted)] dark:text-[var(--app-muted-strong)]"
                  }`}
                >
                  <Send className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold">{t("standardMail")}</div>
                  <div
                    className={`mt-0.5 text-[10px] ${
                      deliveryType === "standard"
                        ? "text-amber-900/70 dark:text-amber-100/80"
                        : "text-zinc-400"
                    }`}
                  >
                    {t("standardMailDesc")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                    deliveryType === "standard"
                      ? "border-emerald-400 bg-emerald-400"
                      : "border-zinc-300 bg-transparent dark:border-zinc-600"
                  }`}
                >
                  {pendingDeliveryType === "standard" ? (
                    <Loader2 className="h-3 w-3 animate-spin text-white" />
                  ) : deliveryType === "standard" ? (
                    <Check className="h-3 w-3 text-white" />
                  ) : null}
                </div>
                <div
                  className={`text-sm font-semibold ${
                    deliveryType === "standard"
                      ? "text-emerald-700 dark:text-amber-50"
                      : "text-zinc-900 dark:text-zinc-100"
                  }`}
                >
                  {standardPrice}
                </div>
              </div>
            </ActionCard>
          </div>
        </section>

        <section className="space-y-5">
          <div
            className={
              isCompactViewport
                ? "flex items-center gap-4 px-2"
                : "sticky top-0 z-10 -mx-4 flex items-center gap-4 bg-[var(--app-surface-muted)] px-5 pb-3 pt-1 lg:-mx-6 lg:px-7"
            }
          >
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              {t("signatureLabel")}
            </h3>
          </div>

          <Card isCompactViewport={isCompactViewport} density="thin">
            <div className="rounded-[28px] border border-[var(--app-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,249,240,0.92)_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:bg-[linear-gradient(180deg,rgba(21,28,37,0.96)_0%,rgba(16,22,31,0.92)_100%)]">
              <p className="signature-script text-zinc-700 dark:text-zinc-100">
                {signatureDisplayName}
              </p>
              <p className="signature-name mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                {signatureDisplayName}
              </p>
            </div>
          </Card>
        </section>

        <section className="space-y-5">
          {attachmentCount > 0 ? (
            <div className="flex items-start justify-between gap-3 px-2">
              <div className="min-w-0">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                  {t("attachmentsLabel")}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {t("attachmentsLogisticsHint")}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {attachmentCount}
              </span>
            </div>
          ) : null}

          <DashedCard
            onClick={() => setShowAttachmentManager((value) => !value)}
            isCompactViewport={isCompactViewport}
            className="gap-2.5 text-sm font-semibold text-[var(--app-muted-strong)]"
          >
            <Paperclip className="h-5 w-5" />
            {showAttachmentManager
              ? t("hideAttachmentsManager")
              : attachmentCount > 0
                ? t("manageAttachments")
                : t("addAttachment")}
          </DashedCard>

          {showAttachmentManager ? (
            <Card isCompactViewport={isCompactViewport}>
              <AttachmentUploader
                attachments={files.attachments}
                attachmentConstraints={files.attachmentConstraints}
                isUploading={files.isUploading}
                removingFileId={files.removingFileId}
                uploadProgress={files.uploadProgress}
                validationError={files.validationError}
                onUpload={(file) =>
                  files.uploadFile(file, "attachment").then(() => undefined)
                }
                onRemove={files.removeFile}
                isCompactViewport={isCompactViewport}
              />
            </Card>
          ) : null}
        </section>
      </div>
    </DraftShell>
  );
}
