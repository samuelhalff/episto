"use client";

import { Eye } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { LetterPreviewModal } from "../LetterPreviewModal";
import { BodyComposer } from "./BodyComposer";
import { BodyGenerationDialog } from "./BodyGenerationDialog";
import { BodyModeToolbar } from "./BodyModeToolbar";
import { BodyPreview } from "./BodyPreview";
import { DictationPanel } from "./DictationPanel";
import { PromptShortcutBar } from "./PromptShortcutBar";
import type {
  DraftWorkspacePreviewToggleProps,
  DraftWorkspaceStepShellProps,
} from "./step-props";
import { DraftShell, PrimaryButton, SecondaryButton, SurfaceIconButton } from "./ui";
import { useBodyStepController } from "./useBodyStepController";

interface StepProps
  extends DraftWorkspaceStepShellProps, DraftWorkspacePreviewToggleProps {
  onNext: () => void;
}

export function BodyStep({
  draftId,
  onNext,
  onPrevious,
  onStepClick,
  isStepMenuOpen,
  isCompactViewport,
  onInputFocusChange,
  isNavigating,
  previousStepLabel,
  onTogglePreview,
  isPreviewPanelVisible,
}: StepProps) {
  const t = useTranslations("draft");
  const tc = useTranslations("common");
  const locale = useLocale();
  const {
    canProceed,
    bodyText,
    refineText,
    editMode,
    initialComposeStatus,
    helperText,
    isComposerFocused,
    isManualFieldFocused,
    isPreviewOpen,
    showFirstDraftReadyDialog,
    showRefinementThread,
    isUpdatePending,
    loadingState,
    shouldShowBodyGenerationDialog,
    salutation,
    closing,
    bodyPreviewText,
    refinementMessages,
    dictation,
    quickActions,
    handleConfirm,
    handleModeChange,
    handlePreviewAction,
    handleRefine,
    handleShortcutSelect,
    dismissFirstDraftReadyDialog,
    handleDismissBodyGenerationDialog,
    handleRefineTextChange,
    handleComposerFocusChange,
    handleToggleDictation,
    handleToggleRefinementThread,
    handleManualTextChange,
    handleManualFocusChange,
    closePreview,
  } = useBodyStepController({
    draftId,
    onNext,
    onInputFocusChange,
    onTogglePreview,
  });

  // Keep preview in the sticky toolbar so it never widens the dock CTA row.
  const bodyModeToolbarClassName =
    "sticky top-0 z-10 -mx-4 bg-[var(--app-surface-muted)] px-5 pb-3 pt-1 lg:-mx-6 lg:px-7";
  const previewToolbarButton =
    canProceed && !isPreviewPanelVisible ? (
      <SurfaceIconButton
        type="button"
        size="composer"
        onClick={handlePreviewAction}
        disabled={isNavigating}
        aria-label={t("openDraftPreview")}
      >
        <Eye className="h-5 w-5" />
      </SurfaceIconButton>
    ) : null;

  const quickActionBadges = !loadingState.isAiBusy ? (
    <PromptShortcutBar
      primaryShortcuts={quickActions.primary.map((action) => ({
        ...action,
        description: action.prompt,
      }))}
      overflowShortcuts={quickActions.overflow.map((action) => ({
        ...action,
        description: action.prompt,
      }))}
      moreLabel={t("bodyQuickActionsMore")}
      sheetTitle={t("bodyShortcutSheetTitle")}
      sheetDescription={t("bodyShortcutSheetHint")}
      closeLabel={tc("close")}
      disabled={loadingState.isAiBusy}
      onShortcutSelect={(action) => {
        handleShortcutSelect(action.prompt);
      }}
    />
  ) : undefined;

  return (
    <DraftShell
      step={3}
      totalSteps={7}
      title={t("bodyContentTitle")}
      subtitle={undefined}
      onStepClick={onStepClick}
      stepTriggerLabel={t("stepMenuLabel")}
      secondaryActionLabel={previousStepLabel}
      onSecondaryAction={onPrevious}
      isStepMenuOpen={isStepMenuOpen}
      isInputFocused={isComposerFocused || isManualFieldFocused}
      isCompactViewport={isCompactViewport}
      isNavigating={isNavigating}
      primaryAction={
        <PrimaryButton
          onClick={() => {
            void handleConfirm();
          }}
          disabled={!canProceed || isUpdatePending}
          loading={isUpdatePending || Boolean(isNavigating)}
          tone={canProceed ? "primary" : "warning"}
          hideIcon={!canProceed}
        >
          {t("continueToAttachments")}
        </PrimaryButton>
      }
      composer={
        editMode === "ai" ? (
          <>
            <DictationPanel
              isRecording={dictation.isRecording}
              isProcessing={dictation.isProcessing}
              audioLevel={dictation.audioLevel}
              elapsedSeconds={dictation.elapsedSeconds}
              maxCaptureSeconds={dictation.maxCaptureSeconds}
              interimText={dictation.interimText}
              locale={locale}
              error={dictation.error}
              onStop={() => {
                void dictation.stopRecording();
              }}
              onCancel={() => {
                void dictation.cancelRecording();
              }}
              onRetry={() => {
                dictation.clearError();
                void dictation.startRecording(locale);
              }}
              onDismissError={dictation.clearError}
            />
            <BodyComposer
              value={refineText}
              placeholder={t("refineComposerPlaceholder")}
              helperText={helperText}
              isAiBusy={loadingState.isAiBusy}
              isCompactViewport={isCompactViewport}
              isPreviewPanelVisible={isPreviewPanelVisible}
              quickActionBadges={quickActionBadges}
              showPreviewLabel={tc("showPreview")}
              hidePreviewLabel={tc("hidePreview")}
              startDictationLabel={t("startDictation")}
              stopDictationLabel={t("stopDictation")}
              unavailableTooltip={t("dictationUnavailableTooltip")}
              isDictationRecording={dictation.isRecording}
              isDictationSupported={dictation.isSupported}
              onChange={handleRefineTextChange}
              onSend={handleRefine}
              onFocusChange={handleComposerFocusChange}
              onTogglePreview={handlePreviewAction}
              onToggleDictation={handleToggleDictation}
            />
          </>
        ) : undefined
      }
    >
      <div className="space-y-5 pb-4">
        <BodyModeToolbar
          editMode={editMode}
          className={bodyModeToolbarClassName}
          aiLabel={t("modeAi")}
          manualLabel={t("modeManual")}
          previewButton={previewToolbarButton}
          onModeChange={handleModeChange}
        />

        <BodyPreview
          editMode={editMode}
          isCompactViewport={isCompactViewport}
          canProceed={canProceed}
          bodyText={bodyText}
          bodyPreviewText={bodyPreviewText}
          salutation={salutation}
          closing={closing}
          showRefinementLoadingCard={loadingState.showRefinementLoadingCard}
          loadingLabel={tc("loading")}
          hasRefinements={refinementMessages.length > 0}
          showRefinementThread={showRefinementThread}
          refinementMessages={refinementMessages}
          refinementToggleLabel={t("refinementHistoryToggle", {
            count: refinementMessages.filter((message) => message.role === "user").length,
          })}
          refinementHistoryLabel={t("refinementHistoryLabel")}
          refinementAppliedLabel={t("refinementAppliedLabel")}
          emptyTitle={t("bodyDraftEmptyTitle")}
          emptyHint={t("bodyDraftEmptyHint")}
          placeholder={t("bodyPlaceholder")}
          onToggleRefinementThread={handleToggleRefinementThread}
          onManualTextChange={handleManualTextChange}
          onManualFocusChange={handleManualFocusChange}
        />
      </div>

      {shouldShowBodyGenerationDialog ? (
        <BodyGenerationDialog
          open
          status={initialComposeStatus === "error" ? "error" : "loading"}
          loadingTitle={t("bodyGenerationLoadingTitle")}
          loadingDescription={t("bodyGenerationLoadingDescription")}
          loadingLabel={t("bodyGenerationLoadingLabel")}
          errorTitle={t("bodyGenerationErrorTitle")}
          errorDescription={t("bodyGenerationErrorDescription")}
          refreshLabel={t("bodyGenerationRefreshAction")}
          supportLabel={t("bodyGenerationSupportAction")}
          closeLabel={tc("close")}
          onRefresh={() => window.location.reload()}
          onClose={handleDismissBodyGenerationDialog}
        />
      ) : null}

      {showFirstDraftReadyDialog && !shouldShowBodyGenerationDialog ? (
        <div className="fixed inset-0 z-[180] flex items-end justify-center bg-black/35 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-8 sm:items-center sm:pb-8">
          <div className="app-panel w-full max-w-md rounded-4xl p-5 shadow-2xl">
            <h3 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {t("firstDraftReadyTitle")}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {t("firstDraftReadyBody")}
            </p>
            <div className="mt-5 flex justify-end">
              <SecondaryButton
                onClick={dismissFirstDraftReadyDialog}
                fullWidth={false}
                leadingVisual="none"
              >
                {t("firstDraftReadyDismiss")}
              </SecondaryButton>
            </div>
          </div>
        </div>
      ) : null}

      {isPreviewOpen ? (
        <LetterPreviewModal
          draftId={draftId}
          onClose={closePreview}
          onConfirm={() => {
            void handleConfirm();
          }}
          confirmDisabled={!canProceed || isUpdatePending}
        />
      ) : null}
    </DraftShell>
  );
}
