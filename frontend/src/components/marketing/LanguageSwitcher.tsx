"use client";

import React from "react";
import { useLocale } from "next-intl";
import { useTranslations } from "next-intl";
import { AppToggleGroup } from "../ui/app-toggle-group";
import { usePathname, useRouter } from "../../i18n/navigation";
import { routing } from "../../i18n/routing";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("common");
  const options = routing.locales.map((nextLocale) => ({
    value: nextLocale,
    label: nextLocale.split("-")[0]?.toUpperCase() ?? nextLocale,
    ariaLabel: nextLocale.split("-")[0]?.toUpperCase() ?? nextLocale,
  }));

  return (
    <AppToggleGroup
      ariaLabel={t("language")}
      options={options}
      variant="segmented"
      value={locale}
      onChange={(nextLocale) => {
        if (nextLocale !== locale) {
          router.replace(pathname, { locale: nextLocale });
        }
      }}
    />
  );
}
