"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronRight, Lock } from "lucide-react";
import {
  getSheetSurfaceClassName,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHandle,
  SheetHeader,
  SheetTitle,
} from "../../ui/sheet";
import { SecondaryButton } from "./ui";

interface Step {
  id: string;
  title: string;
}

interface StepOverlayProps {
  currentStep: number;
  furthestUnlockedStepIndex: number;
  steps: Step[];
  onClose: () => void;
  onSelect: (index: number) => void;
}

export function StepList({
  steps,
  currentStep,
  furthestUnlockedStepIndex,
  onSelect,
}: {
  steps: Step[];
  currentStep: number;
  furthestUnlockedStepIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      {steps.map((step, idx) => {
        const isCurrent = idx === currentStep;
        const isCompleted = idx < currentStep;
        const isLocked = idx > furthestUnlockedStepIndex;

        return (
          <button
            key={step.id}
            type="button"
            disabled={isLocked}
            onClick={() => {
              if (!isLocked) onSelect(idx);
            }}
            className={`flex min-w-0 w-full items-center gap-3 overflow-hidden rounded-2xl p-3 text-left transition-all active:scale-[0.98] ${
               isCurrent
                 ? "bg-[var(--app-surface-soft)] ring-1 ring-[var(--app-border-strong)] shadow-sm"
                 : isLocked
                   ? "app-list-item-muted cursor-not-allowed text-[var(--app-muted)]"
                   : "app-list-item text-zinc-600 hover:text-zinc-900 dark:text-[var(--app-muted-strong)] dark:hover:text-[var(--app-fg)]"
               }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black transition-colors ${
                isCurrent
                  ? "bg-zinc-950 text-white dark:bg-amber-400 dark:text-zinc-950"
                  : isCompleted
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-[var(--app-surface-soft)] text-zinc-400 dark:text-[var(--app-muted)]"
               }`}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : step.id}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div
                className={`truncate text-xs font-semibold leading-tight ${
                  isCurrent
                    ? "text-zinc-950 dark:text-zinc-50"
                    : isLocked
                      ? "text-[var(--app-muted)]"
                      : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                {step.title}
              </div>
            </div>
            {isLocked ? (
              <Lock className="mr-1 h-3.5 w-3.5 text-[var(--app-muted)]" />
            ) : isCurrent ? (
              <div className="mr-1 h-1.5 w-1.5 rounded-full bg-zinc-950 dark:bg-amber-400" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-zinc-200 dark:text-zinc-700" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Mobile-only bottom sheet for step navigation */
export function StepOverlay({
  currentStep,
  furthestUnlockedStepIndex,
  steps,
  onClose,
  onSelect,
}: StepOverlayProps) {
  const t = useTranslations("draft");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(true);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  function requestClose() {
    setOpen(false);
    closeTimeoutRef.current = window.setTimeout(() => {
      onClose();
    }, 180);
  }

  function handleSelect(idx: number) {
    onSelect(idx);
    requestClose();
  }

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && requestClose()}>
      <SheetContent
        side="bottom"
        className={`${getSheetSurfaceClassName("action")} max-h-[78svh]`}
      >
        <SheetHandle className="pt-3" />
        <SheetHeader>
          <SheetTitle className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {t("stepsTitle")}
          </SheetTitle>
        </SheetHeader>

        <SheetBody className="px-4 py-4 sm:px-5">
          <StepList
            steps={steps}
            currentStep={currentStep}
            furthestUnlockedStepIndex={furthestUnlockedStepIndex}
            onSelect={handleSelect}
          />
        </SheetBody>

        <SheetFooter>
          <SecondaryButton leadingVisual="hide" onClick={requestClose} hideIcon>
            {tc("hide")}
          </SecondaryButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
