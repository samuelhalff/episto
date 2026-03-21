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
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/96 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-[-0.02em] text-stone-950 sm:text-base"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-amber-200/80 bg-white text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-900 shadow-sm sm:h-9 sm:w-9 sm:text-xs">
            SM
          </span>
          <span className="hidden sm:inline">{tc("appName")}</span>
        </Link>

        <div className="hidden md:block">
          <StepIndicator currentStep={currentStep} draftId={draftId} />
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <span className="hidden text-sm font-medium text-stone-500 lg:inline">
            {statusLabel ?? title}
          </span>
        </div>
      </div>
    </header>
  );
}
