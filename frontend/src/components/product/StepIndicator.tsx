"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronDown } from "lucide-react";
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
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeStep = STEPS[currentStep] ?? STEPS[0];

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function stepHref(index: number) {
    return `/draft/${draftId}${STEP_SUFFIXES[index]}`;
  }

  function navigateToStep(index: number) {
    setIsOpen(false);
    router.push(stepHref(index));
  }

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
            onClick={() => navigateToStep(index)}
            className={`flex min-w-0 items-center gap-3 rounded-[1.35rem] border px-3 py-3 text-left transition ${
              isAvailable
                ? "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50"
                : "cursor-not-allowed border-stone-200/70 bg-stone-50/80 opacity-65"
            } ${isCurrent ? "border-amber-300 bg-amber-50/70" : ""}`}
          >
            <span
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${
                isCurrent
                  ? "bg-stone-950 text-white"
                  : isComplete
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-stone-100 text-stone-400"
              }`}
            >
              {isComplete ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-950">{t(key)}</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">
                {t("stepProgress", { current: index + 1, total: STEPS.length })}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );

  const mobileStrip = (
    <div className="sm:hidden">
      <div className="flex items-center gap-2.5 rounded-[1.15rem] border border-stone-200 bg-white px-3 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-semibold text-stone-950">{t(activeStep)}</p>
            <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
              {currentStep + 1}/{STEPS.length}
            </p>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            {STEPS.map((key, index) => (
              <span
                key={key}
                className={`h-1.5 w-1.5 rounded-full transition ${
                  index < currentStep
                    ? "bg-emerald-500"
                    : index === currentStep
                      ? "bg-stone-950"
                      : "bg-stone-200"
                }`}
              />
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={t("stepMenuLabel")}
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-600 transition hover:border-stone-300 hover:bg-stone-100"
        >
          <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen ? (
        <div
          role="menu"
          className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-40 rounded-[1.5rem] border border-stone-200 bg-white p-2 shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
        >
          {STEPS.map((key, index) => {
            const isCurrent = index === currentStep;
            const isComplete = index < currentStep;
            const isAvailable = index <= currentStep;

            return (
              <button
                key={key}
                type="button"
                role="menuitem"
                disabled={!isAvailable}
                onClick={() => navigateToStep(index)}
                className={`flex w-full items-center justify-between gap-3 rounded-[1.15rem] px-3 py-3 text-left transition ${
                  isAvailable ? "hover:bg-stone-50" : "cursor-not-allowed opacity-55"
                } ${isCurrent ? "bg-amber-50/80" : ""}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold ${
                      isCurrent
                        ? "bg-stone-950 text-white"
                        : isComplete
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-stone-100 text-stone-400"
                    }`}
                  >
                    {isComplete ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-950">{t(key)}</p>
                    <p className="text-xs text-stone-500">
                      {t("stepProgress", { current: index + 1, total: STEPS.length })}
                    </p>
                  </div>
                </div>
                {!isAvailable ? (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                    {t("stepLocked")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="relative w-full" ref={menuRef}>
      {compact ? mobileStrip : desktopRail}
    </div>
  );
}
