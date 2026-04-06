"use client";

import { ChevronRight, CircleHelp, CreditCard, Home, Languages, Palette, PenSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import { LanguageSwitcher } from "../marketing/LanguageSwitcher";
import { ThemeToggle } from "../marketing/ThemeToggle";
import { getAppButtonClassName } from "../ui/app-button";

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
        className={getAppButtonClassName({
          variant: "primary",
          fullWidth: true,
          className: "min-h-14 tracking-tight",
        })}
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
            className="group app-list-item flex min-h-12 items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-[var(--app-muted-strong)] hover:text-[var(--app-fg)]"
            onClick={onNavigate}
          >
            <span className="app-list-item-muted inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--app-muted)] transition-colors group-hover:text-[var(--app-muted-strong)]">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">{label}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--app-muted)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--app-muted-strong)]" />
          </Link>
        ))}
      </nav>

      <div className="border-t border-[var(--app-border)] pt-4">
        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--app-muted-strong)]">
              <Palette className="h-4 w-4 text-[var(--app-muted)]" />
              {tc("theme")}
            </div>
            <ThemeToggle />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--app-muted-strong)]">
              <Languages className="h-4 w-4 text-[var(--app-muted)]" />
              {tc("language")}
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </div>
  );
}
