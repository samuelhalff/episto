"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@episto/shared";
import { AlertTriangle, LineChart, Megaphone } from "lucide-react";

import { ADMIN_PAGE_STACK_CLASS_NAME } from "@/components/layout/page-spacing";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  OrdersRevenueChart,
  DeliveryMixChart,
  type TimeSeriesPoint,
} from "@/components/ui/chart";
import { useAdminAuth } from "../admin-auth-context";
import {
  MetricCard,
  SectionPanel,
  PeriodSelector,
  PanelLoading,
  PanelError,
} from "../admin-metric-panels";
import { fetchAdminDashboard, type DashboardPeriod } from "./dashboard-api";
import { formatChf, metricSubLabel, toChf } from "./dashboard-format";
import { MoneyTab, LettersTab, FeedbackTab, RefundsTab } from "./dashboard-tabs";

const ALERT_COLOR = {
  borderColor: "var(--app-border)",
  background: "var(--app-surface-strong)",
};

function ConnectLater({ title, description }: { title: string; description: string }) {
  return (
    <SectionPanel title={title}>
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-center"
        style={{ borderColor: "var(--app-border)" }}
      >
        <LineChart className="h-5 w-5" style={{ color: "var(--app-muted)" }} />
        <p className="text-xs font-medium" style={{ color: "var(--app-fg)" }}>
          Connect later
        </p>
        <p className="max-w-xs text-[11px]" style={{ color: "var(--app-muted)" }}>
          {description}
        </p>
      </div>
    </SectionPanel>
  );
}

const FUNNEL_LABELS = {
  visits: "Tracked visits",
  draftsStarted: "Draft started",
  draftsReady: "Draft ready",
  checkoutsStarted: "Checkout started",
  paid: "Paid",
} as const;

export default function DashboardPage() {
  const { authenticated } = useAdminAuth();
  const [period, setPeriod] = useState<DashboardPeriod>("7d");
  const [tab, setTab] = useState("letters");

  const q = useQuery({
    queryKey: queryKeys.admin.dashboard(period),
    queryFn: () => fetchAdminDashboard(period),
    refetchInterval: 30_000,
    enabled: authenticated,
  });

  const d = q.data;

  const alertRows = d
    ? [
        d.alerts.refundsPending > 0
          ? { label: "Refunds pending", count: d.alerts.refundsPending }
          : null,
        d.alerts.dispatchProblems > 0
          ? { label: "Rejected / unknown dispatch", count: d.alerts.dispatchProblems }
          : null,
        d.alerts.newFeedback24h > 0
          ? { label: "New feedback (24h)", count: d.alerts.newFeedback24h }
          : null,
      ].filter((r): r is { label: string; count: number } => r !== null)
    : [];

  const series: TimeSeriesPoint[] = d
    ? d.dailySeries.map((p) => ({
        date: p.date.slice(5), // MM-DD
        orders: p.orders,
        netRevenue: toChf(p.netRevenueCents),
      }))
    : [];

  const contributionLabel = d?.contributionEstimated
    ? "Contribution (est. CM1)"
    : "Contribution (CM1)";

  return (
    <div className={ADMIN_PAGE_STACK_CLASS_NAME}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
            Dashboard
          </h2>
          <p className="text-sm" style={{ color: "var(--app-muted)" }}>
            A daily glance at paid letters, contribution, revenue and dispatch health.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {d ? (
            <span className="text-xs" style={{ color: "var(--app-muted)" }}>
              Updated {new Date(d.lastUpdated).toLocaleTimeString("en-CH")}
            </span>
          ) : null}
          <PeriodSelector
            value={period}
            onChange={(v) => setPeriod(v as DashboardPeriod)}
          />
        </div>
      </div>

      {q.isLoading ? (
        <PanelLoading />
      ) : q.error ? (
        <PanelError message="Failed to load the dashboard." />
      ) : d ? (
        <>
          {/* Alert strip — current-state, ignores the period. */}
          {alertRows.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {alertRows.map((a) => (
                <div
                  key={a.label}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
                  style={{
                    borderColor: "rgba(245, 158, 11, 0.35)",
                    background: "rgba(245, 158, 11, 0.06)",
                    color: "var(--app-fg)",
                  }}
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">{a.label}</span>
                  <span className="font-mono">{a.count}</span>
                </div>
              ))}
            </div>
          ) : null}

          {/* KPI row */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <MetricCard
              label="Tracked visits"
              value={d.trackedVisits.value}
              sub={metricSubLabel(d.trackedVisits, (v) => String(v))}
            />
            <MetricCard
              label="Drafts started"
              value={d.draftsStarted.value}
              sub={metricSubLabel(d.draftsStarted, (v) => String(v))}
            />
            <MetricCard
              label="Letters paid"
              value={d.lettersPaid.value}
              sub={metricSubLabel(d.lettersPaid, (v) => String(v))}
            />
            <MetricCard
              label="Net revenue"
              value={formatChf(d.netRevenueCents.value)}
              sub={`VAT ${formatChf(d.vatCents)} · ${metricSubLabel(
                d.netRevenueCents,
                formatChf,
              )}`}
            />
            <MetricCard
              label="Dispatch success"
              value={`${d.dispatchSuccessRate.value}%`}
              sub={metricSubLabel(d.dispatchSuccessRate, (v) => `${v}%`)}
            />
            <MetricCard
              label={contributionLabel}
              value={formatChf(d.contributionCents.value)}
              sub={metricSubLabel(d.contributionCents, formatChf)}
            />
          </div>

          <SectionPanel title="Product funnel">
            <div className="space-y-3">
              {d.funnel.map((step) => (
                <div
                  key={step.key}
                  className="grid grid-cols-[minmax(120px,1fr)_minmax(0,3fr)_auto] items-center gap-3 text-xs"
                >
                  <span style={{ color: "var(--app-muted)" }}>
                    {FUNNEL_LABELS[step.key]}
                  </span>
                  <div
                    className="h-5 overflow-hidden rounded"
                    style={{ background: "var(--app-surface-muted)" }}
                  >
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{
                        width: `${d.funnel[0]?.count ? Math.max(2, (step.count / d.funnel[0].count) * 100) : 0}%`,
                        background: "var(--app-fg)",
                        opacity: 0.75,
                      }}
                    />
                  </div>
                  <span
                    className="w-28 text-right font-mono"
                    style={{ color: "var(--app-fg)" }}
                  >
                    {step.count}{" "}
                    {step.conversionPercent == null ? "" : `· ${step.conversionPercent}%`}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px]" style={{ color: "var(--app-muted)" }}>
              Percentages show conversion from the previous step. Counts are privacy-safe
              product events and canonical payments; GA4 sessions are reported separately.
            </p>
          </SectionPanel>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <SectionPanel title="Orders & net revenue">
              {series.length > 0 ? (
                <OrdersRevenueChart data={series} />
              ) : (
                <p
                  className="py-8 text-center text-xs"
                  style={{ color: "var(--app-muted)" }}
                >
                  No paid letters in this period yet.
                </p>
              )}
            </SectionPanel>
            <SectionPanel title="Delivery mix">
              {d.deliveryMix.standard + d.deliveryMix.registered > 0 ? (
                <DeliveryMixChart
                  data={[
                    {
                      label: "Standard",
                      value: d.deliveryMix.standard,
                      color: "var(--app-fg)",
                    },
                    {
                      label: "Registered",
                      value: d.deliveryMix.registered,
                      color: "var(--app-muted)",
                    },
                  ]}
                />
              ) : (
                <p
                  className="py-8 text-center text-xs"
                  style={{ color: "var(--app-muted)" }}
                >
                  No deliveries in this period yet.
                </p>
              )}
            </SectionPanel>
          </div>

          {/* Deferred external sources */}
          <div className="grid gap-4 lg:grid-cols-2">
            <SectionPanel title="GA4 traffic">
              <div className="space-y-2 text-xs" style={{ color: "var(--app-muted)" }}>
                <p className="font-medium" style={{ color: "var(--app-fg)" }}>
                  Read-only GA4 adapter not connected
                </p>
                <p>
                  {d.trackedVisits.value} tracked visits are available from our own
                  privacy-safe event store. GA4 sessions will appear here after the
                  property connection is configured.
                </p>
              </div>
            </SectionPanel>
            <ConnectLater
              title="Google Ads"
              description="Campaign spend, clicks and CPA will appear here once a read-only Google Ads adapter and real spend exist."
            />
          </div>

          {/* Tabbed detail */}
          <div className="rounded-xl border p-5" style={ALERT_COLOR}>
            <div className="mb-4 flex items-center gap-2">
              <Megaphone className="h-4 w-4" style={{ color: "var(--app-muted)" }} />
              <h3 className="text-xs font-semibold" style={{ color: "var(--app-muted)" }}>
                Detail
              </h3>
            </div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="letters">Letters</TabsTrigger>
                <TabsTrigger value="money">Money</TabsTrigger>
                <TabsTrigger value="feedback">Feedback</TabsTrigger>
                <TabsTrigger value="refunds">Refunds</TabsTrigger>
              </TabsList>
              <TabsContent value="letters">
                <LettersTab
                  period={period}
                  enabled={authenticated && tab === "letters"}
                />
              </TabsContent>
              <TabsContent value="money">
                <MoneyTab period={period} enabled={authenticated && tab === "money"} />
              </TabsContent>
              <TabsContent value="feedback">
                <FeedbackTab
                  period={period}
                  enabled={authenticated && tab === "feedback"}
                />
              </TabsContent>
              <TabsContent value="refunds">
                <RefundsTab enabled={authenticated && tab === "refunds"} />
              </TabsContent>
            </Tabs>
          </div>
        </>
      ) : null}
    </div>
  );
}
