"use client";

import { useLocale, useTranslations } from "next-intl";
import { RecoveryScreen } from "@/components/product/RecoveryScreen";
import { NotFoundTemplateSuggestions } from "@/components/marketing/NotFoundTemplateSuggestions";

export default function NotFound() {
  const t = useTranslations("common");
  const locale = useLocale();

  return (
    <RecoveryScreen
      statusLabel="404"
      eyebrow={t("appName")}
      title={t("pageNotFound")}
      description={t("pageNotFoundBody")}
      primaryHref="/draft/new"
      primaryLabel={t("startNewLetter")}
      secondaryHref="/"
      secondaryLabel={t("backToHome")}
      footer={<NotFoundTemplateSuggestions locale={locale} />}
      className="min-h-[60vh]"
    />
  );
}
