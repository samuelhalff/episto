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

function useOrderStatus(orderToken: string) {
  return useQuery({
    queryKey: queryKeys.order(orderToken),
    queryFn: () => apiFetch<OrderStatusResponse>(`/v1/orders/${orderToken}`),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: (count, error) => {
      const status =
        error != null && typeof error === "object" && "status" in error
          ? (error as { status: number }).status
          : undefined;
      return status !== 404 && count < 3;
    },
  });
}

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
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf4_0%,#ffffff_28%)]">
      <header className="border-b border-stone-200/80 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-3 font-semibold tracking-tight text-stone-950"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/80 bg-white text-xs shadow-sm">
              SM
            </span>
            {tc("appName")}
          </Link>
          <Link
            href="/draft/new"
            className="hidden rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800 sm:inline-flex"
          >
            {t("sendAnother")}
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        <div className="rounded-[2.5rem] border border-stone-200/80 bg-white/92 p-5 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-8">
          <Package className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-stone-950">
            {t("title")}
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-[2rem] border border-stone-200/80 bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <dl className="divide-y divide-stone-100">
              <div className="flex items-center justify-between py-3 text-sm">
                <dt className="text-stone-500">{t("orderReference")}</dt>
                <dd className="font-mono font-medium text-stone-900">{order.orderRef}</dd>
              </div>
              {order.recipientName && (
                <div className="flex items-center justify-between py-3 text-sm">
                  <dt className="text-stone-500">{t("recipient")}</dt>
                  <dd className="font-medium text-stone-900">{order.recipientName}</dd>
                </div>
              )}
              <div className="flex items-center justify-between py-3 text-sm">
                <dt className="text-stone-500">{t("paymentAmount")}</dt>
                <dd className="font-medium text-stone-900">
                  CHF {priceCHF}
                  <span className="ml-2 text-xs text-stone-500">({payment.state})</span>
                </dd>
              </div>
              {payment.capturedAt && (
                <div className="flex items-center justify-between py-3 text-sm">
                  <dt className="text-stone-500">{t("paidAt")}</dt>
                  <dd className="text-stone-900">
                    {new Date(payment.capturedAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-[2rem] border border-stone-200/80 bg-white/92 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <DispatchConfirmation
              dispatchState={
                dispatchData.state as Parameters<
                  typeof DispatchConfirmation
                >[0]["dispatchState"]
              }
              providerReference={dispatchData.providerRef}
              isTrackable={dispatchData.trackingAvailable}
              submittedAt={dispatchData.submittedAt}
              lastCheckedAt={dispatchData.lastCheckedAt}
            />
          </div>
        </div>

        <div className="text-center sm:hidden">
          <Link
            href="/draft/new"
            className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            <PenLine className="h-4 w-4" />
            {t("sendAnother")}
          </Link>
        </div>
      </main>
    </div>
  );
}
