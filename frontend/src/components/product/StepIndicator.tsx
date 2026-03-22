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
}: {
  currentStep: number;
  draftId: string;
}) {
  const t = useTranslations("draft");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const progressWidth =
    currentStep === 0 ? "0%" : `${(currentStep / (STEPS.length - 1)) * 100}%`;

  useEffect(() => {
    if (!isOpen) return;

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

  function navigateTo(index: number) {
    if (index <= currentStep) {
      setIsOpen(false);
      router.push(`/draft/${draftId}${STEP_SUFFIXES[index]}`);
    }
  }

  const mobileIndicator = (
    <div className="relative sm:hidden" ref={menuRef}>
      <div className="flex items-center gap-2">
        <div className="flex items-center">
          {STEPS.map((key, index) => {
            const isComplete = index < currentStep;
            const isCurrent = index === currentStep;
            const isAvailable = index <= currentStep;
            const isLast = index === STEPS.length - 1;

            return (
              <div key={key} className="flex items-center">
                <button
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => navigateTo(index)}
                  aria-label={t(key)}
                  className={`relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300 ${
                    isCurrent
                      ? "bg-stone-950 text-white shadow-sm"
                      : isComplete
                        ? "bg-emerald-500 text-white"
                        : "bg-stone-200 text-stone-400"
                  } ${isAvailable ? "cursor-pointer" : "cursor-default"}`}
                >
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full border border-stone-950/15 animate-[step-pulse_2s_ease-in-out_infinite]" />
                  )}
                  {isComplete ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </button>
                {!isLast && (
                  <div
                    className={`h-[2px] w-4 transition-colors duration-500 ${
                      index < currentStep ? "bg-emerald-500" : "bg-stone-200"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <span className="flex-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
          {t(STEPS[currentStep] ?? STEPS[0])}
        </span>

        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-label={t("stepMenuLabel")}
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-500 transition hover:border-stone-300 hover:bg-stone-100"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {isOpen && (
        <div
          role="menu"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-stone-200 bg-white p-1.5 shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
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
                onClick={() => navigateTo(index)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  isAvailable ? "hover:bg-stone-50" : "cursor-not-allowed opacity-50"
                } ${isCurrent ? "bg-amber-50/80" : ""}`}
              >
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isCurrent
                      ? "bg-stone-950 text-white"
                      : isComplete
                        ? "bg-emerald-500 text-white"
                        : "bg-stone-100 text-stone-400"
                  }`}
                >
                  {isComplete ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-950">{t(key)}</p>
                </div>
                {!isAvailable && (
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">
                    {t("stepLocked")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const desktopIndicator = (
    <div className="relative hidden sm:block">
      <div className="absolute left-10 right-10 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-stone-200/80" />
      <div
        className="absolute left-10 top-1/2 h-[6px] -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-400 via-emerald-500 to-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.35)] transition-[width] duration-700 ease-out"
        style={{
          width: currentStep === 0 ? "0%" : `calc(${progressWidth} - 20px)`,
        }}
      />

      <div className="relative z-10 grid grid-cols-4 gap-4">
        {STEPS.map((key, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          const isAvailable = index <= currentStep;

          return (
            <div key={key} className="flex justify-center">
              <button
                type="button"
                disabled={!isAvailable}
                onClick={() => navigateTo(index)}
                className={`group inline-flex min-w-[9rem] items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  isCurrent
                    ? "border-stone-950 bg-stone-950 text-white shadow-[0_16px_34px_rgba(28,25,23,0.18)]"
                    : isComplete
                      ? "border-emerald-200 bg-white text-stone-900 shadow-sm hover:border-emerald-300 hover:bg-emerald-50"
                      : "border-stone-200 bg-white/90 text-stone-400"
                } ${isAvailable ? "cursor-pointer" : "cursor-default"}`}
              >
                <span
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors duration-300 ${
                    isCurrent
                      ? "bg-white/15 text-white"
                      : isComplete
                        ? "bg-emerald-500 text-white"
                        : "bg-stone-100 text-stone-400"
                  }`}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    index + 1
                  )}
                </span>
                <span>{t(key)}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="w-full">
      {mobileIndicator}
      {desktopIndicator}
      <style>{`
        @keyframes step-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
