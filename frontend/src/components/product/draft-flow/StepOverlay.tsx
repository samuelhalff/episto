"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { X, Check, ChevronRight } from "lucide-react";

interface Step {
  id: string;
  title: string;
}

interface StepOverlayProps {
  currentStep: number;
  steps: Step[];
  onClose: () => void;
  onSelect: (index: number) => void;
  isCompactViewport?: boolean;
}

export function StepOverlay({
  currentStep,
  steps,
  onClose,
  onSelect,
  isCompactViewport = false,
}: StepOverlayProps) {
  const t = useTranslations("draft");
  const tc = useTranslations("common");
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap: capture previous focus and auto-focus panel on open
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => panelRef.current?.focus());
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    },
    [onClose],
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/20"
        onClick={onClose}
        role="presentation"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("stepsTitle")}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`fixed z-[100] flex flex-col border-zinc-100 bg-white shadow-[0_-20px_50px_rgba(0,0,0,0.15)] outline-none transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950 ${
          isCompactViewport
            ? "inset-0"
            : "inset-x-0 bottom-0 max-h-[85%] rounded-t-[32px] border-t"
        }`}
      >
        <div
          className={`shrink-0 px-6 ${
            isCompactViewport
              ? "border-b border-zinc-100 pb-5 pt-8 dark:border-zinc-800"
              : "flex items-center justify-between pb-4 pt-8"
          }`}
        >
          <div className={isCompactViewport ? "space-y-1" : ""}>
            <h3 className="text-lg font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{t("stepsTitle")}</h3>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {t("stepsProgressOverview")}
            </p>
          </div>
          {!isCompactViewport ? (
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-transform active:scale-90 dark:bg-zinc-800 dark:text-zinc-300"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        <div className={`flex-1 overflow-y-auto px-4 ${isCompactViewport ? "pb-4 pt-4" : "pb-8"} space-y-1`}>
          {steps.map((step, idx) => {
            const isCurrent = idx === currentStep;
            const isCompleted = idx < currentStep;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  onSelect(idx);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-[20px] transition-all active:scale-[0.98] ${
                  isCompactViewport ? "p-4" : "p-3"
                } ${
                  isCurrent
                    ? "bg-zinc-50 ring-1 ring-zinc-950/5 shadow-sm dark:bg-zinc-900 dark:ring-white/10"
                    : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black transition-colors ${
                    isCurrent
                      ? "bg-zinc-950 text-white dark:bg-amber-400 dark:text-zinc-950"
                      : isCompleted
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <div className="flex-1 text-left">
                  <div
                    className={`text-[13px] font-bold leading-tight ${
                      isCurrent ? "text-zinc-950 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {step.title}
                  </div>
                </div>
                {isCurrent && (
                  <div className="mr-1 h-1.5 w-1.5 rounded-full bg-zinc-950 dark:bg-amber-400" />
                )}
                {!isCurrent && !isCompleted && (
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-200 dark:text-zinc-700" />
                )}
              </button>
            );
          })}
        </div>

        {isCompactViewport ? (
          <div className="shrink-0 border-t border-zinc-100 bg-white p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] dark:border-zinc-800 dark:bg-zinc-950">
            <button
              type="button"
              onClick={onClose}
              className="flex h-14 w-full items-center justify-center rounded-[18px] bg-zinc-950 text-sm font-bold text-white"
            >
              <X className="mr-2 h-4 w-4" />
              {tc("hide")}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
