"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useDraft, useSession } from "../../../hooks/use-api";
import { useMediaQuery } from "../../../hooks/use-media-query";
import { useVisualViewport } from "../../../hooks/use-visual-viewport";
import { RecoveryScreen } from "../RecoveryScreen";
import { StepOverlay } from "./StepOverlay";
import { AttachmentsStep } from "./AttachmentsStep";
import { BodyStep } from "./BodyStep";
import { IntakeStep } from "./IntakeStep";
import { LogisticsStep } from "./LogisticsStep";
import { RecipientStep } from "./RecipientStep";
import { SenderStep } from "./SenderStep";
import { SubjectStep } from "./SubjectStep";
import {
  DRAFT_WORKSPACE_STEPS,
  getDraftWorkspaceStepSlugByIndex,
  type DraftWorkspaceStepSlug,
  getDraftWorkspacePath,
  getDraftWorkspaceStepIndex,
  getDraftWorkspaceUnlockedStepIndex,
  getNextDraftWorkspaceStep,
  isDraftWorkspaceStepLocked,
  resolveDraftWorkspaceStepSlug,
} from "./steps";
import { usePathname, useRouter } from "../../../i18n/navigation";
import { ApiError } from "../../../lib/api";

interface DraftWorkspaceClientProps {
  draftId: string;
  stepSlug?: DraftWorkspaceStepSlug;
}

export function DraftWorkspaceClient({ draftId, stepSlug }: DraftWorkspaceClientProps) {
  const t = useTranslations("draft");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const draft = useDraft(draftId);
  const viewportHeight = useVisualViewport();
  const isCompactViewport = useMediaQuery("(max-width: 1023px)");

  const [showSteps, setShowSteps] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [, setIsInputFocused] = useState(false);

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
  const furthestUnlockedStepIndex = getDraftWorkspaceUnlockedStepIndex(draft.data);
  const currentStep = Math.min(requestedStepIndex, furthestUnlockedStepIndex);
  const currentStepSlug = getDraftWorkspaceStepSlugByIndex(currentStep);
  const nextStepSlug = getNextDraftWorkspaceStep(currentStep);

  useEffect(() => {
    setIsNavigating(false);
  }, [resolvedStepSlug]);

  useEffect(() => {
    if (!draft.data || draft.isLoading) {
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

  const navigateToStep = useCallback((targetStepSlug: DraftWorkspaceStepSlug) => {
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
  }, [currentStepSlug, draftId, furthestUnlockedStepIndex, router]);

  const beginNavigation = useCallback(() => {
    setIsNavigating(true);
  }, []);

  const handleNext = useCallback(() => {
    if (!nextStepSlug) return;
    navigateToStep(nextStepSlug);
  }, [nextStepSlug, navigateToStep]);

  const handleStepClick = useCallback(() => setShowSteps(true), []);

  const handleInputFocusChange = useCallback((focused: boolean) => setIsInputFocused(focused), []);

  const commonProps = {
    draftId,
    onNext: handleNext,
    onStepClick: handleStepClick,
    isStepMenuOpen: showSteps,
    isCompactViewport,
    onInputFocusChange: handleInputFocusChange,
    isNavigating,
    beginNavigation,
    navigateToStep,
    furthestUnlockedStepIndex,
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

  if (session.isLoading || draft.isLoading) {
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
    <div
      id="draft-workspace-root"
      className={`flex flex-col overflow-hidden bg-[var(--app-surface-muted)] transition-colors ${
        isCompactViewport ? "fixed inset-0 overscroll-none" : "relative"
      }`}
      style={{ height: workspaceHeight }}
    >
      <div className="min-h-0 flex-1">{stepComponents[currentStep]}</div>

      {showSteps ? (
        <StepOverlay
          currentStep={currentStep}
          furthestUnlockedStepIndex={furthestUnlockedStepIndex}
          isCompactViewport={isCompactViewport}
          steps={DRAFT_WORKSPACE_STEPS.map((step) => ({
            id: step.id,
            title: t(step.titleKey),
          }))}
          onClose={() => setShowSteps(false)}
          onSelect={(idx) => {
            const selectedStep = DRAFT_WORKSPACE_STEPS[idx];
            if (!selectedStep) return;
            navigateToStep(selectedStep.slug);
          }}
        />
      ) : null}
    </div>
  );
}
