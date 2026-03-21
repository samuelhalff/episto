"use client";

import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";

const STEPS = ["stepDraft", "stepReview", "stepPay", "stepDone"] as const;

/**
 * Progress indicator showing the 4-step letter flow.
 *
 * Renders as a horizontal breadcrumb on ≥sm screens; hidden on mobile
 * where vertical space is more valuable.
 */
export function StepIndicator({ currentStep }: { currentStep: number }) {
  const t = useTranslations("draft");
  const activeStep = STEPS[currentStep] ?? STEPS[0];

  return (
    <>
      <div
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 sm:hidden"
        aria-label="Progress"
      >
        <span className="text-xs font-semibold text-gray-500">
          {currentStep + 1}/{STEPS.length}
        </span>
        <span className="text-sm font-medium text-gray-900">{t(activeStep)}</span>
      </div>

      <nav className="hidden items-center gap-2 sm:flex" aria-label="Progress">
        {STEPS.map((key, i) => {
          const isActive = i === currentStep;
          const isDone = i < currentStep;
          return (
            <span key={key} className="flex items-center gap-1.5 text-sm">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-medium ${
                  isActive
                    ? "bg-primary text-white"
                    : isDone
                      ? "bg-success/10 text-success"
                      : "bg-gray-100 text-gray-400"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </span>
              <span className={isActive ? "font-medium text-gray-900" : "text-gray-400"}>
                {t(key)}
              </span>
            </span>
          );
        })}
      </nav>
    </>
  );
}
