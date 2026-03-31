"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RecoveryScreen } from "../../components/product/RecoveryScreen";
import { captureError } from "../../lib/error-tracking";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    captureError(error, {
      component: "ErrorBoundary",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }, [error]);

  return (
    <RecoveryScreen
      eyebrow={t("appName")}
      title={t("errorRecoveryTitle")}
      description={t("errorRecoveryBody")}
      primaryHref="/draft/new"
      primaryLabel={t("startNewLetter")}
      secondaryHref="/"
      secondaryLabel={t("backToHome")}
      tertiaryLabel={t("tryAgain")}
      onTertiaryAction={reset}
      className="min-h-[60vh]"
    />
  );
}
