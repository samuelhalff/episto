"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@swiss-mail/shared";
import { useAdminAuth } from "../admin-auth-context";
import {
  fetchAdminSummary,
  fetchAdminActive,
  fetchAdminLocale,
  fetchAdminAi,
} from "../admin-api";
import {
  MetricCard,
  BarRow,
  SectionPanel,
  PeriodSelector,
  PanelLoading,
  PanelError,
} from "../admin-metric-panels";

const REFETCH_MS = 15_000;

function formatCHF(cents: number): string {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export default function OverviewPage() {
  const { authHeader } = useAdminAuth();
  const [period, setPeriod] = useState("7d");

  const summary = useQuery({
    queryKey: queryKeys.admin.summary(period),
    queryFn: () => fetchAdminSummary(authHeader, period),
    refetchInterval: REFETCH_MS,
    enabled: !!authHeader,
  });

  const active = useQuery({
    queryKey: queryKeys.admin.active(),
    queryFn: () => fetchAdminActive(authHeader),
    refetchInterval: REFETCH_MS,
    enabled: !!authHeader,
  });

  const locale = useQuery({
    queryKey: queryKeys.admin.locale(),
    queryFn: () => fetchAdminLocale(authHeader),
    refetchInterval: REFETCH_MS,
    enabled: !!authHeader,
  });

  const ai = useQuery({
    queryKey: queryKeys.admin.ai(period),
    queryFn: () => fetchAdminAi(authHeader, period),
    refetchInterval: REFETCH_MS,
    enabled: !!authHeader,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
          Overview
        </h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Summary metrics row */}
      {summary.isLoading ? (
        <PanelLoading />
      ) : summary.error ? (
        <PanelError message="Failed to load summary" />
      ) : summary.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Active Sessions" value={summary.data.activeSessions} />
          <MetricCard label="Letters Sent" value={summary.data.lettersSent} />
          <MetricCard label="Revenue" value={formatCHF(summary.data.revenueCents)} />
          <MetricCard
            label="Error Rate"
            value={formatPercent(summary.data.errorRate)}
            alert={summary.data.errorRate > 0.05}
            sub={summary.data.errorRate > 0.05 ? "Above threshold" : undefined}
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active sessions by stage */}
        <SectionPanel title="Active Sessions by Stage">
          {active.isLoading ? (
            <PanelLoading />
          ) : active.error ? (
            <PanelError message="Failed to load active sessions" />
          ) : active.data ? (
            <div className="space-y-3">
              <MetricCard label="Total Active" value={active.data.total} />
              <div className="space-y-2 pt-2">
                {Object.entries(active.data.byStage).map(([stage, count]) => (
                  <BarRow
                    key={stage}
                    label={stage}
                    value={count}
                    max={active.data!.total}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </SectionPanel>

        {/* Locale distribution panel */}
        <SectionPanel title="Locale Distribution">
          {locale.isLoading ? (
            <PanelLoading />
          ) : locale.error ? (
            <PanelError message="Failed to load locale data" />
          ) : locale.data ? (
            <div className="space-y-2">
              {locale.data.entries.length > 0 ? (
                locale.data.entries.map((entry) => {
                  const maxVal = Math.max(
                    ...locale.data!.entries.map((e) => e.count),
                  );
                  return (
                    <BarRow
                      key={entry.locale}
                      label={entry.locale}
                      value={entry.count}
                      max={maxVal}
                      formatValue={(v) => `${v} (${entry.percent}%)`}
                    />
                  );
                })
              ) : (
                <p className="text-xs" style={{ color: "var(--app-muted)" }}>
                  No data
                </p>
              )}
            </div>
          ) : null}
        </SectionPanel>

        {/* AI quality panel */}
        <SectionPanel title="AI Quality">
          {ai.isLoading ? (
            <PanelLoading />
          ) : ai.error ? (
            <PanelError message="Failed to load AI data" />
          ) : ai.data ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard label="Total Requests" value={ai.data.totalRequests} />
              <MetricCard
                label="Avg Latency"
                value={`${Math.round(ai.data.avgLatencyMs)} ms`}
                alert={ai.data.avgLatencyMs > 5000}
                sub={ai.data.avgLatencyMs > 5000 ? "High latency" : undefined}
              />
              <MetricCard
                label="Regen Rate"
                value={formatPercent(ai.data.regenerationRate)}
                alert={ai.data.regenerationRate > 0.3}
                sub={ai.data.regenerationRate > 0.3 ? "High regen rate" : undefined}
              />
              <MetricCard
                label="Refusal Rate"
                value={formatPercent(ai.data.refusalRate)}
                alert={ai.data.refusalRate > 0.1}
                sub={ai.data.refusalRate > 0.1 ? "High refusal rate" : undefined}
              />
            </div>
          ) : null}
        </SectionPanel>
      </div>
    </div>
  );
}
