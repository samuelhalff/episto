"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@swiss-mail/shared";
import { useAdminAuth } from "../admin-auth-context";
import { fetchAdminFunnel, fetchAdminErrors } from "../admin-api";
import {
  MetricCard,
  SectionPanel,
  PeriodSelector,
  PanelLoading,
  PanelError,
} from "../admin-metric-panels";

const REFETCH_MS = 15_000;

export default function FunnelPage() {
  const { authHeader } = useAdminAuth();
  const [period, setPeriod] = useState("7d");

  const funnel = useQuery({
    queryKey: queryKeys.admin.funnel(period),
    queryFn: () => fetchAdminFunnel(authHeader, period),
    refetchInterval: REFETCH_MS,
    enabled: !!authHeader,
  });

  const errors = useQuery({
    queryKey: queryKeys.admin.errors(period),
    queryFn: () => fetchAdminErrors(authHeader, period),
    refetchInterval: REFETCH_MS,
    enabled: !!authHeader,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
          Funnel Analysis
        </h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Funnel visualization */}
      <SectionPanel title="Conversion Funnel">
        {funnel.isLoading ? (
          <PanelLoading />
        ) : funnel.error ? (
          <PanelError message="Failed to load funnel data" />
        ) : funnel.data ? (
          <div className="space-y-1">
            {funnel.data.steps.map((step, i) => {
              const maxCount = funnel.data!.steps[0]?.count ?? 1;
              const pct = maxCount > 0 ? Math.round((step.count / maxCount) * 100) : 0;
              return (
                <div key={step.stage}>
                  <div className="flex items-center gap-3 py-2">
                    <span
                      className="w-24 shrink-0 text-right text-xs font-medium"
                      style={{ color: "var(--app-fg)" }}
                    >
                      {step.stage}
                    </span>
                    <div
                      className="h-8 flex-1 overflow-hidden rounded"
                      style={{ background: "var(--app-surface-muted)" }}
                    >
                      <div
                        className="flex h-full items-center rounded px-3 transition-all duration-500"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          background: "var(--app-fg)",
                          opacity: 0.15 + 0.6 * (1 - i / Math.max(funnel.data!.steps.length - 1, 1)),
                        }}
                      >
                        <span
                          className="text-xs font-medium"
                          style={{ color: "var(--app-fg)" }}
                        >
                          {step.count}
                        </span>
                      </div>
                    </div>
                    <span
                      className="w-14 text-right font-mono text-xs"
                      style={{ color: "var(--app-muted)" }}
                    >
                      {pct}%
                    </span>
                  </div>
                  {/* Dropoff indicator between stages */}
                  {i < funnel.data!.steps.length - 1 && step.dropOffPercent != null && step.dropOffPercent > 0 && (
                    <div className="flex items-center gap-3 pb-1">
                      <span className="w-24" />
                      <span className="text-[11px]" style={{ color: "var(--app-muted)" }}>
                        ↓ {step.dropOffPercent}% drop-off
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="mt-3 text-right">
              <span className="text-xs font-medium" style={{ color: "var(--app-muted)" }}>
                Overall conversion: {funnel.data.overallConversionPercent}%
              </span>
            </div>
          </div>
        ) : null}
      </SectionPanel>

      {/* Error breakdown panel */}
      <SectionPanel title="Error Breakdown">
        {errors.isLoading ? (
          <PanelLoading />
        ) : errors.error ? (
          <PanelError message="Failed to load error data" />
        ) : errors.data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {errors.data.entries.map((entry) => (
              <MetricCard
                key={entry.errorFamily}
                label={entry.errorFamily}
                value={entry.count}
                alert={entry.count > 0}
                sub={`${entry.affectedSessions} session${entry.affectedSessions === 1 ? "" : "s"} affected`}
              />
            ))}
          </div>
        ) : null}
      </SectionPanel>
    </div>
  );
}
