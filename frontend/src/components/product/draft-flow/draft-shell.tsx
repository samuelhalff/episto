"use client";

import { type ReactNode, useRef, useEffect } from "react";
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

  const dockRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dock = dockRef.current;
    const content = contentRef.current;
    if (!dock || !content) return;

    const sync = () => {
      content.style.paddingBottom = `${dock.offsetHeight + 16}px`;
    };
    sync();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(sync);
    observer.observe(dock);
    return () => observer.disconnect();
  }, []);

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

      <div className="flex min-h-0 min-w-0 w-full flex-1 overflow-x-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ScrollShadowViewport
            onPointerDownCapture={(event) => handleSurfacePointerDown(event.target)}
            onScroll={() => {
              if (isCompactViewport && isInputFocused) {
                dismissKeyboard();
              }
            }}
            surface="muted"
            className={`min-h-0 min-w-0 flex-1 overflow-y-auto ${isCompactViewport ? "px-4" : ""}`}
          >
            {/* Content wrapper — fills at least the scroll viewport so dock stays at bottom */}
            <div className="flex min-h-full flex-col">
              {/* Sticky chrome bar */}
              <div
                onPointerDownCapture={(event) => handleSurfacePointerDown(event.target)}
                className={`sticky top-0 z-20 bg-[var(--app-surface-muted)] ${
                  isCompressed
                    ? "px-6 pb-1 pt-5 sm:px-8"
                    : "border-b border-zinc-200/60 px-6 py-3 sm:px-8 lg:px-10 dark:border-zinc-800/40"
                }`}
              >
                <div className="mx-auto w-full max-w-[1400px]">
                  {isCompressed ? (
                    /* Mobile: compact title + subtitle + menu */
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-[26px] font-bold leading-[1.1] tracking-tight text-zinc-950 dark:text-zinc-50">
                          {title}
                        </h2>
                        {subtitle ? (
                          <p className="mt-1 text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                            {subtitle}
                          </p>
                        ) : null}
                      </div>
                      <WorkspaceSiteMenu isCompactViewport />
                    </div>
                  ) : (
                    /* Desktop: app name + step indicator + menu */
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                        {tc("appName")}
                      </p>
                      <div className="flex items-center gap-2">
                        {step != null && totalSteps != null && onStepClick ? (
                          <button
                            type="button"
                            onClick={onStepClick}
                            disabled={isNavigating}
                            aria-label={`Step ${step + 1} of ${totalSteps} — view all steps`}
                            className="group inline-flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
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
                        <WorkspaceSiteMenu isCompactViewport={false} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Title block — scrolls away on desktop; mobile title is in the sticky bar */}
              {!isCompressed ? (
                <div className="px-6 pb-4 pt-6 sm:px-8 lg:px-10 lg:pb-6 lg:pt-8">
                  <div className="mx-auto w-full max-w-[1400px]">
                    <h2 className="text-[32px] font-bold leading-[1.1] tracking-tight text-zinc-950 lg:text-[40px] dark:text-zinc-50">
                      {title}
                    </h2>
                    {subtitle ? (
                      <p className="mt-2 text-[15px] leading-relaxed text-zinc-500 lg:max-w-[58ch] lg:text-base dark:text-zinc-400">
                        {subtitle}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Step content — flex-1 fills remaining space; pb is CSS fallback, overridden by ResizeObserver */}
              <div ref={contentRef} className={isCompactViewport ? "flex-1 pb-32 pt-5" : "mx-auto w-full max-w-[1400px] flex-1 px-4 pb-36 pt-2 lg:px-6"}>
                {children}
              </div>

              {/* Dock — sticky at scroll viewport bottom (scrollbar covers full height) */}
              <div
                ref={dockRef}
                className="relative sticky bottom-0 z-20 bg-[var(--app-surface-muted)] px-2 lg:px-0"
                style={{
                  paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${isCompactViewport ? "0.5rem" : "0.75rem"})`,
                  paddingTop: isCompactViewport ? "0" : "1rem",
                }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 z-0 h-8 -translate-y-full bg-gradient-to-t from-[var(--app-surface-muted)] to-transparent"
                />
                <div className={isCompactViewport ? "" : "mx-auto w-full max-w-5xl px-4 lg:px-6"}>
                  {composer ? (
                    <div
                      data-draft-keep-focus
                      className={`relative z-10 min-w-0 ${isCompactViewport ? "mb-3 pt-1" : "mb-5"}`}
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
          </ScrollShadowViewport>
        </div>

      </div>
    </div>
  );
}
