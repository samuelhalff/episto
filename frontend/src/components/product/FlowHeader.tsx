"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import { StepIndicator } from "./StepIndicator";
import { HeaderLanguageMenu } from "../layout/HeaderLanguageMenu";
import { CustomerSiteMenu } from "../layout/CustomerSiteMenu";
import { Logo } from "../branding/Logo";

interface FlowHeaderProps {
  currentStep: number;
  draftId: string;
  title: string;
  statusLabel?: string;
  headerAction?: ReactNode;
}

export function FlowHeader({
  currentStep,
  draftId,
  title: _title,
  statusLabel,
  headerAction,
}: FlowHeaderProps) {
  const t = useTranslations("marketing");
  const tc = useTranslations("common");

  return (
    <header className="border-b border-[var(--app-border)] bg-[var(--app-surface-strong)] transition-colors">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="py-3">
          <div className="sm:hidden">
            <div className="flex items-center justify-between gap-3">
              <Link href="/" className="inline-flex shrink-0 items-center">
                <Logo iconClassName="h-8 w-8" wordmarkClassName="text-base" />
              </Link>
              <CustomerSiteMenu
                title={tc("appName")}
                description={t("nav.writeLetter")}
                isCompactViewport
              />
            </div>
            <div className="mt-3 min-w-0">
              <StepIndicator currentStep={currentStep} draftId={draftId} />
            </div>
          </div>
          <div className="hidden min-h-14 items-center gap-3 sm:flex">
            <Link href="/" className="inline-flex shrink-0 items-center">
              <Logo iconClassName="h-8 w-8" wordmarkClassName="text-base" />
            </Link>

            <div className="min-w-0 flex-1">
              <StepIndicator currentStep={currentStep} draftId={draftId} />
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {headerAction}
              <HeaderLanguageMenu />
              <CustomerSiteMenu
                title={tc("appName")}
                description={t("nav.writeLetter")}
              />
              {statusLabel ? (
                <span className="hidden text-[11px] font-medium text-zinc-400 dark:text-zinc-500 lg:inline">
                  {statusLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
