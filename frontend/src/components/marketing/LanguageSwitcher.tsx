"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "../../i18n/navigation.js";
import { routing } from "../../i18n/routing.js";
import { cn } from "../../lib/utils.js";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 p-0.5">
      {routing.locales.map((l) => {
        const label = l.split("-")[0]?.toUpperCase() ?? l;
        const isActive = l === locale;
        return (
          <Link
            key={l}
            href={pathname}
            locale={l}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-all",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
