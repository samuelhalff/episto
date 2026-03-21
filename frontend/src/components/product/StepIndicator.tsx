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

  return (
    <div className="relative w-full max-w-xs sm:max-w-sm" ref={menuRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t("stepMenuLabel")}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-4 rounded-[1.4rem] border border-stone-200 bg-white px-4 py-3 text-left shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:border-stone-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-stone-950 text-sm font-semibold text-white">
            {currentStep + 1}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
              {t("stepProgress", { current: currentStep + 1, total: STEPS.length })}
            </p>
            <p className="truncate text-sm font-semibold text-stone-950 sm:text-base">
              {t(activeStep)}
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-stone-500 transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

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
                onClick={() => {
                  setIsOpen(false);
                  router.push(stepHref(index));
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-[1.15rem] px-3 py-3 text-left transition ${
                  isAvailable
                    ? "hover:bg-stone-50"
                    : "cursor-not-allowed opacity-55"
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
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
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
}
