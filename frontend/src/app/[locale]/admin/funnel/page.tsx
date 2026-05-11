"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@episto/shared";
import { useAdminAuth } from "../admin-auth-context";
import { fetchAdminFunnel, fetchAdminErrors, fetchAdminStepFriction } from "../admin-api";
import {
  MetricCard,
  SectionPanel,
  PeriodSelector,
  PanelLoading,
  PanelError,
} from "../admin-metric-panels";
import { ADMIN_PAGE_STACK_CLASS_NAME } from "@/components/layout/page-spacing";

const REFETCH_MS = 15_000;

export default function FunnelPage() {
  const { authenticated } = useAdminAuth();
  const [period, setPeriod] = useState("7d");

  const funnel = useQuery({
    queryKey: queryKeys.admin.funnel(period),
    queryFn: () => fetchAdminFunnel(period),
    refetchInterval: REFETCH_MS,
    enabled: authenticated,
  });

  const errors = useQuery({
    queryKey: queryKeys.admin.errors(period),
    queryFn: () => fetchAdminErrors(period),
    refetchInterval: REFETCH_MS,
    enabled: authenticated,
  });
  const stepFriction = useQuery({
    queryKey: ["admin", "step-friction", period],
    queryFn: () => fetchAdminStepFriction(period),
    refetchInterval: REFETCH_MS,
    enabled: authenticated,
  });
  const funnelData = funnel.data;
  const stepData = stepFriction.data;

  function formatDuration(ms: number): string {
    if (!ms) return "–";
    if (ms < 1000) return `${ms}ms`;
    const sec = Math.round(ms / 100) / 10;
    if (sec < 60) return `${sec}s`;
    return `${Math.round(sec / 6) / 10}m`;
  }

  function formatTimeAgo(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString("en-CH", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div className={ADMIN_PAGE_STACK_CLASS_NAME}>
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
        ) : funnelData ? (
          <div className="space-y-1">
            {funnelData.steps.length === 0 ? (
              <p
                className="py-8 text-center text-xs"
                style={{ color: "var(--app-muted)" }}
              >
                No funnel data for this period
              </p>
            ) : (
              funnelData.steps.map((step, i) => {
                const maxCount = funnelData.steps[0]?.count ?? 1;
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
                            opacity:
                              0.15 +
                              0.6 * (1 - i / Math.max(funnelData.steps.length - 1, 1)),
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
                    {i < funnelData.steps.length - 1 &&
                      step.dropOffPercent != null &&
                      step.dropOffPercent > 0 && (
                        <div className="flex items-center gap-3 pb-1">
                          <span className="w-24" />
                          <span
                            className="text-[11px]"
                            style={{ color: "var(--app-muted)" }}
                          >
                            ↓ {step.dropOffPercent}% drop-off
                          </span>
                        </div>
                      )}
                  </div>
                );
              })
            )}
            <div className="mt-3 text-right">
              <span className="text-xs font-medium" style={{ color: "var(--app-muted)" }}>
                Overall conversion: {funnelData.overallConversionPercent}%
              </span>
            </div>
          </div>
        ) : null}
      </SectionPanel>

      {/* Step friction panel */}
      <SectionPanel title="Step Friction">
        {stepFriction.isLoading ? (
          <PanelLoading />
        ) : stepFriction.error ? (
          <PanelError message="Failed to load step friction data" />
        ) : stepData ? (
          stepData.steps.length === 0 ? (
            <p className="py-8 text-center text-xs" style={{ color: "var(--app-muted)" }}>
              No step events in this period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ color: "var(--app-muted)" }}>
                    <th className="py-2 pr-3 font-medium">Step</th>
                    <th className="py-2 pr-3 text-right font-medium">Entered</th>
                    <th className="py-2 pr-3 text-right font-medium">Completed</th>
                    <th className="py-2 pr-3 text-right font-medium">Idle</th>
                    <th className="py-2 pr-3 text-right font-medium">Abandoned</th>
                    <th className="py-2 pr-3 text-right font-medium">Errors</th>
                    <th className="py-2 pr-3 text-right font-medium">Median</th>
                    <th className="py-2 text-right font-medium">Drop-off</th>
                  </tr>
                </thead>
                <tbody>
                  {stepData.steps.map((s) => {
                    const high = s.dropOffPercent >= 30;
                    return (
                      <tr
                        key={s.step}
                        className="border-t"
                        style={{ borderColor: "var(--app-border)" }}
                      >
                        <td
                          className="py-2 pr-3 font-medium"
                          style={{ color: "var(--app-fg)" }}
                        >
                          {s.step}
                        </td>
                        <td
                          className="py-2 pr-3 text-right font-mono"
                          style={{ color: "var(--app-fg)" }}
                        >
                          {s.entered}
                        </td>
                        <td
                          className="py-2 pr-3 text-right font-mono"
                          style={{ color: "var(--app-fg)" }}
                        >
                          {s.completed}
                        </td>
                        <td
                          className="py-2 pr-3 text-right font-mono"
                          style={{ color: "var(--app-muted)" }}
                        >
                          {s.idle}
                        </td>
                        <td
                          className="py-2 pr-3 text-right font-mono"
                          style={{
                            color: s.abandoned > 0 ? "var(--app-fg)" : "var(--app-muted)",
                          }}
                        >
                          {s.abandoned}
                        </td>
                        <td
                          className="py-2 pr-3 text-right font-mono"
                          style={{
                            color: s.errors > 0 ? "rgb(220, 38, 38)" : "var(--app-muted)",
                          }}
                        >
                          {s.errors}
                        </td>
                        <td
                          className="py-2 pr-3 text-right font-mono"
                          style={{ color: "var(--app-muted)" }}
                        >
                          {formatDuration(s.medianDurationMs)}
                        </td>
                        <td
                          className="py-2 text-right font-mono"
                          style={{
                            color: high ? "rgb(217, 119, 6)" : "var(--app-muted)",
                            fontWeight: high ? 600 : 400,
                          }}
                        >
                          {s.dropOffPercent}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </SectionPanel>

      {/* Stuck users panel */}
      <SectionPanel title="Currently Stuck Sessions">
        {stepFriction.isLoading ? (
          <PanelLoading />
        ) : stepFriction.error ? (
          <PanelError message="Failed to load stuck sessions" />
        ) : stepData ? (
          stepData.stuckUsers.length === 0 ? (
            <p className="py-8 text-center text-xs" style={{ color: "var(--app-muted)" }}>
              No stuck sessions in this period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ color: "var(--app-muted)" }}>
                    <th className="py-2 pr-3 font-medium">Session</th>
                    <th className="py-2 pr-3 font-medium">Draft</th>
                    <th className="py-2 pr-3 font-medium">Step</th>
                    <th className="py-2 font-medium">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {stepData.stuckUsers.map((u) => (
                    <tr
                      key={`${u.sessionId}-${u.step}`}
                      className="border-t"
                      style={{ borderColor: "var(--app-border)" }}
                    >
                      <td
                        className="py-2 pr-3 font-mono"
                        style={{ color: "var(--app-fg)" }}
                      >
                        {u.sessionId.slice(0, 8)}…
                      </td>
                      <td
                        className="py-2 pr-3 font-mono"
                        style={{ color: "var(--app-muted)" }}
                      >
                        {u.draftId ? `${u.draftId.slice(0, 8)}…` : "–"}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--app-fg)" }}>
                        {u.step}
                      </td>
                      <td className="py-2" style={{ color: "var(--app-muted)" }}>
                        {formatTimeAgo(u.lastSeen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </SectionPanel>

      {/* Error breakdown panel */}
      <SectionPanel title="Error Breakdown">
        {errors.isLoading ? (
          <PanelLoading />
        ) : errors.error ? (
          <PanelError message="Failed to load error data" />
        ) : errors.data ? (
          errors.data.entries.length === 0 ? (
            <p className="py-8 text-center text-xs" style={{ color: "var(--app-muted)" }}>
              No errors in this period
            </p>
          ) : (
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
          )
        ) : null}
      </SectionPanel>
    </div>
  );
}
