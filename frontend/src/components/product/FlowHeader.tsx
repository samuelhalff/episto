"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import { StepIndicator } from "./StepIndicator";
import { LanguageSwitcher } from "../marketing/LanguageSwitcher";

interface FlowHeaderProps {
  currentStep: number;
  draftId: string;
  title: string;
  statusLabel?: string;
  actions?: ReactNode;
}

export function FlowHeader({
  currentStep,
  draftId,
  title: _title,
  statusLabel,
  actions,
}: FlowHeaderProps) {
  const tc = useTranslations("common");

  return (
    <header className="sticky top-0 z-40 bg-[var(--app-surface-muted)]/95 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-md transition-colors dark:bg-zinc-950/92 dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="flex h-14 items-center gap-3">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-zinc-950 dark:text-zinc-50"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950 text-[11px] font-semibold uppercase tracking-widest text-white shadow-sm dark:bg-amber-400 dark:text-zinc-950">
              SM
            </span>
            <span className="hidden sm:inline">{tc("appName")}</span>
          </Link>

          <div className="min-w-0 flex-1">
            <StepIndicator currentStep={currentStep} draftId={draftId} />
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {actions}
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>
            {statusLabel ? (
              <span className="hidden text-[11px] font-medium text-zinc-400 dark:text-zinc-500 lg:inline">
                {statusLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
