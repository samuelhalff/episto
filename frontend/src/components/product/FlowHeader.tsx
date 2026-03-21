"use client";

import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation.js";
import { StepIndicator } from "./StepIndicator.js";

interface FlowHeaderProps {
  currentStep: number;
  title: string;
}

export function FlowHeader({ currentStep, title }: FlowHeaderProps) {
  const tc = useTranslations("common");

  return (
    <header className="border-b bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 font-bold text-gray-900">
          {tc("appName")}
        </Link>
        <div className="flex min-w-0 flex-1 justify-center">
          <StepIndicator currentStep={currentStep} />
        </div>
        <span className="hidden shrink-0 text-sm font-medium text-gray-900 md:inline">
          {title}
        </span>
      </div>
    </header>
  );
}
