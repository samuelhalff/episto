"use client";

import { ChevronRight, CircleHelp, CreditCard, Home, Languages, Palette, PenSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import { LanguageSwitcher } from "../marketing/LanguageSwitcher";
import { ThemeToggle } from "../marketing/ThemeToggle";

interface SiteMenuPanelProps {
  onNavigate?: (() => void) | undefined;
  navAriaLabel?: string | undefined;
}

export function SiteMenuPanel({
  onNavigate,
  navAriaLabel = "Navigation menu",
}: SiteMenuPanelProps) {
  const t = useTranslations("marketing");
  const tc = useTranslations("common");

  const navItems = [
    { href: "/", label: tc("appName"), icon: Home },
    { href: "/pricing", label: t("nav.pricing"), icon: CreditCard },
    { href: "/help", label: t("nav.help"), icon: CircleHelp },
  ];

  return (
    <div className="space-y-4">
      <Link
        href="/draft/new"
        className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-5 text-sm font-semibold tracking-tight text-white transition-colors hover:bg-zinc-900 active:scale-[0.98] dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
        onClick={onNavigate}
      >
        <PenSquare className="h-4 w-4" />
        {tc("startNewLetter")}
      </Link>

      <nav aria-label={navAriaLabel} className="space-y-1.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-white"
            onClick={onNavigate}
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 transition-colors group-hover:bg-zinc-200 group-hover:text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:group-hover:bg-zinc-700 dark:group-hover:text-zinc-100">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">{label}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-zinc-300 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-500 dark:text-zinc-600 dark:group-hover:text-zinc-400" />
          </Link>
        ))}
      </nav>

      <div className="border-t border-zinc-200/80 pt-4 dark:border-zinc-800">
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              <Palette className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              {tc("theme")}
            </div>
            <ThemeToggle />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200">
              <Languages className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
              {tc("language")}
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}
