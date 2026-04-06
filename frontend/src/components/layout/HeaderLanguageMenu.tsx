"use client";

import React, {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "../../i18n/navigation";
import { routing } from "../../i18n/routing";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { getAppButtonClassName } from "../ui/app-button";

const LOCALE_LABELS: Readonly<Record<string, { code: string; name: string }>> = {
  "de-CH": { code: "DE", name: "Deutsch" },
  "fr-CH": { code: "FR", name: "Français" },
  "it-CH": { code: "IT", name: "Italiano" },
  "en-CH": { code: "EN", name: "English" },
};

function getLocaleCode(value: string) {
  return LOCALE_LABELS[value]?.code ?? value.split("-")[0]?.toUpperCase() ?? value;
}

function getLocaleName(value: string) {
  return LOCALE_LABELS[value]?.name ?? value;
}

function getLocaleIndex(value: string) {
  const index = routing.locales.findIndex((locale) => locale === value);
  return index >= 0 ? index : 0;
}

export function HeaderLanguageMenu() {
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(() => getLocaleIndex(locale));
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const activeLabel = useMemo(() => getLocaleCode(locale), [locale]);
  const activeLocaleName = useMemo(() => getLocaleName(locale), [locale]);

  useEffect(() => {
    setFocusedIndex(getLocaleIndex(locale));
  }, [locale]);

  useEffect(() => {
    if (!open) {
      return;
    }

    optionRefs.current[focusedIndex]?.focus();
  }, [focusedIndex, open]);

  function handleSelect(nextLocale: string) {
    setOpen(false);

    if (nextLocale === locale) {
      return;
    }

    const search = searchParams.toString();
    const hash = window.location.hash;
    const route = `${pathname}${search ? `?${search}` : ""}${hash}`;

    router.replace(route, { locale: nextLocale });
  }

  function handleListboxKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) {
      return;
    }

    const maxIndex = routing.locales.length - 1;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setFocusedIndex((index) => (index < maxIndex ? index + 1 : 0));
        break;
      case "ArrowUp":
        event.preventDefault();
        setFocusedIndex((index) => (index > 0 ? index - 1 : maxIndex));
        break;
      case "Home":
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        event.preventDefault();
        setFocusedIndex(maxIndex);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        handleSelect(routing.locales[focusedIndex] ?? locale);
        break;
      default:
        break;
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (nextOpen) {
      setFocusedIndex(getLocaleIndex(locale));
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${t("language")}, ${activeLocaleName}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={getAppButtonClassName({
            variant: "secondary",
            size: "md",
            className: "min-h-11 gap-2 rounded-full px-4 py-0",
          })}
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm font-semibold">{activeLabel}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[220px] p-2"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          queueMicrotask(() => {
            optionRefs.current[getLocaleIndex(locale)]?.focus();
          });
        }}
      >
        <div
          role="listbox"
          aria-label={t("language")}
          aria-orientation="vertical"
          className="space-y-1"
          onKeyDown={handleListboxKeyDown}
        >
          {routing.locales.map((nextLocale, index) => {
            const isActive = nextLocale === locale;
            const isFocused = focusedIndex === index;

            return (
              <div
                key={nextLocale}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                role="option"
                aria-selected={isActive}
                tabIndex={isFocused ? 0 : -1}
                className={[
                  "flex min-h-11 w-full cursor-pointer items-center justify-between rounded-2xl px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                  isActive
                    ? "bg-amber-50 text-zinc-950 dark:bg-amber-400/15 dark:text-amber-100"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                ].join(" ")}
                onClick={() => handleSelect(nextLocale)}
              >
                <span>{getLocaleName(nextLocale)}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {getLocaleCode(nextLocale)}
                </span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
