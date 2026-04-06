"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useDraft, useUpdateDraft } from "../../../hooks/use-api";
import { normalizeLetterSubject } from "../../../lib/letter-content";
import { DraftShell, Card, PrimaryButton } from "./ui";
import { showStepErrorToast, showStepWarningToast } from "./step-feedback";
import { mergeDraftWorkspaceState } from "./workspace-state";
import type { DraftWorkspaceStepShellProps } from "./step-props";

interface StepProps extends DraftWorkspaceStepShellProps {
  onNext: () => void;
}

export function SubjectStep({
  draftId,
  onNext,
  onPrevious,
  onStepClick,
  isStepMenuOpen,
  isCompactViewport,
  onInputFocusChange,
  isNavigating,
  previousStepLabel,
}: StepProps) {
  const t = useTranslations("draft");
  const draft = useDraft(draftId);
  const updateDraft = useUpdateDraft(draftId);

  const [isFieldFocused, setIsFieldFocused] = useState(false);
  const [subject, setSubject] = useState("");
  const hasHydratedRef = useRef(false);
  const lastSavedSubjectRef = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const normalizedSubject =
    normalizeLetterSubject(subject, draft.data?.locale ?? "de-CH") ?? "";

  useEffect(() => {
    if (hasHydratedRef.current) return;

    const initialSubject =
      normalizeLetterSubject(draft.data?.subject, draft.data?.locale ?? "de-CH") ?? "";
    setSubject(initialSubject);
    lastSavedSubjectRef.current = initialSubject;
    hasHydratedRef.current = true;
  }, [draft.data?.locale, draft.data?.subject]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const next = Math.min(textarea.scrollHeight, 176);
    textarea.style.height = `${next}px`;
    textarea.style.overflowY = textarea.scrollHeight > 176 ? "auto" : "hidden";
  }, [subject]);

  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (normalizedSubject === lastSavedSubjectRef.current) return;

    const timeoutId = window.setTimeout(() => {
      void updateDraft.mutateAsync({ subject: normalizedSubject }).then(() => {
        lastSavedSubjectRef.current = normalizedSubject;
        if (normalizedSubject && normalizedSubject !== subject) {
          setSubject(normalizedSubject);
        }
      });
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [normalizedSubject, subject, updateDraft]);

  const canProceed = normalizedSubject.length > 0;

  async function handleConfirm() {
    if (!canProceed || updateDraft.isPending) return;
    try {
      await updateDraft.mutateAsync({
        subject: normalizedSubject,
        metadata: mergeDraftWorkspaceState(draft.data?.metadata, {
          furthestUnlockedStepIndex: 6,
        }),
      });
      lastSavedSubjectRef.current = normalizedSubject;
      setSubject(normalizedSubject);
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
      step={5}
      totalSteps={7}
      title={t("subjectLineTitle")}
      subtitle={t("subjectLineSubtitle")}
      onStepClick={onStepClick}
      stepTriggerLabel={t("stepMenuLabel")}
      secondaryActionLabel={previousStepLabel}
      onSecondaryAction={onPrevious}
      isStepMenuOpen={isStepMenuOpen}
      isInputFocused={isFieldFocused}
      isCompactViewport={isCompactViewport}
      isNavigating={isNavigating}
      primaryAction={
        <PrimaryButton
          onClick={canProceed ? handleConfirm : handleBlockedConfirm}
          disabled={updateDraft.isPending}
          loading={updateDraft.isPending || Boolean(isNavigating)}
          tone={canProceed ? "primary" : "warning"}
          hideIcon={!canProceed}
        >
          {t("continueToLogistics")}
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
            <p className="px-2 text-sm text-zinc-500 dark:text-zinc-300">
              {t("subjectSuggestedHint")}
            </p>
          ) : null}
          <Card isCompactViewport={isCompactViewport} density="thin">
            <textarea
              ref={textareaRef}
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
              rows={3}
              maxLength={200}
              placeholder={t("subjectInputPlaceholder")}
              className="app-form-control min-h-[88px] w-full resize-none bg-transparent font-semibold leading-6 text-zinc-900 placeholder:text-zinc-300 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </Card>
          <div className="px-2 text-right text-[10px] text-zinc-400">
            {subject.length}/200
          </div>
        </section>
      </div>
    </DraftShell>
  );
}
