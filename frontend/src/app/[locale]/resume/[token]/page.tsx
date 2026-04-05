"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "../../../../lib/api";
import { useRouter } from "../../../../i18n/navigation";
import { Loader2 } from "lucide-react";
import { RecoveryScreen } from "../../../../components/product/RecoveryScreen";

// ---------------------------------------------------------------------------
// Resume Page
// ---------------------------------------------------------------------------

export default function ResumePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const t = useTranslations("resume");
  const tc = useTranslations("common");
  const router = useRouter();

  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resume() {
      try {
        const result = await apiFetch<{ redirectUrl: string }>(`/v1/resume/${token}`);
        if (!cancelled) {
          router.replace(result.redirectUrl);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      }
    }

    void resume();

    return () => {
      cancelled = true;
    };
  }, [token, router]);

  if (error) {
    return (
      <RecoveryScreen
        eyebrow={tc("appName")}
        title={t("error")}
        description={tc("draftUnavailableBody")}
        primaryHref="/draft/new"
        primaryLabel={t("startNew")}
        secondaryHref="/"
        secondaryLabel={tc("backToHome")}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-zinc-500">{t("loading")}</p>
    </div>
  );
}
