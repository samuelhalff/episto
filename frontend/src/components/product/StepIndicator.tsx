"use client";

import { useTranslations } from "next-intl";

const STEPS = ["stepDraft", "stepReview", "stepPay", "stepDone"] as const;

export function StepIndicator({
  currentStep,
  draftId: _draftId,
}: {
  currentStep: number;
  draftId: string;
}) {
  const t = useTranslations("draft");
  const clampedStep = Math.min(Math.max(currentStep, 0), STEPS.length - 1);
  const currentStepKey = STEPS[clampedStep] ?? STEPS[0];
  const progressPercent = (clampedStep / (STEPS.length - 1)) * 100;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          {t(currentStepKey)}
        </p>
        <div className="app-panel-muted shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-normal tabular-nums text-zinc-500 dark:text-zinc-300">
          {clampedStep + 1}/{STEPS.length}
        </div>
      </div>

      <div className="mt-1.5 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-[var(--action-primary-bg)] transition-[width] duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
