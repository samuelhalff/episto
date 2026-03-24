"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useDraft, useUpdateDraft } from "../../../hooks/use-api.js";
import { DraftShell, Card, PrimaryButton } from "./ui.js";

interface StepProps {
  draftId: string;
  onNext: () => void;
  onStepClick: () => void;
  isStepMenuOpen?: boolean;
  isCompactViewport?: boolean;
  onInputFocusChange?: (focused: boolean) => void;
}

export function SubjectStep({
  draftId,
  onNext,
  onStepClick,
  isStepMenuOpen,
  isCompactViewport,
  onInputFocusChange,
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
    await updateDraft.mutateAsync({ subject: subject.trim() });
    lastSavedSubjectRef.current = subject.trim();
    onNext();
  }

  return (
    <DraftShell
      step={5}
      totalSteps={6}
      title={t("subjectLineTitle")}
      subtitle={t("subjectLineSubtitle")}
      onStepClick={onStepClick}
      stepTriggerLabel={t("stepMenuLabel")}
      isStepMenuOpen={isStepMenuOpen}
      isInputFocused={isFieldFocused}
      isCompactViewport={isCompactViewport}
      primaryAction={
        <PrimaryButton onClick={handleConfirm} disabled={!canProceed} loading={updateDraft.isPending}>
          {t("confirmSubject")}
        </PrimaryButton>
      }
    >
      <div className="space-y-8 pb-4">
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {t("subjectLineLabel")}
            </h3>
          </div>
          {draft.data?.subject?.trim() ? (
            <p className="px-2 text-sm text-zinc-500 dark:text-zinc-300">{t("subjectSuggestedHint")}</p>
          ) : null}
          <Card isCompactViewport={isCompactViewport} density="thin" className="bg-white dark:bg-zinc-900">
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
              className="w-full bg-transparent text-[16px] font-bold text-zinc-900 placeholder:text-zinc-300 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </Card>
          <div className="px-2 text-right text-[10px] text-zinc-400">{subject.length}/200</div>
        </section>
      </div>
    </DraftShell>
  );
}
