"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Metric Card — single number with optional alert state
// ---------------------------------------------------------------------------

export function MetricCard({
  label,
  value,
  alert,
  sub,
  href,
}: {
  label: string;
  value: string | number;
  alert?: boolean | undefined;
  sub?: string | undefined;
  href?: string | undefined;
}) {
  const card = (
    <div
      className="rounded-xl border px-5 py-4"
      style={{
        borderColor: alert ? "rgba(245, 158, 11, 0.3)" : "var(--app-border)",
        background: alert ? "rgba(245, 158, 11, 0.06)" : "var(--app-surface-strong)",
      }}
    >
      <p className="text-xs font-medium" style={{ color: "var(--app-muted)" }}>
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-2xl font-semibold" style={{ color: "var(--app-fg)" }}>
          {value}
        </span>
        {alert && <AlertTriangle className="h-4 w-4 text-amber-500" />}
      </div>
      {sub && (
        <p className="mt-1 text-[11px]" style={{ color: "var(--app-muted)" }}>
          {sub}
        </p>
      )}
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

// ---------------------------------------------------------------------------
// Bar Row — CSS-only horizontal bar for charts
// ---------------------------------------------------------------------------

export function BarRow({
  label,
  value,
  max,
  formatValue,
}: {
  label: string;
  value: number;
  max: number;
  formatValue?: (v: number) => string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-28 shrink-0 text-right text-xs"
        style={{ color: "var(--app-muted)" }}
      >
        {label}
      </span>
      <div
        className="h-5 flex-1 overflow-hidden rounded"
        style={{ background: "var(--app-surface-muted)" }}
      >
        <div
          className="h-full rounded transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "var(--app-fg)",
            opacity: 0.7,
          }}
        />
      </div>
      <span
        className="w-14 text-right font-mono text-xs"
        style={{ color: "var(--app-fg)" }}
      >
        {formatValue ? formatValue(value) : value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Panel — titled card wrapper
// ---------------------------------------------------------------------------

export function SectionPanel({
  title,
  children,
  action,
  id,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  id?: string | undefined;
}) {
  return (
    <div
      id={id}
      className="rounded-xl border p-5"
      style={{
        borderColor: "var(--app-border)",
        background: "var(--app-surface-strong)",
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3
          className="text-xs font-semibold tracking-normal"
          style={{ color: "var(--app-muted)" }}
        >
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Period Selector — 24h / 7d / 30d toggle
// ---------------------------------------------------------------------------

export function PeriodSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const options = ["today", "7d", "30d"];
  return (
    <div
      className="inline-flex rounded-lg border p-0.5"
      style={{ borderColor: "var(--app-border)" }}
    >
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className="rounded-md px-3 py-1 text-xs font-medium transition"
          style={{
            background: value === opt ? "var(--app-fg)" : "transparent",
            color: value === opt ? "var(--app-bg)" : "var(--app-muted)",
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading / Error states
// ---------------------------------------------------------------------------

export function PanelLoading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div
        className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: "var(--app-muted)", borderTopColor: "transparent" }}
      />
    </div>
  );
}

export function PanelError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}
