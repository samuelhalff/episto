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
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
            {t("phaseProgress", { current: clampedStep + 1, total: STEPS.length })}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {t(currentStepKey)}
          </p>
        </div>
        <div className="app-panel-muted rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-300">
          {clampedStep + 1}/{STEPS.length}
        </div>
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-zinc-950 transition-[width] duration-300 dark:bg-amber-400"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
