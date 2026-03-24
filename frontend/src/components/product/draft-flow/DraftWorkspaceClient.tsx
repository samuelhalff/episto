"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useDraft, useSession } from "../../../hooks/use-api.js";
import { useMediaQuery } from "../../../hooks/use-media-query.js";
import { useVisualViewport } from "../../../hooks/use-visual-viewport.js";
import { RecoveryScreen } from "../RecoveryScreen.js";
import { StepOverlay } from "./StepOverlay.js";
import { BodyStep } from "./BodyStep.js";
import { IntakeStep } from "./IntakeStep.js";
import { LogisticsStep } from "./LogisticsStep.js";
import { RecipientStep } from "./RecipientStep.js";
import { SenderStep } from "./SenderStep.js";
import { SubjectStep } from "./SubjectStep.js";
import {
  DRAFT_WORKSPACE_STEPS,
  isDraftWorkspaceStepSlug,
  type DraftWorkspaceStepSlug,
  getDraftWorkspacePath,
  getDraftWorkspaceStepIndex,
  getNextDraftWorkspaceStep,
} from "./steps.js";
import { usePathname, useRouter } from "../../../i18n/navigation.js";
import { ApiError } from "../../../lib/api.js";

interface DraftWorkspaceClientProps {
  draftId: string;
  stepSlug?: DraftWorkspaceStepSlug;
}

export function DraftWorkspaceClient({ draftId, stepSlug = "intake" }: DraftWorkspaceClientProps) {
  const t = useTranslations("draft");
  const tc = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const draft = useDraft(draftId);
  const viewportHeight = useVisualViewport();
  const isCompactViewport = useMediaQuery("(max-width: 1023px)");

  const [showSteps, setShowSteps] = useState(false);
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

  const pathnameSegments = pathname.split("/").filter(Boolean);
  const lastPathSegment = pathnameSegments.at(-1);
  const resolvedStepSlug =
    lastPathSegment && isDraftWorkspaceStepSlug(lastPathSegment) ? lastPathSegment : stepSlug;
  const currentStep = getDraftWorkspaceStepIndex(resolvedStepSlug);
  const nextStepSlug = getNextDraftWorkspaceStep(currentStep);
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

  if (session.isLoading || draft.isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center dark:bg-zinc-950"
        style={{ height: workspaceHeight }}
      >
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500 dark:text-zinc-400">{tc("loading")}</p>
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

  const handleNext = useCallback(() => {
    if (!nextStepSlug) return;
    router.push(getDraftWorkspacePath(draftId, nextStepSlug));
  }, [nextStepSlug, draftId, router]);

  const handleStepClick = useCallback(() => setShowSteps(true), []);

  const handleInputFocusChange = useCallback((focused: boolean) => setIsInputFocused(focused), []);

  const commonProps = {
    draftId,
    onNext: handleNext,
    onStepClick: handleStepClick,
    isStepMenuOpen: showSteps,
    isCompactViewport,
    onInputFocusChange: handleInputFocusChange,
  };

  const stepComponents = [
    <IntakeStep key="intake" {...commonProps} />,
    <SenderStep key="sender" {...commonProps} />,
    <RecipientStep key="recipient" {...commonProps} />,
    <BodyStep key="body" {...commonProps} />,
    <SubjectStep key="subject" {...commonProps} />,
    <LogisticsStep key="logistics" {...commonProps} />,
  ];

  return (
    <div
      id="draft-workspace-root"
      className={`flex flex-col overflow-hidden bg-[#f6f4ef] transition-colors dark:bg-zinc-950 ${
        isCompactViewport ? "fixed inset-0 overscroll-none" : "relative"
      }`}
      style={{ height: workspaceHeight }}
    >
      <div className="min-h-0 flex-1">{stepComponents[currentStep]}</div>

      {showSteps ? (
        <StepOverlay
          currentStep={currentStep}
          isCompactViewport={isCompactViewport}
          steps={DRAFT_WORKSPACE_STEPS.map((step) => ({
            id: step.id,
            title: t(step.titleKey),
          }))}
          onClose={() => setShowSteps(false)}
          onSelect={(idx) => {
            const selectedStep = DRAFT_WORKSPACE_STEPS[idx];
            if (!selectedStep) return;
            router.push(getDraftWorkspacePath(draftId, selectedStep.slug));
            setShowSteps(false);
          }}
        />
      ) : null}
    </div>
  );
}
