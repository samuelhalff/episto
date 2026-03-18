"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "../../../../lib/api.js";
import { Link } from "../../../../i18n/navigation.js";
import {
  Loader2,
  Package,
  PenLine,
  AlertCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Status types (placeholder until backend defines response shape)
// ---------------------------------------------------------------------------

interface OrderStatus {
  orderReference: string;
  dispatchState: string;
  estimatedDelivery: string | null;
}

// ---------------------------------------------------------------------------
// Status Page
// ---------------------------------------------------------------------------

export default function StatusPage({
  params,
}: {
  params: Promise<{ orderToken: string }>;
}) {
  const { orderToken } = use(params);
  const t = useTranslations("status");
  const tc = useTranslations("common");

  const [status, setStatus] = useState<OrderStatus | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchStatus() {
      try {
        const result = await apiFetch<OrderStatus>(
          `/v1/status/${orderToken}`,
        );
        if (!cancelled) {
          setStatus(result);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchStatus();

    return () => {
      cancelled = true;
    };
  }, [orderToken]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-accent" />
        <p className="text-sm text-gray-600">{tc("error")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-center">
          <Link href="/" className="font-bold text-navy">
            {tc("appName")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
        <div className="text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-navy" />
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <dl className="divide-y divide-gray-100">
            <div className="flex items-center justify-between py-3 text-sm">
              <dt className="text-gray-500">{t("orderReference")}</dt>
              <dd className="font-mono font-medium text-navy">
                {status.orderReference}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3 text-sm">
              <dt className="text-gray-500">{t("dispatchState")}</dt>
              <dd className="font-medium text-gray-900">
                {status.dispatchState}
              </dd>
            </div>
            {status.estimatedDelivery && (
              <div className="flex items-center justify-between py-3 text-sm">
                <dt className="text-gray-500">{t("estimatedDelivery")}</dt>
                <dd className="font-medium text-gray-900">
                  {status.estimatedDelivery}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-light"
          >
            <PenLine className="h-4 w-4" />
            {t("sendAnother")}
          </Link>
        </div>
      </main>
    </div>
  );
}
