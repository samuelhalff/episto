"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "../../i18n/navigation.js";
import { routing } from "../../i18n/routing.js";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div className="flex gap-3 text-sm">
      {routing.locales.map((l) => {
        const label = l.split("-")[0]?.toUpperCase() ?? l;
        return (
          <Link
            key={l}
            href={pathname}
            locale={l}
            className={
              l === locale
                ? "font-semibold text-navy"
                : "text-gray-400 hover:text-gray-600"
            }
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
