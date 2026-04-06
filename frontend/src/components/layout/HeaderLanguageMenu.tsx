"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "../../i18n/navigation";
import { routing } from "../../i18n/routing";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { getAppButtonClassName } from "../ui/app-button";

export function HeaderLanguageMenu() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);
  const activeLabel = useMemo(
    () => locale.split("-")[0]?.toUpperCase() ?? locale,
    [locale],
  );

  // Listbox keyboard navigation state
  const [focusedIndex, setFocusedIndex] = useState(() => routing.locales.findIndex(l => l === locale));
  const listboxRef = React.useRef<HTMLDivElement>(null);

  function handleSelect(nextLocale: string) {
    setOpen(false);
    router.replace(pathname, { locale: nextLocale });
  }

  function handleListboxKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    const max = routing.locales.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex(i => (i < max ? i + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex(i => (i > 0 ? i - 1 : max));
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusedIndex(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setFocusedIndex(max);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect(routing.locales[focusedIndex]);
    }
  }

  React.useEffect(() => {
    if (!open) return;
    const options = listboxRef.current?.querySelectorAll('[role="option"]');
    if (options && options[focusedIndex]) {
      (options[focusedIndex] as HTMLElement).focus();
    }
  }, [open, focusedIndex]);

  return (
    <Popover open={open} onOpenChange={o => {
      setOpen(o);
      if (o) setFocusedIndex(routing.locales.findIndex(l => l === locale));
    }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("language")}
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
      <PopoverContent className="w-[220px] p-2">
        <div
          ref={listboxRef}
          role="listbox"
          aria-label={t("language")}
          tabIndex={-1}
          className="space-y-1"
          onKeyDown={handleListboxKeyDown}
        >
          {routing.locales.map((nextLocale, idx) => {
            const label = nextLocale.split("-")[0]?.toUpperCase() ?? nextLocale;
            const isActive = nextLocale === locale;
            return (
              <button
                key={nextLocale}
                role="option"
                aria-selected={isActive}
                type="button"
                tabIndex={focusedIndex === idx ? 0 : -1}
                className={[
                  "flex w-full min-h-11 items-center justify-between rounded-2xl px-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
                  isActive
                    ? "bg-amber-50 text-zinc-950 dark:bg-amber-400/15 dark:text-amber-100"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                ].join(" ")}
                onClick={() => handleSelect(nextLocale)}
                aria-current={isActive ? "page" : undefined}
                autoFocus={open && focusedIndex === idx}
              >
                <span>{label}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{nextLocale}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
