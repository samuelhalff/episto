"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Loader2, Package, PenLine, AlertCircle } from "lucide-react";
import { Link } from "../../../../i18n/navigation";
import { apiFetch } from "../../../../lib/api";
import { OrderStatusResponseSchema, queryKeys } from "@swiss-mail/shared";
import type { OrderStatusResponse } from "@swiss-mail/shared";
import { CustomerSiteMenu } from "../../../../components/layout/CustomerSiteMenu";
import { HeaderLanguageMenu } from "../../../../components/layout/HeaderLanguageMenu";
import { DispatchConfirmation } from "../../../../components/product/DispatchConfirmation";
import { ProtectedPdfDownloadButton } from "../../../../components/product/ProtectedPdfDownloadButton";

function useOrderStatus(orderToken: string) {
  return useQuery({
    queryKey: queryKeys.order(orderToken),
    queryFn: async (): Promise<OrderStatusResponse> =>
      OrderStatusResponseSchema.parse(
        await apiFetch<unknown>(`/v1/orders/${orderToken}`),
      ),
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
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffaf4_0%,#ffffff_28%)] dark:bg-zinc-950">
      <header className="border-b border-zinc-200/80 bg-white/95 px-4 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-3 font-semibold tracking-tight text-zinc-950 dark:text-zinc-50"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/80 bg-white text-xs shadow-sm dark:border-amber-500/30 dark:bg-zinc-900">
              SM
            </span>
            {tc("appName")}
          </Link>
          <div className="hidden items-center gap-3 sm:flex">
            <HeaderLanguageMenu />
            <CustomerSiteMenu title={tc("appName")} description={t("sendAnother")} />
            <Link
              href="/draft/new"
              className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            >
              {t("sendAnother")}
            </Link>
          </div>
          <div className="sm:hidden">
            <CustomerSiteMenu
              title={tc("appName")}
              description={t("sendAnother")}
              isCompactViewport
            />
          </div>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
        <div className="rounded-[2.5rem] border border-zinc-200/80 bg-white/92 p-5 text-center shadow-elevated dark:border-zinc-800 dark:bg-zinc-900/92 sm:p-8">
          <Package className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">
            {t("title")}
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-4xl border border-zinc-200/80 bg-white/92 p-6 shadow-elevated dark:border-zinc-800 dark:bg-zinc-900/92">
            <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <div className="flex items-center justify-between py-3 text-sm">
                <dt className="text-zinc-500">{t("orderReference")}</dt>
                <dd className="font-mono font-medium text-zinc-900 dark:text-zinc-100">{order.orderRef}</dd>
              </div>
              {order.recipientName && (
                <div className="flex items-center justify-between py-3 text-sm">
                  <dt className="text-zinc-500">{t("recipient")}</dt>
                  <dd className="font-medium text-zinc-900 dark:text-zinc-100">{order.recipientName}</dd>
                </div>
              )}
              <div className="flex items-center justify-between py-3 text-sm">
                <dt className="text-zinc-500">{t("paymentAmount")}</dt>
                <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                  CHF {priceCHF}
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">({payment.state})</span>
                </dd>
              </div>
              {payment.capturedAt && (
                <div className="flex items-center justify-between py-3 text-sm">
                  <dt className="text-zinc-500">{t("paidAt")}</dt>
                  <dd className="text-zinc-900 dark:text-zinc-100">
                    {new Date(payment.capturedAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-4xl border border-zinc-200/80 bg-white/92 p-6 shadow-elevated dark:border-zinc-800 dark:bg-zinc-900/92">
            <DispatchConfirmation
              dispatchState={
                dispatchData.state as Parameters<
                  typeof DispatchConfirmation
                >[0]["dispatchState"]
              }
              providerReference={dispatchData.providerRef}
              trackingNumber={dispatchData.trackingNumber}
              providerMode={dispatchData.providerMode}
              isTrackable={dispatchData.trackingAvailable}
              submittedAt={dispatchData.submittedAt}
              lastCheckedAt={dispatchData.lastCheckedAt}
            />
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <ProtectedPdfDownloadButton
            apiPath={`/v1/orders/${orderToken}/pdf`}
            namespace="status"
          />
          <div className="text-center sm:hidden">
            <Link
              href="/draft/new"
              className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            >
              <PenLine className="h-4 w-4" />
              {t("sendAnother")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
