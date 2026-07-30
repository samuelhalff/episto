"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@episto/shared";
import { AlertTriangle, Megaphone } from "lucide-react";

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
import { fetchFailedDispatches } from "../admin-api";
import { formatChf, metricSubLabel, toChf } from "./dashboard-format";
import { MoneyTab, LettersTab, FeedbackTab, RefundsTab } from "./dashboard-tabs";

const ALERT_COLOR = {
  borderColor: "var(--app-border)",
  background: "var(--app-surface-strong)",
};

function SourceMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-lg border px-3 py-2"
      style={{ borderColor: "var(--app-border)" }}
    >
      <p className="text-[11px]" style={{ color: "var(--app-muted)" }}>
        {label}
      </p>
      <p className="mt-0.5 font-mono text-sm" style={{ color: "var(--app-fg)" }}>
        {value}
      </p>
    </div>
  );
}

function SourceUnavailable() {
  return (
    <p className="py-5 text-xs" style={{ color: "var(--app-muted)" }}>
      No read-only data returned for this period.
    </p>
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
  const { locale } = useParams<{ locale: string }>();

  const q = useQuery({
    queryKey: queryKeys.admin.dashboard(period),
    queryFn: () => fetchAdminDashboard(period),
    refetchInterval: 30_000,
    enabled: authenticated,
  });

  const d = q.data;
  const failedDispatches = useQuery({
    queryKey: ["admin", "dispatch", "failed"],
    queryFn: fetchFailedDispatches,
    refetchInterval: 30_000,
    enabled: authenticated,
  });

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

          {failedDispatches.data?.dispatches.length ? (
            <SectionPanel id="dispatch-cases" title="Dispatch cases requiring attention">
              <div className="space-y-2">
                {failedDispatches.data.dispatches.map((item) => (
                  <Link
                    key={item.dispatchAttemptId}
                    href={`/${locale}/admin/drafts/${item.draftId}`}
                    className="block rounded-lg border px-3 py-2 text-sm hover:bg-black/[.03]"
                    style={{ borderColor: "var(--app-border)" }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium" style={{ color: "var(--app-fg)" }}>
                        {item.customerEmail ?? `Session ${item.sessionId.slice(0, 8)}`}
                      </span>
                      <span
                        className="font-mono text-xs"
                        style={{ color: "var(--app-muted)" }}
                      >
                        {item.state} · {item.draftId.slice(0, 8)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: "var(--app-muted)" }}>
                      {item.failureReason ?? "Provider outcome needs review"}
                    </p>
                  </Link>
                ))}
              </div>
            </SectionPanel>
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

          {/* External sources — deliberately separate from the internal funnel. */}
          <div className="grid gap-4 lg:grid-cols-3">
            <SectionPanel title="GA4 traffic">
              {d.analytics.ga4.status === "connected" ? (
                <div className="grid grid-cols-2 gap-2">
                  <SourceMetric label="Sessions" value={d.analytics.ga4.sessions} />
                  <SourceMetric label="Users" value={d.analytics.ga4.activeUsers} />
                  <SourceMetric label="Page views" value={d.analytics.ga4.pageViews} />
                  <SourceMetric
                    label="Conversations"
                    value={d.analytics.ga4.conversations}
                  />
                  <SourceMetric
                    label="Draft starts"
                    value={d.analytics.ga4.draftStarts}
                  />
                  <SourceMetric
                    label="Checkouts"
                    value={d.analytics.ga4.checkoutsStarted}
                  />
                  <SourceMetric label="Purchases" value={d.analytics.ga4.purchases} />
                </div>
              ) : (
                <SourceUnavailable />
              )}
            </SectionPanel>
            <SectionPanel title="Search Console">
              {d.analytics.searchConsole.status === "connected" ? (
                <div className="grid grid-cols-2 gap-2">
                  <SourceMetric label="Clicks" value={d.analytics.searchConsole.clicks} />
                  <SourceMetric
                    label="Impressions"
                    value={d.analytics.searchConsole.impressions}
                  />
                  <SourceMetric
                    label="CTR"
                    value={`${(d.analytics.searchConsole.ctr * 100).toFixed(1)}%`}
                  />
                  <SourceMetric
                    label="Avg. position"
                    value={d.analytics.searchConsole.position.toFixed(1)}
                  />
                </div>
              ) : (
                <SourceUnavailable />
              )}
            </SectionPanel>
            <SectionPanel title="Google Ads">
              {d.analytics.ads.status === "connected" ? (
                <div className="grid grid-cols-2 gap-2">
                  <SourceMetric
                    label="Spend"
                    value={formatChf(d.analytics.ads.spendCents)}
                  />
                  <SourceMetric label="Clicks" value={d.analytics.ads.clicks} />
                  <SourceMetric label="Impressions" value={d.analytics.ads.impressions} />
                  <SourceMetric label="Conversions" value={d.analytics.ads.conversions} />
                  <SourceMetric label="Campaigns" value={d.analytics.ads.campaignCount} />
                </div>
              ) : (
                <SourceUnavailable />
              )}
            </SectionPanel>
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
