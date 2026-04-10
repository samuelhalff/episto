"use client";

import { useTranslations } from "next-intl";
import { useDraft, useDraftFiles, useUpdateDraft } from "../../../hooks/use-api";
import { AttachmentUploader } from "../AttachmentUploader";
import { DraftShell, PrimaryButton } from "./ui";
import { showStepErrorToast, showStepWarningToast } from "./step-feedback";
import { mergeDraftWorkspaceState } from "./workspace-state";
import type { DraftWorkspaceStepShellProps } from "./step-props";

interface StepProps extends DraftWorkspaceStepShellProps {
  onNext: () => void;
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
}: StepProps) {
  const t = useTranslations("draft");
  const draft = useDraft(draftId);
  const files = useDraftFiles(draftId);
  const updateDraft = useUpdateDraft(draftId);
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
      step={4}
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
        </section>
      </div>
    </DraftShell>
  );
}
