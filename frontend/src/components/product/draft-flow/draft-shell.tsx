"use client";

import { type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { WorkspaceSiteMenu } from "./WorkspaceSiteMenu.js";
import { DRAFT_WORKSPACE_STEPS } from "./steps.js";
import { Card } from "./cards.js";
import { StepTriggerButton } from "./draft-composer.js";

interface DraftShellProps {
  step?: number;
  totalSteps?: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  primaryAction?: ReactNode;
  composer?: ReactNode;
  onStepClick?: () => void;
  stepTriggerLabel?: string | undefined;
  isStepMenuOpen?: boolean | undefined;
  isInputFocused?: boolean | undefined;
  isCompactViewport?: boolean | undefined;
  hideDockStepTrigger?: boolean | undefined;
}

export function DraftShell({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  primaryAction,
  composer,
  onStepClick,
  stepTriggerLabel,
  isStepMenuOpen,
  isInputFocused = false,
  isCompactViewport = false,
  hideDockStepTrigger = false,
}: DraftShellProps) {
  const t = useTranslations("draft");
  const tc = useTranslations("common");
  const isCompressed = isCompactViewport;
  const useInlineDock = isCompactViewport;
  const shouldHideDock = Boolean(composer) && isCompactViewport && isInputFocused;
  const currentStepIndex = Math.max(0, (step ?? 1) - 1);
  const desktopSteps = DRAFT_WORKSPACE_STEPS.slice(0, totalSteps ?? DRAFT_WORKSPACE_STEPS.length);

  function dismissKeyboard() {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  function handleSurfacePointerDown(target: EventTarget | null) {
    if (!shouldHideDock || !(target instanceof Element)) {
      return;
    }

    if (
      target.closest("[data-draft-keep-focus]") ||
      target.closest("input, textarea, select, button, a, [role='button'], [contenteditable='true']")
    ) {
      return;
    }

    dismissKeyboard();
  }

  return (
    <div className="relative flex h-full flex-col bg-[#f6f4ef] transition-colors dark:bg-zinc-950">
      <div
        onPointerDownCapture={(event) => handleSurfacePointerDown(event.target)}
        className={`shrink-0 transition-all duration-300 ${
          isCompressed ? "px-6 pb-1 pt-5 sm:px-8" : "px-6 pb-4 pt-7 sm:px-8 lg:px-10 lg:pb-6 lg:pt-9"
        }`}
      >
        <div className={`mx-auto w-full ${isCompactViewport ? "" : "max-w-[1380px]"}`}>
          <div className={`flex items-start justify-between gap-4 ${isCompactViewport ? "" : "lg:max-w-[760px]"}`}>
            <div className="min-w-0 flex-1">
              {!isCompactViewport ? (
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400 dark:text-zinc-500">
                  {tc("appName")}
                </p>
              ) : null}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2
                    className={`font-bold leading-[1.1] tracking-tight text-zinc-950 transition-all duration-300 dark:text-zinc-50 ${
                      isCompressed ? "text-[26px]" : "text-[32px] lg:text-[40px]"
                    }`}
                  >
                    {title}
                  </h2>
                  <p
                    className={`mt-2 leading-relaxed text-zinc-500 transition-all duration-300 dark:text-zinc-400 ${
                      isCompressed ? "text-[13px]" : "text-[15px] lg:max-w-[58ch] lg:text-[16px]"
                    }`}
                  >
                    {subtitle}
                  </p>
                </div>
                <WorkspaceSiteMenu isCompactViewport={isCompactViewport} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`mx-auto flex min-h-0 w-full flex-1 ${isCompactViewport ? "" : "max-w-[1380px] gap-8 px-4 lg:px-10"}`}>
        <div className={`flex min-h-0 flex-1 flex-col ${isCompactViewport ? "" : "lg:max-w-[760px]"}`}>
          <div
            onPointerDownCapture={(event) => handleSurfacePointerDown(event.target)}
            onScroll={() => {
              if (shouldHideDock) {
                dismissKeyboard();
              }
            }}
            className={`min-h-0 flex-1 overflow-y-auto ${isCompactViewport ? "px-4" : ""} ${
              useInlineDock
                ? "pb-4"
                : composer
                  ? isCompressed
                    ? "pb-28"
                    : "pb-40"
                  : isCompressed
                    ? "pb-24"
                : "pb-32"
            }`}
          >
            <div
              aria-hidden="true"
              className={`pointer-events-none sticky top-0 z-10 bg-gradient-to-b from-[#f6f4ef] via-[#f6f4ef]/90 to-transparent dark:from-zinc-950 dark:via-zinc-950/90 ${
                isCompactViewport ? "-mb-6 h-6 -mx-4" : "-mb-8 h-8"
              }`}
            />
            <div className={isCompactViewport ? "pt-2" : "pt-1"}>
              {children}
            </div>
          </div>

          <div
            className={`left-0 right-0 z-20 px-2 ${useInlineDock ? "pt-0" : "pt-4"} ${
              useInlineDock
                ? "relative mt-auto bg-[#f6f4ef] dark:bg-zinc-950"
                : "absolute bottom-0 bg-gradient-to-t from-[#f6f4ef] via-[#f6f4ef] to-transparent dark:from-zinc-950 dark:via-zinc-950 lg:static lg:bg-transparent lg:px-0 lg:pb-8 lg:pt-5"
            }`}
            style={{
              paddingBottom: useInlineDock
                ? "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)"
                : "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
            }}
          >
            {useInlineDock ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-5 -translate-y-full bg-gradient-to-t from-[#f6f4ef] via-[#f6f4ef]/80 to-transparent dark:from-zinc-950 dark:via-zinc-950/80"
              />
            ) : null}
            {composer ? (
              <div data-draft-keep-focus className={useInlineDock ? "mb-0" : "mb-4"}>
                {composer}
              </div>
            ) : null}

            {!shouldHideDock ? (
              <div className="flex items-center gap-3">
                {!hideDockStepTrigger ? (
                  <StepTriggerButton
                    size="dock"
                    isOpen={isStepMenuOpen}
                    aria-label={stepTriggerLabel}
                    onClick={onStepClick}
                  />
                ) : null}
                {primaryAction ? (
                  <div
                    className={`flex-1 ${
                      isCompactViewport
                        ? ""
                        : "rounded-[20px] bg-white p-1.5 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900 dark:ring-white/10"
                    }`}
                  >
                    {primaryAction}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {!isCompactViewport ? (
          <aside className="hidden w-[320px] shrink-0 lg:block">
            <div className="sticky top-8 space-y-4 pb-8">
              <Card className="bg-white/80 backdrop-blur-sm dark:bg-zinc-900/90">
                <div className="space-y-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                      {t("stepProgress", { current: step ?? 1, total: totalSteps ?? desktopSteps.length })}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{subtitle}</p>
                  </div>

                  {onStepClick ? (
                    <button
                      type="button"
                      onClick={onStepClick}
                      className="inline-flex min-h-11 items-center rounded-full bg-zinc-100 px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                    >
                      {stepTriggerLabel ?? t("stepsTitle")}
                    </button>
                  ) : null}
                </div>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm dark:bg-zinc-900/90">
                <div className="space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                    {t("stepsProgressOverview")}
                  </div>
                  <div className="space-y-2">
                    {desktopSteps.map((desktopStep, index) => {
                      const isCurrent = index === currentStepIndex;
                      const isCompleted = index < currentStepIndex;
                      return (
                        <div
                          key={desktopStep.slug}
                          className={`flex items-center gap-3 rounded-[18px] px-3 py-3 ${
                            isCurrent
                              ? "bg-zinc-50 ring-1 ring-zinc-950/5 dark:bg-zinc-800/70 dark:ring-white/10"
                              : "bg-transparent"
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
                              isCurrent
                                ? "bg-zinc-950 text-white dark:bg-amber-400 dark:text-zinc-950"
                                : isCompleted
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                                  : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                            }`}
                          >
                            {isCompleted ? <Check className="h-4 w-4" /> : desktopStep.id}
                          </div>
                          <div className="min-w-0">
                            <div
                              className={`text-sm font-semibold ${
                                isCurrent ? "text-zinc-950 dark:text-zinc-50" : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {t(desktopStep.titleKey)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              <Card className="bg-white/70 dark:bg-zinc-900/80">
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
                    {tc("appName")}
                  </div>
                  <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    {t("previewHint")}
                  </p>
                </div>
              </Card>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
