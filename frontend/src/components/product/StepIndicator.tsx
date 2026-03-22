"use client";

import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { useRouter } from "../../i18n/navigation.js";

const STEPS = ["stepDraft", "stepReview", "stepPay", "stepDone"] as const;
const STEP_SUFFIXES = ["", "/review", "/checkout", "/confirmation"] as const;

export function StepIndicator({
  currentStep,
  draftId,
  compact = false,
}: {
  currentStep: number;
  draftId: string;
  compact?: boolean;
}) {
  const t = useTranslations("draft");
  const router = useRouter();

  function navigateTo(index: number) {
    if (index <= currentStep) {
      router.push(`/draft/${draftId}${STEP_SUFFIXES[index]}`);
    }
  }

  // Mobile: animated progress track with step label.
  const mobileIndicator = (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-0">
        {STEPS.map((key, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const isLast = index === STEPS.length - 1;

          return (
            <div key={key} className="flex items-center">
              <button
                type="button"
                disabled={index > currentStep}
                onClick={() => navigateTo(index)}
                aria-label={t(key)}
                className={`relative shrink-0 rounded-full transition-all duration-300 ${
                  isComplete
                    ? "h-2.5 w-2.5 bg-emerald-500"
                    : isCurrent
                      ? "h-3.5 w-3.5 bg-stone-950 shadow-[0_0_0_3px_rgba(28,25,23,0.1)]"
                      : "h-2 w-2 bg-stone-300"
                } ${index <= currentStep ? "cursor-pointer" : "cursor-default"}`}
              >
                {isCurrent && (
                  <span className="absolute inset-0 animate-[step-pulse_2s_ease-in-out_infinite] rounded-full ring-2 ring-stone-950/20" />
                )}
              </button>
              {!isLast && (
                <div
                  className={`h-[2px] w-5 transition-colors duration-300 ${
                    index < currentStep ? "bg-emerald-500" : "bg-stone-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <span className="text-xs font-semibold text-stone-700">
        {t(STEPS[currentStep] ?? STEPS[0])}
      </span>
      <style>{`
        @keyframes step-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );

  // Desktop: connected rail with animated progress line.
  const desktopIndicator = (
    <div className="relative flex w-full items-center">
      <div className="absolute left-0 right-0 top-1/2 z-0 h-[2px] -translate-y-1/2 bg-stone-200" />
      <div
        className="absolute left-0 top-1/2 z-0 h-[2px] -translate-y-1/2 bg-emerald-500 transition-[width] duration-500 ease-out"
        style={{
          width:
            currentStep === 0
              ? "0%"
              : `${(currentStep / (STEPS.length - 1)) * 100}%`,
        }}
      />

      <div className="relative z-10 grid w-full grid-cols-4">
      {STEPS.map((key, index) => {
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;
        const isAvailable = index <= currentStep;

        return (
          <div key={key} className="flex justify-center">
            <button
              type="button"
              onClick={() => navigateTo(index)}
              className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all duration-200 ${
                isCurrent
                  ? "border-amber-300/80 bg-amber-50 shadow-sm"
                  : isComplete
                    ? "border-emerald-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/50"
                    : "border-stone-200/70 bg-stone-50 opacity-60"
              } ${isAvailable ? "cursor-pointer" : "cursor-not-allowed"}`}
            >
              <span
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-200 ${
                  isCurrent
                    ? "bg-stone-950 text-white shadow-sm"
                    : isComplete
                      ? "bg-emerald-500 text-white"
                      : "bg-stone-200 text-stone-400"
                }`}
              >
                {isComplete ? (
                  <Check className="h-3 w-3" strokeWidth={3} />
                ) : (
                  index + 1
                )}
              </span>
              <span
                className={`hidden text-sm font-medium lg:inline ${
                  isCurrent
                    ? "text-stone-950"
                    : isComplete
                      ? "text-stone-700 group-hover:text-emerald-700"
                      : "text-stone-400"
                }`}
              >
                {t(key)}
              </span>
            </button>
          </div>
        );
      })}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {compact ? mobileIndicator : desktopIndicator}
    </div>
  );
}
