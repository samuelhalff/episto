"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { MetricCard, SectionPanel } from "./admin-metric-panels";

export interface AdminQuickAction {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export interface AdminStateBreakdownEntry {
  label: string;
  value: number;
}

export function AdminQuickActionPanel({
  title,
  actions,
}: {
  title: string;
  actions: AdminQuickAction[];
}) {
  return (
    <SectionPanel title={title}>
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-xl border p-4 transition hover:opacity-95"
            style={{
              borderColor: "var(--app-border)",
              background: "var(--app-surface-muted)",
              color: "var(--app-fg)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{
                  background: "var(--app-surface-strong)",
                  color: "var(--app-fg)",
                }}
              >
                <action.icon className="h-4 w-4" />
              </span>
              <ArrowRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-0.5" />
            </div>
            <p className="mt-4 text-sm font-semibold" style={{ color: "var(--app-fg)" }}>
              {action.label}
            </p>
            <p
              className="mt-1 text-xs leading-relaxed"
              style={{ color: "var(--app-muted)" }}
            >
              {action.description}
            </p>
          </Link>
        ))}
      </div>
    </SectionPanel>
  );
}

export function AdminPriorityQueuesPanel({
  title,
  metrics,
}: {
  title: string;
  metrics: Array<{
    label: string;
    value: number;
    alert?: boolean | undefined;
    sub?: string | undefined;
    href?: string | undefined;
  }>;
}) {
  return (
    <SectionPanel title={title}>
      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            alert={metric.alert}
            sub={metric.sub}
            href={metric.href}
          />
        ))}
      </div>
    </SectionPanel>
  );
}

export function AdminStateBreakdownPanel({
  title,
  entries,
}: {
  title: string;
  entries: AdminStateBreakdownEntry[];
}) {
  return (
    <SectionPanel title={title}>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.label}
            className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--app-border)",
              background: "var(--app-surface-muted)",
            }}
          >
            <span style={{ color: "var(--app-muted)" }}>{entry.label}</span>
            <span className="font-mono font-semibold" style={{ color: "var(--app-fg)" }}>
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    </SectionPanel>
  );
}
