"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useDraft, useSession } from "../../../hooks/use-api";
import { useMediaQuery } from "../../../hooks/use-media-query";
import { useVisualViewport } from "../../../hooks/use-visual-viewport";
import { RecoveryScreen } from "../RecoveryScreen";
import { StepNavProvider } from "./step-nav-context";
import { StepOverlay } from "./StepOverlay";
import { AttachmentsStep } from "./AttachmentsStep";
import { BodyStep } from "./BodyStep";
import { IntakeStep } from "./IntakeStep";
import { LogisticsStep } from "./LogisticsStep";
import { RecipientStep } from "./RecipientStep";
import { SenderStep } from "./SenderStep";
import { SubjectStep } from "./SubjectStep";
import { WorkspacePreviewPane } from "./WorkspacePreviewPane";
import {
  DRAFT_WORKSPACE_STEPS,
  getDraftWorkspaceStepSlugByIndex,
  type DraftWorkspaceStepSlug,
  getDraftWorkspacePath,
  getDraftWorkspaceStepIndex,
  getDraftWorkspaceUnlockedStepIndex,
  getNextDraftWorkspaceStep,
  getPreviousDraftWorkspaceStep,
  isDraftWorkspaceStepLocked,
  resolveDraftWorkspaceStepSlug,
} from "./steps";
import { usePathname, useRouter } from "../../../i18n/navigation";
import { ApiError } from "../../../lib/api";

interface DraftWorkspaceClientProps {
  draftId: string;
  stepSlug?: DraftWorkspaceStepSlug;
}

const PREPARED_REVIEW_STATUSES = new Set(["reviewed", "rendering", "ready"]);
const POST_SUBMISSION_STATUSES = new Set(["submitted", "dispatched", "closed"]);

export function DraftWorkspaceClient({ draftId, stepSlug }: DraftWorkspaceClientProps) {
  const t = useTranslations("draft");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const draft = useDraft(draftId);
  const viewportHeight = useVisualViewport();
  const isCompactViewport = useMediaQuery("(max-width: 1023px)");
  const isWideViewport = useMediaQuery("(min-width: 1280px)");

  const [showSteps, setShowSteps] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [, setIsInputFocused] = useState(false);
  const [isPreviewPanelOpen, setIsPreviewPanelOpen] = useState(false);

  useEffect(() => {
    if (!isCompactViewport) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, [isCompactViewport]);

  const resolvedStepSlug = resolveDraftWorkspaceStepSlug(pathname, stepSlug);
  const requestedStepIndex = getDraftWorkspaceStepIndex(resolvedStepSlug);
  const workspaceHeight = isCompactViewport
    ? "100svh"
    : viewportHeight
      ? `${viewportHeight}px`
      : "100dvh";
  const draftApiError = draft.error instanceof ApiError ? draft.error : null;
  const isMissingDraft = draftApiError?.status === 404;
  const needsSessionRecovery =
    (!session.session && !session.isLoading) ||
    draftApiError?.status === 401 ||
    draftApiError?.status === 403;
  const isBootstrappingWorkspace =
    (!draft.data && draft.isLoading) || (!draft.data && session.isLoading);
  const furthestUnlockedStepIndex = getDraftWorkspaceUnlockedStepIndex(draft.data);
  const currentStep = Math.min(requestedStepIndex, furthestUnlockedStepIndex);
  const currentStepSlug = getDraftWorkspaceStepSlugByIndex(currentStep);
  const nextStepSlug = getNextDraftWorkspaceStep(currentStep);
  const previousStepSlug = getPreviousDraftWorkspaceStep(currentStep);
  const previousStepLabel =
    previousStepSlug === "intake"
      ? t("backToIntake")
      : previousStepSlug === "sender"
        ? t("backToSender")
        : previousStepSlug === "recipient"
          ? t("backToRecipient")
          : previousStepSlug === "body"
            ? t("backToContent")
            : previousStepSlug === "attachments"
              ? t("backToAttachments")
              : previousStepSlug === "subject"
                ? t("backToSubject")
                : undefined;

  useEffect(() => {
    setIsNavigating(false);
    setIsPreviewPanelOpen(false);
  }, [resolvedStepSlug]);

  useEffect(() => {
    if (!isWideViewport) {
      setIsPreviewPanelOpen(false);
    }
  }, [isWideViewport]);

  useEffect(() => {
    if (!draft.data) {
      return;
    }

    if (PREPARED_REVIEW_STATUSES.has(draft.data.status)) {
      setShowSteps(false);
      setIsNavigating(false);
      router.replace(`/draft/${draftId}/review`);
      return;
    }

    if (POST_SUBMISSION_STATUSES.has(draft.data.status)) {
      setShowSteps(false);
      setIsNavigating(false);
      router.replace(`/draft/${draftId}/confirmation`);
      return;
    }

    if (!isDraftWorkspaceStepLocked(resolvedStepSlug, furthestUnlockedStepIndex)) {
      return;
    }

    router.replace(getDraftWorkspacePath(draftId, currentStepSlug));
    setShowSteps(false);
    setIsNavigating(false);
  }, [
    currentStepSlug,
    draft.data,
    draft.isLoading,
    draftId,
    furthestUnlockedStepIndex,
    resolvedStepSlug,
    router,
  ]);

  const navigateToStep = useCallback(
    (targetStepSlug: DraftWorkspaceStepSlug) => {
      if (isDraftWorkspaceStepLocked(targetStepSlug, furthestUnlockedStepIndex)) {
        setShowSteps(false);
        return;
      }

      if (targetStepSlug === currentStepSlug) {
        setShowSteps(false);
        return;
      }

      setIsNavigating(true);
      router.push(getDraftWorkspacePath(draftId, targetStepSlug));
    },
    [currentStepSlug, draftId, furthestUnlockedStepIndex, router],
  );

  const beginNavigation = useCallback(() => {
    setIsNavigating(true);
  }, []);

  const handleNext = useCallback(() => {
    if (!nextStepSlug) return;
    navigateToStep(nextStepSlug);
  }, [nextStepSlug, navigateToStep]);

  const handlePrevious = useCallback(() => {
    if (!previousStepSlug) return;
    navigateToStep(previousStepSlug);
  }, [navigateToStep, previousStepSlug]);

  const handleStepClick = useCallback(() => setShowSteps(true), []);

  const handleInputFocusChange = useCallback(
    (focused: boolean) => setIsInputFocused(focused),
    [],
  );

  const handleTogglePreview = useCallback(
    () => setIsPreviewPanelOpen((prev) => !prev),
    [],
  );

  const handleClosePreview = useCallback(
    () => setIsPreviewPanelOpen(false),
    [],
  );

  const isPreviewPanelVisible = isWideViewport && isPreviewPanelOpen;

  const commonProps = {
    draftId,
    onNext: handleNext,
    onPrevious: previousStepSlug ? handlePrevious : undefined,
    onStepClick: handleStepClick,
    previousStepLabel,
    isStepMenuOpen: showSteps,
    isCompactViewport,
    onInputFocusChange: handleInputFocusChange,
    isNavigating,
    beginNavigation,
    navigateToStep,
    furthestUnlockedStepIndex,
    onTogglePreview: isWideViewport ? handleTogglePreview : undefined,
    isPreviewPanelVisible,
  };

  const stepComponents = [
    <IntakeStep key="intake" {...commonProps} />,
    <SenderStep key="sender" {...commonProps} />,
    <RecipientStep key="recipient" {...commonProps} />,
    <BodyStep key="body" {...commonProps} />,
    <AttachmentsStep key="attachments" {...commonProps} />,
    <SubjectStep key="subject" {...commonProps} />,
    <LogisticsStep key="logistics" {...commonProps} />,
  ];

  const translatedSteps = DRAFT_WORKSPACE_STEPS.map((step) => ({
    id: step.id,
    title: t(step.titleKey),
  }));

  const handleStepSelect = useCallback(
    (idx: number) => {
      const selectedStep = DRAFT_WORKSPACE_STEPS[idx];
      if (!selectedStep) return;
      navigateToStep(selectedStep.slug);
    },
    [navigateToStep],
  );

  if (isBootstrappingWorkspace) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[var(--app-surface-muted)]"
        style={{ height: workspaceHeight }}
      >
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">{tc("loading")}</p>
        </div>
      </div>
    );
  }

  if (needsSessionRecovery) {
    return (
      <RecoveryScreen
        eyebrow={tc("appName")}
        title={tc("sessionExpiredTitle")}
        description={tc("sessionExpiredBody")}
        primaryHref="/draft/new"
        primaryLabel={tc("startNewLetter")}
        secondaryHref="/"
        secondaryLabel={tc("backToHome")}
        className="min-h-0"
        style={{ minHeight: workspaceHeight }}
      />
    );
  }

  if (isMissingDraft) {
    return (
      <RecoveryScreen
        statusLabel="404"
        eyebrow={tc("appName")}
        title={tc("draftUnavailableTitle")}
        description={tc("draftUnavailableBody")}
        primaryHref="/draft/new"
        primaryLabel={tc("startNewLetter")}
        secondaryHref="/"
        secondaryLabel={tc("backToHome")}
        className="min-h-0"
        style={{ minHeight: workspaceHeight }}
      />
    );
  }

  if (draft.error) {
    return (
      <RecoveryScreen
        eyebrow={tc("appName")}
        title={tc("errorRecoveryTitle")}
        description={tc("errorRecoveryBody")}
        primaryHref="/draft/new"
        primaryLabel={tc("startNewLetter")}
        secondaryHref="/"
        secondaryLabel={tc("backToHome")}
        tertiaryLabel={tc("tryAgain")}
        onTertiaryAction={() => {
          void draft.refetch();
        }}
        className="min-h-0"
        style={{ minHeight: workspaceHeight }}
      />
    );
  }

  return (
    <StepNavProvider
      steps={translatedSteps}
      currentStep={currentStep}
      furthestUnlockedStepIndex={furthestUnlockedStepIndex}
      onStepSelect={handleStepSelect}
    >
      <div
        id="draft-workspace-root"
        className={`flex overflow-hidden bg-[var(--app-surface-muted)] transition-colors ${
          isCompactViewport ? "fixed inset-0 flex-col overscroll-none" : "relative flex-col"
        }`}
        style={{ height: workspaceHeight }}
      >
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="min-h-0 min-w-[480px] flex-1">{stepComponents[currentStep]}</div>

          {isWideViewport ? (
            <WorkspacePreviewPane
              draftId={draftId}
              isOpen={isPreviewPanelVisible}
              onClose={handleClosePreview}
            />
          ) : null}
        </div>

        {showSteps && isCompactViewport ? (
          <StepOverlay
            currentStep={currentStep}
            furthestUnlockedStepIndex={furthestUnlockedStepIndex}
            steps={translatedSteps}
            onClose={() => setShowSteps(false)}
            onSelect={handleStepSelect}
          />
        ) : null}
      </div>
    </StepNavProvider>
  );
}
