"use client";

import { useTranslations } from "next-intl";
import { PricingFromText } from "./PricingFromText";

export function PricingHeroPanel() {
  const t = useTranslations("pricing");

  return (
    <div className="space-y-4">
      <PricingFromText
        titleClassName="text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-zinc-50 md:text-5xl"
        noteClassName="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-300"
      />
      <p className="max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-300">
        {t("totalsSharedSourceNote")}
      </p>
    </div>
  );
}
