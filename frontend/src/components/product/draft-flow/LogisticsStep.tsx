"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Check, CheckCircle2, Loader2, Mail, Paperclip, Send } from "lucide-react";
import { SignatureAssuranceLevel } from "@episto/shared";
import type { SignatureAssuranceLevelValue } from "@episto/shared";
import {
  useDraft,
  useUpdateDraft,
  useDraftFiles,
  useReviewDraft,
  useLetterPreview,
} from "@/hooks/use-api";
import { usePricing } from "@/hooks/use-pricing";
import { useRouter } from "@/i18n/navigation";
import {
  normalizeLetterSubject,
  getRecipientDisplayName,
  getSenderDisplayName,
  getSignatureInlineUrl,
} from "@/lib/letter-content";
import {
  getPublicSignatureChoice,
  type PublicSignatureChoice,
  type SignatureMode,
} from "@/lib/signature-choice";
import { useTheme } from "@/lib/theme";
import { AttachmentUploader } from "../AttachmentUploader";
import { SignatureSection } from "../SignatureSection";
import { SignatureAssuranceTierPicker } from "../SignatureAssuranceTierPicker";
import { ActionCard, Card, DashedCard, DraftShell, PrimaryButton } from "./ui";
import { showStepErrorToast } from "./step-feedback";
import type { DraftWorkspaceStepShellProps } from "./step-props";
import { getLogisticsStepValidation } from "./step-validation";

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
  const [showAttachmentManager, setShowAttachmentManager] = useState(false);
  const [pendingDeliveryType, setPendingDeliveryType] = useState<
    "standard" | "registered" | null
  >(null);
  const deliveryType = draft.data?.deliveryType ?? "standard";
  const assuranceLevel = (draft.data?.signatureAssuranceLevel ??
    SignatureAssuranceLevel.visual) as SignatureAssuranceLevelValue;
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

  const attachmentCount = files.attachments.length;
  const registeredPrice = pricing.data?.registered?.displayPrice ?? t("priceUnavailable");
  const standardPrice = pricing.data?.standard?.displayPrice ?? t("priceUnavailable");
  const isDeliverySelectionPending = pendingDeliveryType !== null;

  const currentSignatureMode = (draft.data?.signatureMode ?? "drawn") as SignatureMode;
  const signatureFileId = files.signature?.id ?? null;
  const hasDrawnAsset = Boolean(signatureFileId);
  const signatureUrl = getSignatureInlineUrl(signatureFileId);
  const selectedSignatureChoice = getPublicSignatureChoice(
    assuranceLevel,
    currentSignatureMode,
  );
  const canProceed = getLogisticsStepValidation({
    hasSubject,
    hasBody,
    hasSender,
    hasRecipient,
    signatureMode: currentSignatureMode,
    signatureFileId,
  }).canProceed;

  useEffect(() => {
    if (attachmentCount > 0) {
      setShowAttachmentManager(true);
    }
  }, [attachmentCount]);

  const handleDrawnSignature = useCallback(
    async (blob: Blob) => {
      const file = new File([blob], "signature.png", { type: "image/png" });
      await files.uploadFile(file, "signature");
    },
    [files],
  );

  const handleSelectSignatureChoice = useCallback(
    (choice: PublicSignatureChoice) => {
      void updateDraft.mutateAsync({
        signatureAssuranceLevel: SignatureAssuranceLevel.visual,
        signatureFlowMode: "visual",
        signatureMode: choice,
        ...(choice === "typed" ? { signatureAssetId: null } : {}),
      });
    },
    [updateDraft],
  );

  const handleClearDrawn = useCallback(() => {
    if (files.signature) {
      void files.removeFile(files.signature.id);
    }
  }, [files]);

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
    if (
      !canProceed ||
      reviewDraft.isPending ||
      isNavigating ||
      isDeliverySelectionPending
    )
      return;
    try {
      const reviewUpdates: {
        subject?: string;
      } = {};

      if (normalizedSubject && normalizedSubject !== draft.data?.subject) {
        reviewUpdates.subject = normalizedSubject;
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
          disabled={!canProceed || reviewDraft.isPending || isDeliverySelectionPending}
          loading={
            reviewDraft.isPending || isDeliverySelectionPending || Boolean(isNavigating)
          }
          tone={canProceed ? "primary" : "warning"}
          hideIcon={!canProceed}
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
                  className={`shrink-0 whitespace-nowrap text-sm font-semibold ${
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
                  className={`shrink-0 whitespace-nowrap text-sm font-semibold ${
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
            <SignatureAssuranceTierPicker
              selectedChoice={selectedSignatureChoice}
              onChoiceChange={handleSelectSignatureChoice}
              isCompactViewport={isCompactViewport ?? false}
            >
              <SignatureSection
                signerName={signatureDisplayName}
                currentMode={currentSignatureMode}
                hasDrawnAsset={hasDrawnAsset}
                signatureUrl={signatureUrl}
                isUploading={files.isUploading}
                onDrawnSignature={handleDrawnSignature}
                onClearDrawn={handleClearDrawn}
              />
            </SignatureAssuranceTierPicker>
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
