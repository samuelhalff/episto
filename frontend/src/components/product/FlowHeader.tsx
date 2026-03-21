"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation.js";
import { StepIndicator } from "./StepIndicator.js";

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
  title,
  statusLabel,
  actions,
}: FlowHeaderProps) {
  const tc = useTranslations("common");

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[rgba(255,255,255,0.96)] shadow-[0_10px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:gap-4 sm:py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3 lg:w-auto lg:min-w-[11rem] lg:flex-1 lg:justify-start">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-base font-semibold tracking-[-0.02em] text-stone-950 sm:text-lg"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/80 bg-white/95 text-xs font-semibold uppercase tracking-[0.18em] text-stone-900 shadow-[0_10px_24px_rgba(120,53,15,0.10)]">
              SM
            </span>
            <span className="truncate">{tc("appName")}</span>
          </Link>

          {actions ? <div className="lg:hidden">{actions}</div> : null}
        </div>

        <div className="flex min-w-0 justify-center lg:flex-1">
          <StepIndicator currentStep={currentStep} draftId={draftId} />
        </div>

        <div className="hidden items-center justify-end gap-3 lg:flex lg:min-w-[11rem] lg:flex-1">
          {actions}
          <span className="shrink-0 text-sm font-medium text-stone-600">
            {statusLabel ?? title}
          </span>
        </div>
      </div>
    </header>
  );
}
