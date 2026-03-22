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

  function stepHref(index: number) {
    return `/draft/${draftId}${STEP_SUFFIXES[index]}`;
  }

  const compactDots = (
    <div className="flex items-center gap-1.5">
      {STEPS.map((key, index) => {
        const isComplete = index < currentStep;
        const isCurrent = index === currentStep;
        const dotClass = `h-2 w-2 rounded-full ${
          isComplete
            ? "bg-emerald-500"
            : isCurrent
              ? "bg-stone-950"
              : "bg-stone-200"
        }`;

        return isComplete ? (
          <button
            key={key}
            type="button"
            onClick={() => router.push(stepHref(index))}
            className={dotClass}
            aria-label={t(key)}
          />
        ) : (
          <span key={key} className={dotClass} />
        );
      })}
    </div>
  );

  const desktopRail = (
    <div className="hidden w-full grid-cols-4 gap-2 sm:grid">
      {STEPS.map((key, index) => {
        const isCurrent = index === currentStep;
        const isComplete = index < currentStep;
        const isAvailable = index <= currentStep;

        return (
          <button
            key={key}
            type="button"
            disabled={!isAvailable}
            onClick={() => router.push(stepHref(index))}
            className={`flex min-w-0 items-center gap-2.5 rounded-[1.35rem] border px-2.5 py-1.5 text-left transition ${
              isAvailable
                ? "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                : "cursor-not-allowed border-stone-200/70 bg-stone-50/80 opacity-65"
            } ${isCurrent ? "border-amber-300 bg-amber-50/70" : ""}`}
          >
            <span
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${
                isCurrent
                  ? "bg-stone-950 text-white"
                  : isComplete
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-stone-100 text-stone-400"
              }`}
            >
              {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <p className="truncate text-sm font-semibold text-stone-950">{t(key)}</p>
          </button>
        );
      })}
    </div>
  );

  return <div className="w-full">{compact ? compactDots : desktopRail}</div>;
}
