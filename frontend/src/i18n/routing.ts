import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["de-CH", "fr-CH", "it-CH", "en-CH"],
  defaultLocale: "de-CH",
});

export type Locale = (typeof routing.locales)[number];
