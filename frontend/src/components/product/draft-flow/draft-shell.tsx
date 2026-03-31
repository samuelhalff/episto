"use client";

import { type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Check, Lock } from "lucide-react";
import { WorkspaceSiteMenu } from "./WorkspaceSiteMenu";
import { DRAFT_WORKSPACE_STEPS } from "./steps";
import { Card } from "./cards";
import { StepTriggerButton } from "./draft-composer";
import { ScrollShadowViewport } from "../../ui/scroll-shadow";

interface DraftShellProps {
  step?: number;
  totalSteps?: number;
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  primaryAction?: ReactNode;
  composer?: ReactNode;
  onStepClick?: () => void;
  stepTriggerLabel?: string | undefined;
  isStepMenuOpen?: boolean | undefined;
  isInputFocused?: boolean | undefined;
  isCompactViewport?: boolean | undefined;
  hideDockStepTrigger?: boolean | undefined;
  isNavigating?: boolean | undefined;
  furthestUnlockedStepIndex?: number | undefined;
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
  isNavigating = false,
  furthestUnlockedStepIndex,
}: DraftShellProps) {
  const t = useTranslations("draft");
  const tc = useTranslations("common");
  const isCompressed = isCompactViewport;
  const useInlineDock = isCompactViewport;
  const currentStepIndex = Math.max(0, (step ?? 1) - 1);
  const desktopSteps = DRAFT_WORKSPACE_STEPS.slice(0, totalSteps ?? DRAFT_WORKSPACE_STEPS.length);
  const maxUnlockedStepIndex = Math.max(
    1,
    Math.min(furthestUnlockedStepIndex ?? currentStepIndex, desktopSteps.length - 1),
  );

  function dismissKeyboard() {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }

  function handleSurfacePointerDown(target: EventTarget | null) {
    if (!(target instanceof Element) || !isCompactViewport || !isInputFocused) {
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
    <div
      className="relative flex h-full min-w-0 flex-col overflow-x-hidden bg-[var(--app-surface-muted)] transition-colors"
      aria-busy={isNavigating}
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 z-30 h-0.5 overflow-hidden transition-opacity duration-200 ${
          isNavigating ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-transparent via-amber-400/90 to-transparent dark:via-amber-300" />
      </div>
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
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
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
                  {subtitle ? (
                    <p
                      className={`mt-2 leading-relaxed text-zinc-500 transition-all duration-300 dark:text-zinc-400 ${
                        isCompressed ? "text-[13px]" : "text-[15px] lg:max-w-[58ch] lg:text-base"
                      }`}
                    >
                      {subtitle}
                    </p>
                  ) : null}
                </div>
                <WorkspaceSiteMenu isCompactViewport={isCompactViewport} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={`mx-auto flex min-h-0 min-w-0 w-full flex-1 overflow-x-hidden ${isCompactViewport ? "" : "max-w-[1380px] gap-8 px-4 lg:px-10"}`}>
        <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${isCompactViewport ? "" : "lg:max-w-[760px]"}`}>
          <ScrollShadowViewport
            onPointerDownCapture={(event) => handleSurfacePointerDown(event.target)}
            onScroll={() => {
              if (isCompactViewport && isInputFocused) {
                dismissKeyboard();
              }
            }}
            surface="muted"
            className={`min-h-0 min-w-0 flex-1 overflow-y-auto ${isCompactViewport ? "px-4" : ""} ${
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
            <div className={isCompactViewport ? "pt-5" : "pt-2"}>
              {children}
            </div>
          </ScrollShadowViewport>

          <div
            className={`left-0 right-0 z-20 px-2 ${useInlineDock ? "pt-0" : "pt-4"} ${
              useInlineDock
                ? "relative mt-auto bg-[var(--app-surface-muted)]"
                : "absolute bottom-0 bg-gradient-to-t from-[var(--app-surface-muted)] via-[var(--app-surface-muted)] to-transparent lg:static lg:bg-transparent lg:px-0 lg:pb-8 lg:pt-6"
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
                className="pointer-events-none absolute inset-x-0 top-0 z-0 h-5 -translate-y-full bg-gradient-to-t from-[var(--app-surface-muted)] via-[var(--app-surface-muted)]/80 to-transparent"
              />
            ) : null}
            {composer ? (
              <div
                data-draft-keep-focus
                className={useInlineDock ? "relative z-10 mb-3 min-w-0 pt-1" : "relative z-10 mb-5 min-w-0"}
              >
                {composer}
              </div>
            ) : null}

            <div className="flex min-w-0 items-center gap-3">
              {!hideDockStepTrigger ? (
                <StepTriggerButton
                  size="dock"
                  isOpen={isStepMenuOpen}
                  aria-label={stepTriggerLabel}
                  disabled={isNavigating}
                  onClick={onStepClick}
                />
              ) : null}
              {primaryAction ? (
                <div className="flex-1">
                  {primaryAction}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {!isCompactViewport ? (
          <aside className="hidden w-[320px] shrink-0 lg:block">
            <div className="sticky top-8 space-y-4 pb-8">
              <Card className="bg-[var(--app-surface)] backdrop-blur-sm">
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      {t("stepProgress", { current: step ?? 1, total: totalSteps ?? desktopSteps.length })}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                      {title}
                    </h3>
                    {subtitle ? (
                      <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{subtitle}</p>
                    ) : null}
                  </div>

                  {onStepClick ? (
                    <button
                      type="button"
                      onClick={onStepClick}
                      className="inline-flex min-h-11 items-center rounded-full bg-[var(--app-surface-soft)] px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-[var(--app-surface)] dark:text-[var(--app-muted-strong)]"
                    >
                      {stepTriggerLabel ?? t("stepsTitle")}
                    </button>
                  ) : null}
                </div>
              </Card>

              <Card className="bg-[var(--app-surface)] backdrop-blur-sm">
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    {t("stepsProgressOverview")}
                  </div>
                  <div className="space-y-2">
                    {desktopSteps.map((desktopStep, index) => {
                      const isCurrent = index === currentStepIndex;
                      const isCompleted = index < currentStepIndex;
                      const isLocked = index > maxUnlockedStepIndex;
                      return (
                        <div
                          key={desktopStep.slug}
                          className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${
                            isCurrent
                              ? "bg-[var(--app-surface-soft)] ring-1 ring-[var(--app-border-strong)]"
                              : isLocked
                                ? "app-list-item-muted"
                              : "bg-transparent"
                          }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
                              isCurrent
                                ? "bg-zinc-950 text-white dark:bg-amber-400 dark:text-zinc-950"
                                : isCompleted
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
                                  : "bg-[var(--app-surface-soft)] text-zinc-400 dark:text-[var(--app-muted)]"
                             }`}
                          >
                            {isCompleted ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              desktopStep.id
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className={`truncate text-sm font-semibold ${
                                isCurrent
                                  ? "text-zinc-950 dark:text-zinc-50"
                                  : isLocked
                                    ? "text-[var(--app-muted)]"
                                    : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {t(desktopStep.titleKey)}
                            </div>
                          </div>
                          {isLocked ? (
                            <Lock className="h-3.5 w-3.5 text-[var(--app-muted)]" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              <Card className="bg-[var(--app-surface)]">
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
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
