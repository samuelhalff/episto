"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "../../../../lib/api.js";
import { useRouter, Link } from "../../../../i18n/navigation.js";
import { Loader2, AlertCircle, PenLine } from "lucide-react";

// ---------------------------------------------------------------------------
// Resume Page
// ---------------------------------------------------------------------------

export default function ResumePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const t = useTranslations("resume");
  const tc = useTranslations("common");
  const router = useRouter();

  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resume() {
      try {
        const result = await apiFetch<{ draftId: string }>(
          `/v1/resume/${token}`,
        );
        if (!cancelled) {
          router.replace(`/draft/${result.draftId}`);
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-accent" />
        <p className="text-sm text-gray-600">{t("error")}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-light"
        >
          <PenLine className="h-4 w-4" />
          {t("startNew")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-8">
      <Loader2 className="h-8 w-8 animate-spin text-navy" />
      <p className="text-sm text-gray-500">{t("loading")}</p>
    </div>
  );
}
