"use client";

import { type ReactNode, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { WorkspaceSiteMenu } from "./WorkspaceSiteMenu";
import { SecondaryButton } from "./cards";
import { StepTriggerButton } from "./draft-composer";
import { StepList } from "./StepOverlay";
import { HeaderLanguageMenu } from "../../layout/HeaderLanguageMenu";
import { useStepNav, usePreviewPanel } from "./step-nav-context";
import { ScrollShadowViewport } from "../../ui/scroll-shadow";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { getAppButtonClassName } from "../../ui/app-button";

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
}: DraftShellProps) {
  const tc = useTranslations("common");
  const td = useTranslations("draft");
  const [stepPopoverOpen, setStepPopoverOpen] = useState(false);
  const stepNav = useStepNav();
  const previewPanel = usePreviewPanel();

  const dismissKeyboard = useCallback(() => {
    const el = document.activeElement;
    if (el instanceof HTMLElement) el.blur();
  }, []);

  function handleSurfacePointerDown(target: EventTarget | null) {
    if (!(target instanceof Element) || !isCompactViewport || !isInputFocused) return;
    if (
      target.closest("[data-draft-keep-focus]") ||
      target.closest("input, textarea, select, button, a, [role='button'], [contenteditable='true']")
    ) return;
    dismissKeyboard();
  }

  return (
    <div
      className="relative flex h-full min-w-0 flex-col bg-[var(--app-surface-muted)] transition-colors"
      aria-busy={isNavigating}
    >
      {/* Navigation progress indicator */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 z-30 h-0.5 overflow-hidden transition-opacity duration-200 ${
          isNavigating ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-transparent via-amber-400/90 to-transparent dark:via-amber-300" />
      </div>

      {/* ── Header — OUTSIDE scroll so it shares the same coordinate space as the Sheet overlay ── */}
      <div
        onPointerDownCapture={(event) => handleSurfacePointerDown(event.target)}
        className={`shrink-0 bg-[var(--app-surface-muted)] ${
          isCompactViewport
            ? "px-6 pb-1 pt-5 sm:px-8"
            : "border-b border-zinc-200/60 px-6 py-3 sm:px-8 lg:px-10 dark:border-zinc-800/40"
        }`}
      >
        {isCompactViewport ? (
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
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {tc("appName")}
            </p>
            <div className="flex items-center gap-2">
              {step != null && totalSteps != null && stepNav ? (
                <Popover open={stepPopoverOpen} onOpenChange={setStepPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      disabled={isNavigating}
                      aria-label={`Step ${step + 1} of ${totalSteps} — view all steps`}
                      className={getAppButtonClassName({
                        variant: "ghost",
                        size: "md",
                        className: "app-toolbar-button min-h-11 gap-2 rounded-2xl px-3.5 py-0 shadow-none",
                      })}
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
                      <span className="text-sm font-medium">
                        {step + 1}/{totalSteps}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${stepPopoverOpen ? "rotate-180" : ""}`} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" sideOffset={8} className="w-[320px] p-0">
                    <div className="px-4 pb-2 pt-4">
                      <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                        {td("stepsTitle")}
                      </h3>
                      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {td("stepsProgressOverview")}
                      </p>
                    </div>
                    <div className="px-2 pb-3">
                      <StepList
                        steps={stepNav.steps}
                        currentStep={stepNav.currentStep}
                        furthestUnlockedStepIndex={stepNav.furthestUnlockedStepIndex}
                        onSelect={(idx) => {
                          stepNav.onStepSelect(idx);
                          setStepPopoverOpen(false);
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              ) : step != null && totalSteps != null && onStepClick ? (
                <button
                  type="button"
                  onClick={onStepClick}
                  disabled={isNavigating}
                  aria-label={`Step ${step + 1} of ${totalSteps} — view all steps`}
                  className={getAppButtonClassName({
                    variant: "ghost",
                    size: "md",
                    className: "app-toolbar-button min-h-11 gap-2 rounded-2xl px-3.5 py-0 shadow-none",
                  })}
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
                  <span className="text-sm font-medium">
                    {step + 1}/{totalSteps}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isStepMenuOpen ? "rotate-180" : ""}`} />
                </button>
              ) : null}
              {previewPanel ? (
                <button
                  type="button"
                  onClick={previewPanel.onToggle}
                  aria-label={previewPanel.isVisible ? tc("hidePreview") : tc("showPreview")}
                  className={getAppButtonClassName({
                    variant: "ghost",
                    size: "md",
                    className: "app-toolbar-button min-h-11 w-11 rounded-2xl p-0 shadow-none",
                  })}
                >
                  {previewPanel.isVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              ) : null}
              <HeaderLanguageMenu />
              <WorkspaceSiteMenu isCompactViewport={false} />
            </div>
          </div>
        )}
      </div>

      {/* ── Scroll area — fills remaining height below the header ── */}
      <ScrollShadowViewport
        flush
        onPointerDownCapture={(event) => handleSurfacePointerDown(event.target)}
        onScroll={() => {
          if (isCompactViewport && isInputFocused) dismissKeyboard();
        }}
        surface="muted"
        className={`min-h-0 flex-1 ${isCompactViewport ? "px-4" : ""}`}
      >
        <div className="flex min-h-full flex-col">
          {/* ── Title block (desktop only — scrolls away) ── */}
          {!isCompactViewport ? (
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

          {/* ── Step content ── */}
          <div
            className={
              isCompactViewport
                ? "flex min-h-full flex-1 flex-col pb-10 pt-5"
                : "mx-auto w-full max-w-[1400px] flex min-h-full flex-1 flex-col px-4 pb-12 pt-2 lg:px-6"
            }
          >
            {children}
          </div>

          {/* ── Sticky dock ── */}
          <div
            className="relative sticky bottom-0 z-20 bg-[var(--app-surface-muted)] px-3 sm:px-4 lg:px-0"
            style={{
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
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

              <div className="flex min-w-0 items-center gap-3 py-1">
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
                      <div className="min-w-0 flex-1">{primaryAction}</div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </ScrollShadowViewport>
    </div>
  );
}
