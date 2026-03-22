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
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="flex h-12 items-center justify-between gap-3 sm:hidden">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-stone-950"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-200/80 bg-white text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-900 shadow-sm">
              SM
            </span>
            <span>{tc("appName")}</span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </div>

        <div className="pb-1.5 sm:hidden">
          <StepIndicator currentStep={currentStep} draftId={draftId} compact />
        </div>

        <div className="hidden h-16 items-center gap-4 sm:flex">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold tracking-[-0.02em] text-stone-950 sm:text-base"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-200/80 bg-white text-xs font-semibold uppercase tracking-[0.18em] text-stone-900 shadow-sm">
              SM
            </span>
            <span>{tc("appName")}</span>
          </Link>

          <div className="min-w-0 flex-1">
            <StepIndicator currentStep={currentStep} draftId={draftId} />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {actions}
            {statusLabel ? (
              <span className="hidden text-sm font-medium text-stone-500 lg:inline">
                {statusLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
