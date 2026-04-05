"use client";

import { type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { WorkspaceSiteMenu } from "./WorkspaceSiteMenu";
import { SecondaryButton } from "./cards";
import { StepTriggerButton } from "./draft-composer";
import { ScrollShadowViewport } from "../../ui/scroll-shadow";

interface DraftShellProps {
  step?: number;
  totalSteps?: number;
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  primaryAction?: ReactNode;
  secondaryActionLabel?: string | undefined;
  onSecondaryAction?: (() => void) | undefined;
  composer?: ReactNode;
  onStepClick?: () => void;
  stepTriggerLabel?: string | undefined;
  isStepMenuOpen?: boolean | undefined;
  isInputFocused?: boolean | undefined;
  isCompactViewport?: boolean | undefined;
  hideDockStepTrigger?: boolean | undefined;
  isNavigating?: boolean | undefined;
  onTogglePreview?: (() => void) | undefined;
  isPreviewPanelVisible?: boolean | undefined;
}

export function DraftShell({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  primaryAction,
  secondaryActionLabel,
  onSecondaryAction,
  composer,
  onStepClick,
  stepTriggerLabel,
  isStepMenuOpen,
  isInputFocused = false,
  isCompactViewport = false,
  hideDockStepTrigger = false,
  isNavigating = false,
  onTogglePreview,
  isPreviewPanelVisible = false,
}: DraftShellProps) {
  const tc = useTranslations("common");
  const isCompressed = isCompactViewport;
  const useInlineDock = isCompactViewport;

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
        <div className="mx-auto w-full max-w-3xl xl:max-w-4xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {!isCompactViewport ? (
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    {tc("appName")}
                  </p>
                  {step != null && totalSteps != null && onStepClick ? (
                    <button
                      type="button"
                      onClick={onStepClick}
                      disabled={isNavigating}
                      aria-label={`Step ${step + 1} of ${totalSteps} — view all steps`}
                      className="group -mr-1 inline-flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
                    >
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalSteps }, (_, i) => (
                          <div
                            key={i}
                            className={`h-1.5 rounded-full transition-all ${
                              i === step
                                ? "w-4 bg-amber-500 dark:bg-amber-400"
                                : i < step
                                  ? "w-2 bg-zinc-400 dark:bg-zinc-500"
                                  : "w-1.5 bg-zinc-200 dark:bg-zinc-700"
                            }`}
                          />
                        ))}
                      </div>
                      <span aria-hidden="true" className="text-[11px] font-medium text-zinc-400 transition-colors group-hover:text-zinc-600 dark:text-zinc-500 dark:group-hover:text-zinc-300">
                        {step + 1} / {totalSteps}
                      </span>
                    </button>
                  ) : null}
                </div>
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

      <div className={`mx-auto flex min-h-0 min-w-0 w-full flex-1 overflow-x-hidden ${isCompactViewport ? "" : "max-w-3xl px-4 lg:px-6 xl:max-w-4xl"}`}>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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
              {onTogglePreview ? (
                <button
                  type="button"
                  onClick={onTogglePreview}
                  disabled={isNavigating}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label={isPreviewPanelVisible ? tc("hidePreview") : tc("showPreview")}
                >
                  {isPreviewPanelVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              ) : null}
              {!hideDockStepTrigger && isCompactViewport ? (
                <StepTriggerButton
                  size="dock"
                  isOpen={isStepMenuOpen}
                  aria-label={stepTriggerLabel}
                  disabled={isNavigating}
                  onClick={onStepClick}
                />
              ) : null}
              {secondaryActionLabel || primaryAction ? (
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {secondaryActionLabel && onSecondaryAction ? (
                    <div className="min-w-0 max-w-[13rem] flex-1 sm:max-w-[15rem]">
                      <SecondaryButton
                        onClick={onSecondaryAction}
                        disabled={isNavigating}
                        fullWidth
                      >
                        {secondaryActionLabel}
                      </SecondaryButton>
                    </div>
                  ) : null}
                  {primaryAction ? (
                    <div className="min-w-0 flex-1">
                      {primaryAction}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
