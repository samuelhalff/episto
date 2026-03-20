"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { captureError } from "../../lib/error-tracking.js";
import { Button } from "../../components/ui/button.js";
import { AlertCircle } from "lucide-react";

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
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mx-auto max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="mb-4 text-2xl font-bold text-foreground">
          {t("error")}
        </h1>
        <p className="mb-6 text-muted-foreground">
          {error.message || "Something went wrong. Please try again."}
        </p>
        <Button onClick={reset}>
          {t("tryAgain")}
        </Button>
      </div>
    </div>
  );
}
