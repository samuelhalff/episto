"use client";

import { useEffect } from "react";
import { captureException } from "../lib/error-tracking";
import { RecoveryScreen } from "../components/product/RecoveryScreen";
import { BRAND_NAME } from "../lib/brand";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    captureException(error, {
      component: "GlobalError",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }, [error]);

  const onReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <html>
      <body>
        <RecoveryScreen
          statusLabel="Error"
          eyebrow={BRAND_NAME}
          title="Something went wrong"
          description="An unexpected error occurred. You can try reloading the page, start a new letter, or visit the help center."
          primaryHref="/draft/new"
          primaryLabel="Start new letter"
          secondaryHref="/"
          secondaryLabel="Back to home"
          tertiaryLabel="Reload page"
          onTertiaryAction={onReload}
          className="min-h-[60vh]"
        />
      </body>
    </html>
  );
}
