"use client";

import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation.js";
import { StepIndicator } from "./StepIndicator.js";

interface FlowHeaderProps {
  currentStep: number;
  draftId: string;
  title: string;
  statusLabel?: string;
}

export function FlowHeader({
  currentStep,
  draftId,
  title,
  statusLabel,
}: FlowHeaderProps) {
  const tc = useTranslations("common");

  return (
    <header className="border-b border-stone-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.03)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold tracking-[-0.02em] text-stone-950"
        >
          {tc("appName")}
        </Link>
        <div className="flex min-w-0 flex-1 justify-center">
          <StepIndicator currentStep={currentStep} draftId={draftId} />
        </div>
        <span className="hidden shrink-0 text-sm font-medium text-stone-700 lg:inline">
          {statusLabel ?? title}
        </span>
      </div>
    </header>
  );
}
