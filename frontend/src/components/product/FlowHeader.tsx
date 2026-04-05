"use client";

import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { Link } from "../../i18n/navigation";
import { StepIndicator } from "./StepIndicator";
import { LanguageSwitcher } from "../marketing/LanguageSwitcher";
import { routing } from "../../i18n/routing";
import { usePathname } from "../../i18n/navigation";

function CompactLanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handleClick);
    return () => document.removeEventListener("pointerdown", handleClick);
  }, [open]);

  const label = locale.split("-")[0]?.toUpperCase() ?? locale;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={tc("language")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
      >
        <Globe className="h-4 w-4" />
        <span className="sr-only">{label}</span>
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {routing.locales.map((l) => {
            const lLabel = l.split("-")[0]?.toUpperCase() ?? l;
            const isActive = l === locale;
            return (
              <Link
                key={l}
                href={pathname}
                locale={l}
                onClick={() => setOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "inline-flex min-h-9 min-w-[3.5rem] items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-primary/10 text-zinc-950 dark:bg-amber-400/15 dark:text-amber-100"
                    : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                ].join(" ")}
              >
                {lLabel}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

interface FlowHeaderProps {
  currentStep: number;
  draftId: string;
  title: string;
  statusLabel?: string;
}

export function FlowHeader({
  currentStep,
  draftId,
  title: _title,
  statusLabel,
}: FlowHeaderProps) {
  const tc = useTranslations("common");

  return (
    <header className="border-b border-[var(--app-border)] bg-[var(--app-surface-strong)] transition-colors">
      <div className="mx-auto max-w-6xl px-3 sm:px-6">
        <div className="flex min-h-14 items-center gap-3 py-3">
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
            <div className="sm:hidden">
              <CompactLanguageSwitcher />
            </div>
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
