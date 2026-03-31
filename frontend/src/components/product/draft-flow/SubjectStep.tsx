"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useDraft, useUpdateDraft } from "../../../hooks/use-api";
import { DraftShell, Card, PrimaryButton } from "./ui";
import { showStepErrorToast, showStepWarningToast } from "./step-feedback";
import { mergeDraftWorkspaceState } from "./workspace-state";

interface StepProps {
  draftId: string;
  onNext: () => void;
  onStepClick: () => void;
  isStepMenuOpen?: boolean;
  isCompactViewport?: boolean;
  onInputFocusChange?: (focused: boolean) => void;
  isNavigating?: boolean;
  furthestUnlockedStepIndex?: number;
}

export function SubjectStep({
  draftId,
  onNext,
  onStepClick,
  isStepMenuOpen,
  isCompactViewport,
  onInputFocusChange,
  isNavigating,
  furthestUnlockedStepIndex,
}: StepProps) {
  const t = useTranslations("draft");
  const draft = useDraft(draftId);
  const updateDraft = useUpdateDraft(draftId);

  const [isFieldFocused, setIsFieldFocused] = useState(false);
  const [subject, setSubject] = useState("");
  const hasHydratedRef = useRef(false);
  const lastSavedSubjectRef = useRef("");

  useEffect(() => {
    if (hasHydratedRef.current) return;

    const initialSubject = draft.data?.subject ?? "";
    setSubject(initialSubject);
    lastSavedSubjectRef.current = initialSubject;
    hasHydratedRef.current = true;
  }, [draft.data?.subject]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (subject === lastSavedSubjectRef.current) return;

    const timeoutId = window.setTimeout(() => {
      void updateDraft.mutateAsync({ subject }).then(() => {
        lastSavedSubjectRef.current = subject;
      });
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [subject, updateDraft]);

  const canProceed = subject.trim().length > 0;

  async function handleConfirm() {
    if (!canProceed || updateDraft.isPending) return;
    try {
      await updateDraft.mutateAsync({
        subject: subject.trim(),
        metadata: mergeDraftWorkspaceState(draft.data?.metadata, {
          furthestUnlockedStepIndex: 6,
        }),
      });
      lastSavedSubjectRef.current = subject.trim();
      onNext();
    } catch {
      showStepErrorToast({
        id: "subject-step-save-error",
        title: t("stepSaveFailed"),
      });
    }
  }

  function handleBlockedConfirm() {
    showStepWarningToast({
      id: "subject-step-missing",
      title: t("stepNeedsAttentionTitle"),
      items: [t("reviewMissingSubject")],
    });
  }

  return (
    <DraftShell
      step={6}
      totalSteps={7}
      title={t("subjectLineTitle")}
      subtitle={t("subjectLineSubtitle")}
      onStepClick={onStepClick}
      stepTriggerLabel={t("stepMenuLabel")}
      isStepMenuOpen={isStepMenuOpen}
      isInputFocused={isFieldFocused}
      isCompactViewport={isCompactViewport}
      isNavigating={isNavigating}
      furthestUnlockedStepIndex={furthestUnlockedStepIndex}
      primaryAction={
        <PrimaryButton
          onClick={canProceed ? handleConfirm : handleBlockedConfirm}
          disabled={updateDraft.isPending}
          loading={updateDraft.isPending || Boolean(isNavigating)}
          tone={canProceed ? "primary" : "warning"}
          hideIcon={!canProceed}
        >
          {t("confirmSubject")}
        </PrimaryButton>
      }
    >
      <div className="space-y-8 pb-4">
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              {t("subjectLineLabel")}
            </h3>
          </div>
          {draft.data?.subject?.trim() ? (
            <p className="px-2 text-sm text-zinc-500 dark:text-zinc-300">{t("subjectSuggestedHint")}</p>
          ) : null}
          <Card isCompactViewport={isCompactViewport} density="thin">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => {
                setIsFieldFocused(true);
                onInputFocusChange?.(true);
              }}
              onBlur={() => {
                setIsFieldFocused(false);
                onInputFocusChange?.(false);
              }}
              maxLength={200}
              placeholder={t("subjectInputPlaceholder")}
              className="w-full bg-transparent text-base font-semibold text-zinc-900 placeholder:text-zinc-300 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </Card>
          <div className="px-2 text-right text-[10px] text-zinc-400">{subject.length}/200</div>
        </section>
      </div>
    </DraftShell>
  );
}
