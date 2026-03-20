"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Loader2, Package, PenLine, AlertCircle } from "lucide-react";
import { Link } from "../../../../i18n/navigation.js";
import { apiFetch } from "../../../../lib/api.js";
import { queryKeys } from "@swiss-mail/shared";
import type { OrderStatusResponse } from "@swiss-mail/shared";
import { DispatchConfirmation } from "../../../../components/product/DispatchConfirmation.js";

// ---------------------------------------------------------------------------
// Status page — GET /api/v1/orders/:orderToken
// ---------------------------------------------------------------------------

function useOrderStatus(orderToken: string) {
  return useQuery({
    queryKey: queryKeys.order(orderToken),
    queryFn: () => apiFetch<OrderStatusResponse>(`/v1/orders/${orderToken}`),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: (count, error) => {
      const status = error != null && typeof error === "object" && "status" in error
        ? (error as { status: number }).status
        : undefined;
      return status !== 404 && count < 3;
    },
  });
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function StatusPage({
  params,
}: {
  params: Promise<{ orderToken: string }>;
}) {
  const { orderToken } = use(params);
  const t = useTranslations("status");
  const tc = useTranslations("common");

  const query = useOrderStatus(orderToken);

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-sm text-muted-foreground">{tc("error")}</p>
        <Link href="/" className="text-sm text-primary underline">
          {tc("backToHome")}
        </Link>
      </div>
    );
  }

  const { order } = query.data;
  const { payment, dispatch: dispatchData } = order;

  const priceCHF = (payment.priceCents / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-center">
          <Link href="/" className="font-bold text-gray-900">
            {tc("appName")}
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-2xl space-y-6 px-4 py-12">
        <div className="text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        </div>

        {/* Order summary */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <dl className="divide-y divide-gray-100">
            <div className="flex items-center justify-between py-3 text-sm">
              <dt className="text-gray-500">{t("orderReference")}</dt>
              <dd className="font-mono font-medium text-gray-900">{order.orderRef}</dd>
            </div>
            {order.recipientName && (
              <div className="flex items-center justify-between py-3 text-sm">
                <dt className="text-gray-500">{t("recipient")}</dt>
                <dd className="font-medium text-gray-900">{order.recipientName}</dd>
              </div>
            )}
            <div className="flex items-center justify-between py-3 text-sm">
              <dt className="text-gray-500">{t("paymentAmount")}</dt>
              <dd className="font-medium text-gray-900">
                CHF {priceCHF}
                <span className="ml-2 text-xs text-gray-500">({payment.state})</span>
              </dd>
            </div>
            {payment.capturedAt && (
              <div className="flex items-center justify-between py-3 text-sm">
                <dt className="text-gray-500">{t("paidAt")}</dt>
                <dd className="text-gray-900">
                  {new Date(payment.capturedAt).toLocaleDateString()}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Dispatch status */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <DispatchConfirmation
            dispatchState={
              dispatchData.state as Parameters<typeof DispatchConfirmation>[0]["dispatchState"]
            }
            providerReference={dispatchData.providerRef}
            isTrackable={dispatchData.trackingAvailable}
            submittedAt={dispatchData.submittedAt}
            lastCheckedAt={dispatchData.lastCheckedAt}
          />
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark"
          >
            <PenLine className="h-4 w-4" />
            {t("sendAnother")}
          </Link>
        </div>
      </main>
    </div>
  );
}
