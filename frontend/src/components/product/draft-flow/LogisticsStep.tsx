"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Check,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Mail,
  Plus,
  Send,
  Type,
} from "lucide-react";
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
  getSignatureFileUrl,
} from "../../../lib/letter-content";
import { useTheme } from "../../../lib/theme";
import { AttachmentUploader } from "../AttachmentUploader";
import {
  ActionCard,
  Card,
  DashedCard,
  DraftShell,
  PrimaryButton,
  SegmentedControl,
} from "./ui";
import { showStepErrorToast, showStepWarningToast } from "./step-feedback";

interface StepProps {
  draftId: string;
  onPrevious?: (() => void) | undefined;
  onStepClick: () => void;
  isStepMenuOpen?: boolean;
  isCompactViewport?: boolean;
  isNavigating?: boolean;
  beginNavigation?: () => void;
  previousStepLabel?: string | undefined;
  furthestUnlockedStepIndex?: number;
}

export function LogisticsStep({
  draftId,
  onPrevious,
  onStepClick,
  isStepMenuOpen,
  isCompactViewport,
  isNavigating,
  beginNavigation,
  previousStepLabel,
  furthestUnlockedStepIndex,
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
  const sigInputRef = useRef<HTMLInputElement>(null);
  const signatureBootstrapRef = useRef(false);
  const [signatureMode, setSignatureMode] = useState<"typed" | "image">("typed");
  const [showAttachmentManager, setShowAttachmentManager] = useState(false);
  const [pendingDeliveryType, setPendingDeliveryType] = useState<"standard" | "registered" | null>(null);
  const [pendingSignatureMode, setPendingSignatureMode] = useState<"typed" | "image" | null>(null);
  const [pendingSignatureRemoval, setPendingSignatureRemoval] = useState(false);

  const deliveryType = draft.data?.deliveryType ?? "standard";
  const senderName = getSenderDisplayName(preview.previewData?.sender);
  const recipientName = getRecipientDisplayName(preview.previewData?.recipient);
  const normalizedSubject = normalizeLetterSubject(
    draft.data?.subject,
    draft.data?.locale ?? preview.previewData?.locale ?? "de-CH",
  );
  const signatureUrl = getSignatureFileUrl(
    files.signature?.id ?? draft.data?.signatureAssetId ?? null,
  );
  const hasSubject = Boolean(draft.data?.subject?.trim());
  const hasBody = Boolean(draft.data?.body?.trim());
  const hasSender = Boolean(senderName.trim());
  const hasRecipient = Boolean(recipientName.trim());
  const canReview = hasSubject && hasBody && hasSender && hasRecipient;
  const missingItems: string[] = [];
  if (!hasSender) missingItems.push(t("reviewMissingSender"));
  if (!hasRecipient) missingItems.push(t("reviewMissingRecipient"));
  if (!hasBody) missingItems.push(t("reviewMissingBody"));
  if (!hasSubject) missingItems.push(t("reviewMissingSubject"));

  const attachmentCount = files.attachments.length;
  const registeredPrice = pricing.data?.registered?.displayPrice ?? t("priceUnavailable");
  const standardPrice = pricing.data?.standard?.displayPrice ?? t("priceUnavailable");
  const isDeliverySelectionPending = pendingDeliveryType !== null;
  const isSignatureSelectionPending = pendingSignatureMode !== null || pendingSignatureRemoval;

  useEffect(() => {
    if (attachmentCount > 0) {
      setShowAttachmentManager(true);
    }
  }, [attachmentCount]);

  useEffect(() => {
    const persistedMode = draft.data?.signatureMode;
    const nextMode = persistedMode ?? (files.signature ? "image" : "typed");
    setSignatureMode(nextMode);

    if (signatureBootstrapRef.current || !draft.data || persistedMode) {
      return;
    }

    signatureBootstrapRef.current = true;
    void updateDraft.mutateAsync({
      signatureMode: nextMode,
      signatureAssetId: nextMode === "image" ? (files.signature?.id ?? null) : null,
    });
  }, [draft.data, files.signature, updateDraft]);

  async function handleSelectDelivery(type: "standard" | "registered") {
    if (type === deliveryType || isDeliverySelectionPending || isSignatureSelectionPending) {
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
    if (reviewDraft.isPending || isNavigating) return;
    try {
      const reviewUpdates: {
        subject?: string;
        signatureMode?: "typed" | "image";
        signatureAssetId?: string | null;
      } = {};

      if (normalizedSubject && normalizedSubject !== draft.data?.subject) {
        reviewUpdates.subject = normalizedSubject;
      }

      if (draft.data?.signatureMode !== signatureMode) {
        reviewUpdates.signatureMode = signatureMode;
      }

      const nextSignatureAssetId =
        signatureMode === "image" ? (files.signature?.id ?? null) : null;
      if ((draft.data?.signatureAssetId ?? null) !== nextSignatureAssetId) {
        reviewUpdates.signatureAssetId = nextSignatureAssetId;
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

  function handleBlockedReview() {
    showStepWarningToast({
      id: "logistics-step-missing",
      title: t("stepNeedsAttentionTitle"),
      items: missingItems,
    });
  }

  async function handleSignatureModeChange(nextMode: "typed" | "image") {
    if (nextMode === signatureMode || isSignatureSelectionPending || isDeliverySelectionPending) {
      return;
    }

    setSignatureMode(nextMode);
    setPendingSignatureMode(nextMode);

    try {
      await updateDraft.mutateAsync({
        signatureMode: nextMode,
        signatureAssetId: nextMode === "image" ? (files.signature?.id ?? null) : null,
      });
    } catch {
      setSignatureMode(draft.data?.signatureMode === "image" ? "image" : "typed");
      showStepErrorToast({
        id: "signature-mode-save-error",
        title: t("stepSaveFailed"),
      });
    } finally {
      setPendingSignatureMode(null);
    }
  }

  async function handleRemoveSignature() {
    if (!files.signature || isSignatureSelectionPending || isDeliverySelectionPending) {
      return;
    }

    setPendingSignatureRemoval(true);
    try {
      await files.removeFile(files.signature.id);
      setSignatureMode("typed");
      await updateDraft.mutateAsync({
        signatureMode: "typed",
        signatureAssetId: null,
      });
    } catch {
      showStepErrorToast({
        id: "signature-remove-error",
        title: t("stepSaveFailed"),
      });
    } finally {
      setPendingSignatureRemoval(false);
    }
  }

  async function handleUploadSignature(file: File) {
    try {
      const uploaded = await files.uploadFile(file, "signature");
      setSignatureMode("image");
      await updateDraft.mutateAsync({
        signatureMode: "image",
        signatureAssetId: uploaded.id,
      });
    } catch {
      showStepErrorToast({
        id: "signature-upload-error",
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
      step={7}
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
          onClick={canReview ? handleReview : handleBlockedReview}
          disabled={reviewDraft.isPending}
          loading={reviewDraft.isPending || Boolean(isNavigating)}
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
              disabled={isDeliverySelectionPending || isSignatureSelectionPending}
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
              disabled={isDeliverySelectionPending || isSignatureSelectionPending}
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
          <div className="flex items-center gap-4 px-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              {t("signatureLabel")}
            </h3>
            <SegmentedControl
              options={[
                {
                  value: "typed" as const,
                  label: t("signatureTyped"),
                  icon:
                    pendingSignatureMode === "typed" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Type className="h-3 w-3" />
                    ),
                },
                {
                  value: "image" as const,
                  label: t("signatureImage"),
                  icon:
                    pendingSignatureMode === "image" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ImageIcon className="h-3 w-3" />
                    ),
                },
              ]}
              value={signatureMode}
              onChange={(v) => void handleSignatureModeChange(v)}
            />
          </div>

          {signatureMode === "typed" ? (
            <Card isCompactViewport={isCompactViewport} density="thin">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                {t("signatureTypedPreview")}
              </div>
              <p
                className="text-xl italic text-zinc-700 dark:text-zinc-200"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {senderName || t("signatureFallbackName")}
              </p>
            </Card>
          ) : (
            <div>
              {files.signature ? (
                <Card
                  isCompactViewport={isCompactViewport}
                  density="thin"
                  className="flex items-center gap-3"
                >
                  <img
                    src={signatureUrl ?? ""}
                    alt={t("signatureImageAlt")}
                    className="h-12 max-w-[200px] object-contain"
                  />
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => void handleRemoveSignature()}
                    disabled={pendingSignatureRemoval}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {pendingSignatureRemoval ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : null}
                    {t("remove")}
                  </button>
                </Card>
              ) : (
                <DashedCard
                  onClick={() => sigInputRef.current?.click()}
                  disabled={files.isUploading}
                  isCompactViewport={isCompactViewport}
                  className="flex-col gap-2"
                >
                  <Plus className="h-5 w-5 text-zinc-400" />
                  <span className="text-xs font-semibold text-zinc-500">
                    {t("signatureUploadPrompt")}
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    {t("signatureUploadHint")}
                  </span>
                </DashedCard>
              )}
              <input
                ref={sigInputRef}
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUploadSignature(file);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </section>

        <section className="space-y-5">
          <div className="flex items-start justify-between gap-3 px-2">
            <div className="min-w-0">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                {t("attachmentsLabel")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {t("attachmentsLogisticsHint")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAttachmentManager((value) => !value)}
              className="shrink-0 rounded-full bg-[var(--app-surface-soft)] px-3 py-1.5 text-[11px] font-semibold text-zinc-600 transition-colors hover:bg-[var(--app-surface)] dark:text-[var(--app-muted-strong)]"
            >
              {showAttachmentManager
                ? t("hideAttachmentsManager")
                : attachmentCount > 0
                  ? t("manageAttachments")
                  : t("addAttachment")}
            </button>
          </div>

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
          ) : (
            <Card
              isCompactViewport={isCompactViewport}
              density="thin"
              className="bg-[var(--app-surface)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {attachmentCount > 0
                      ? t("manageAttachments")
                      : t("attachmentsEmptyState")}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    {attachmentCount > 0
                      ? t("attachmentsHint")
                      : t("attachmentsLogisticsHint")}
                  </p>
                </div>
                {attachmentCount > 0 ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {attachmentCount}
                  </span>
                ) : null}
              </div>
            </Card>
          )}
        </section>
      </div>
    </DraftShell>
  );
}
