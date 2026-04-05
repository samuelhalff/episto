"use client";

import { Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDraft, useDraftFiles, useUpdateDraft } from "../../../hooks/use-api";
import { AttachmentUploader } from "../AttachmentUploader";
import { Card, DraftShell, PrimaryButton } from "./ui";
import { showStepErrorToast, showStepWarningToast } from "./step-feedback";
import { mergeDraftWorkspaceState } from "./workspace-state";

interface StepProps {
  draftId: string;
  onNext: () => void;
  onPrevious?: (() => void) | undefined;
  onStepClick: () => void;
  isStepMenuOpen?: boolean;
  isCompactViewport?: boolean;
  isNavigating?: boolean;
  previousStepLabel?: string | undefined;
  furthestUnlockedStepIndex?: number;
}

export function AttachmentsStep({
  draftId,
  onNext,
  onPrevious,
  onStepClick,
  isStepMenuOpen,
  isCompactViewport,
  isNavigating,
  previousStepLabel,
  furthestUnlockedStepIndex,
}: StepProps) {
  const t = useTranslations("draft");
  const draft = useDraft(draftId);
  const files = useDraftFiles(draftId);
  const updateDraft = useUpdateDraft(draftId);
  const attachmentCount = files.attachments.length;
  const isUploading = files.isUploading;

  async function handleNext() {
    if (isUploading || updateDraft.isPending) return;

    try {
      await updateDraft.mutateAsync({
        metadata: mergeDraftWorkspaceState(draft.data?.metadata, {
          furthestUnlockedStepIndex: 5,
        }),
      });
      onNext();
    } catch {
      showStepErrorToast({
        id: "attachments-step-save-error",
        title: t("stepSaveFailed"),
      });
    }
  }

  function handleBlockedNext() {
    showStepWarningToast({
      id: "attachments-step-uploading",
      title: t("stepNeedsAttentionTitle"),
      items: [t("attachmentsUploadingHint")],
    });
  }

  return (
    <DraftShell
      step={5}
      totalSteps={7}
      title={t("attachmentsStepTitle")}
      subtitle={t("attachmentsStepSubtitle")}
      onStepClick={onStepClick}
      stepTriggerLabel={t("stepMenuLabel")}
      secondaryActionLabel={previousStepLabel}
      onSecondaryAction={onPrevious}
      isStepMenuOpen={isStepMenuOpen}
      isCompactViewport={isCompactViewport}
      isNavigating={isNavigating}
      primaryAction={
        <PrimaryButton
          onClick={
            isUploading
              ? handleBlockedNext
              : () => {
                  void handleNext();
                }
          }
          disabled={updateDraft.isPending}
          loading={updateDraft.isPending || Boolean(isNavigating)}
          tone={isUploading ? "warning" : "primary"}
          hideIcon={isUploading}
        >
          {t("continueToSubject")}
        </PrimaryButton>
      }
    >
      <div className={isCompactViewport ? "space-y-5 pb-2" : "space-y-8 pb-4"}>
        <section className={isCompactViewport ? "space-y-3" : "space-y-4"}>
          <Card isCompactViewport={isCompactViewport} density="thin">
            <div className={isCompactViewport ? "space-y-2.5" : "space-y-3"}>
              <div className={isCompactViewport ? "space-y-1" : "space-y-1.5"}>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    <Paperclip className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                    <span>{t("attachmentsLabel")}</span>
                  </div>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300">
                    {t("attachmentsOptionalBadge")}
                  </span>
                  {attachmentCount > 0 ? (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      {attachmentCount}
                    </span>
                  ) : null}
                </div>
                {attachmentCount === 0 ? (
                  <p
                    className={
                      isCompactViewport
                        ? "text-[13px] leading-5 text-zinc-500 dark:text-zinc-400"
                        : "text-sm leading-relaxed text-zinc-500 dark:text-zinc-400"
                    }
                  >
                    {t("attachmentsHint")}
                  </p>
                ) : null}
              </div>

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
            </div>
          </Card>
        </section>
      </div>
    </DraftShell>
  );
}
