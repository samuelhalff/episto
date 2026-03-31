"use client";

import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "../../i18n/navigation";
import { routing } from "../../i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("common");

  return (
    <div aria-label={t("language")} className="flex flex-wrap gap-2 text-sm">
      {routing.locales.map((l) => {
        const label = l.split("-")[0]?.toUpperCase() ?? l;
        const isActive = l === locale;
        return (
          <Link
            key={l}
            href={pathname}
            locale={l}
            aria-current={isActive ? "page" : undefined}
            className={[
              "inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-semibold transition-colors",
              isActive
                ? "border-primary/30 bg-primary/10 text-zinc-950 dark:border-amber-300/30 dark:bg-amber-400/15 dark:text-amber-100"
                : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-100",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
