"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Loader2, Package, PenLine, AlertCircle, Mail } from "lucide-react";
import { Link } from "../../../../i18n/navigation.js";
import { apiFetch } from "../../../../lib/api.js";
import { queryKeys } from "@swiss-mail/shared";
import type { OrderStatusResponse } from "@swiss-mail/shared";
import { DispatchConfirmation } from "../../../../components/product/DispatchConfirmation.js";
import { Button } from "../../../../components/ui/button.js";
import { Card, CardContent } from "../../../../components/ui/card.js";

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (query.error || !query.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">{tc("error")}</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/">{tc("backToHome")}</Link>
        </Button>
      </div>
    );
  }

  const { order } = query.data;
  const { payment, dispatch: dispatchData } = order;
  const priceCHF = (payment.priceCents / 100).toFixed(2);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Mail className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">{tc("appName")}</span>
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-2xl space-y-6 px-4 py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        </div>

        <Card>
          <CardContent className="p-6">
            <dl className="divide-y divide-border">
              <div className="flex items-center justify-between py-3 text-sm">
                <dt className="text-muted-foreground">{t("orderReference")}</dt>
                <dd className="font-mono font-medium text-foreground">{order.orderRef}</dd>
              </div>
              {order.recipientName && (
                <div className="flex items-center justify-between py-3 text-sm">
                  <dt className="text-muted-foreground">{t("recipient")}</dt>
                  <dd className="font-medium text-foreground">{order.recipientName}</dd>
                </div>
              )}
              <div className="flex items-center justify-between py-3 text-sm">
                <dt className="text-muted-foreground">{t("paymentAmount")}</dt>
                <dd className="font-medium text-foreground">
                  CHF {priceCHF}
                  <span className="ml-2 text-xs text-muted-foreground">({payment.state})</span>
                </dd>
              </div>
              {payment.capturedAt && (
                <div className="flex items-center justify-between py-3 text-sm">
                  <dt className="text-muted-foreground">{t("paidAt")}</dt>
                  <dd className="text-foreground">
                    {new Date(payment.capturedAt).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <DispatchConfirmation
              dispatchState={
                dispatchData.state as Parameters<typeof DispatchConfirmation>[0]["dispatchState"]
              }
              providerReference={dispatchData.providerRef}
              isTrackable={dispatchData.trackingAvailable}
              submittedAt={dispatchData.submittedAt}
              lastCheckedAt={dispatchData.lastCheckedAt}
            />
          </CardContent>
        </Card>

        <div className="text-center">
          <Button asChild>
            <Link href="/">
              <PenLine className="mr-1.5 h-4 w-4" />
              {t("sendAnother")}
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
