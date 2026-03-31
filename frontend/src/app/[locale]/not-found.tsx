"use client";

import { useTranslations } from "next-intl";
import { RecoveryScreen } from "../../components/product/RecoveryScreen";

export default function NotFound() {
  const t = useTranslations("common");

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
      className="min-h-[60vh]"
    />
  );
}
