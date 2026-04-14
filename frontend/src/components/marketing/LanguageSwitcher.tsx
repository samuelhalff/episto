"use client";

import React, { useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { AppToggleGroup } from "../ui/app-toggle-group";
import { usePathname, useRouter } from "../../i18n/navigation";
import { routing } from "../../i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  MarketingBody,
  MarketingMeta,
  getMarketingBodyToneClassName,
} from "./typography";

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

const LOCALE_LABELS: Readonly<Record<string, { code: string; name: string }>> = {
  "de-CH": { code: "DE", name: "Deutsch" },
  "fr-CH": { code: "FR", name: "Français" },
  "it-CH": { code: "IT", name: "Italiano" },
  "en-CH": { code: "EN", name: "English" },
};
type AppLocale = (typeof routing.locales)[number];

function getLocaleCode(value: string) {
  return LOCALE_LABELS[value]?.code ?? value.split("-")[0]?.toUpperCase() ?? value;
}

function getLocaleName(value: string) {
  return LOCALE_LABELS[value]?.name ?? value;
}

function buildLocalizedRoute(pathname: string, searchParams: URLSearchParams) {
  const search = searchParams.toString();
  const hash = typeof window === "undefined" ? "" : window.location.hash;

  return `${pathname}${search ? `?${search}` : ""}${hash}`;
}

interface LanguageSwitcherProps {
  variant?: "segmented" | "menu";
  compact?: boolean | undefined;
  className?: string | undefined;
}

interface SharedLanguageSwitcherProps {
  locale: AppLocale;
  languageLabel: string;
  onSelect: (locale: AppLocale) => void;
  className?: string | undefined;
}

function getMenuTriggerClassName(compact: boolean) {
  return compact
    ? "app-toolbar-button inline-flex min-h-11 items-center gap-2 rounded-2xl px-3.5 py-0 text-sm font-semibold shadow-none"
    : "group app-list-item inline-flex min-h-12 min-w-[10.5rem] max-w-full items-center justify-between gap-3 rounded-full px-4 py-3 text-sm font-semibold text-[var(--app-muted-strong)] shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:text-[var(--app-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60";
}

function MenuLanguageSwitcher({
  locale,
  languageLabel,
  onSelect,
  compact = false,
  className,
}: SharedLanguageSwitcherProps & Pick<LanguageSwitcherProps, "compact">) {
  const [open, setOpen] = useState(false);
  const activeLabel = getLocaleCode(locale);
  const activeLocaleName = getLocaleName(locale);
  const triggerLabel = compact ? activeLabel : activeLocaleName;

  function handleSelect(nextLocale: string) {
    setOpen(false);

    if (nextLocale === locale) {
      return;
    }

    onSelect(nextLocale as AppLocale);
  }

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${languageLabel}, ${activeLocaleName}`}
          className={cx(getMenuTriggerClassName(compact), className)}
        >
          <Globe className="h-4 w-4 shrink-0" />
          <span
            className={
              compact
                ? "text-sm font-medium"
                : "min-w-0 flex-1 truncate text-left text-sm font-semibold"
            }
          >
            {triggerLabel}
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[220px]" align="end">
        <DropdownMenuRadioGroup value={locale} onValueChange={handleSelect}>
          {routing.locales.map((nextLocale) => {
            const isActive = nextLocale === locale;

            return (
              <DropdownMenuRadioItem
                key={nextLocale}
                value={nextLocale}
                className={cx(
                  "group",
                  isActive ? undefined : getMarketingBodyToneClassName("default"),
                  !isActive && "dark:hover:text-zinc-50",
                )}
              >
                <MarketingBody as="span" tone="inherit">
                  {getLocaleName(nextLocale)}
                </MarketingBody>
                <span className="ml-auto flex items-center gap-2 pl-4">
                  <MarketingMeta
                    as="span"
                    tone={isActive ? "accent" : "default"}
                    className="text-xs"
                  >
                    {getLocaleCode(nextLocale)}
                  </MarketingMeta>
                  <DropdownMenuItemIndicator>
                    <Check className="h-3.5 w-3.5" />
                  </DropdownMenuItemIndicator>
                </span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SegmentedLanguageSwitcher({
  locale,
  onSelect,
  languageLabel,
  className,
}: SharedLanguageSwitcherProps) {
  const options = routing.locales.map((nextLocale) => ({
    value: nextLocale,
    label: getLocaleCode(nextLocale),
    ariaLabel: getLocaleCode(nextLocale),
  }));

  return (
    <AppToggleGroup
      ariaLabel={languageLabel}
      options={options}
      variant="segmented"
      value={locale}
      onChange={onSelect}
      className={className}
    />
  );
}

export function LanguageSwitcher({
  variant = "segmented",
  compact = false,
  className,
}: LanguageSwitcherProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("common");
  const currentLocale =
    routing.locales.find((candidate) => candidate === locale) ?? routing.defaultLocale;

  function handleSelect(nextLocale: AppLocale) {
    if (nextLocale === currentLocale) {
      return;
    }

    router.replace(buildLocalizedRoute(pathname, searchParams), { locale: nextLocale });
  }

  if (variant === "menu") {
    return (
      <MenuLanguageSwitcher
        locale={currentLocale}
        languageLabel={t("language")}
        onSelect={handleSelect}
        compact={compact}
        className={className}
      />
    );
  }

  return (
    <SegmentedLanguageSwitcher
      locale={currentLocale}
      languageLabel={t("language")}
      onSelect={handleSelect}
      className={className}
    />
  );
}
