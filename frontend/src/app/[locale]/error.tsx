"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { captureError } from "../../lib/error-tracking.js";

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
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          {t("error")}
        </h1>
        <p className="mb-6 text-gray-600">
          {error.message || "Something went wrong. Please try again."}
        </p>
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark"
        >
          {t("tryAgain")}
        </button>
      </div>
    </div>
  );
}
