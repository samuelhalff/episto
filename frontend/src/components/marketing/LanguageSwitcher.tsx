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
              "app-choice-pill min-h-10 min-w-10 px-3 text-sm font-semibold",
              isActive
                ? "app-choice-pill-active"
                : "text-[var(--app-muted)] hover:text-[var(--app-fg)]",
            ].join(" ")}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
