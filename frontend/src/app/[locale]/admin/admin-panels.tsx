"use client";

import {
  Database,
  Server,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { HealthResponse, OverviewResponse, QueueStatus } from "./admin-api";

const headingStyle = { color: "var(--app-muted)" };
const foregroundStyle = { color: "var(--app-fg)" };
const mutedStyle = { color: "var(--app-muted)" };
const strongSurfaceStyle = {
  borderColor: "var(--app-border)",
  background: "var(--app-surface-strong)",
};
const mutedSurfaceStyle = {
  borderColor: "var(--app-border)",
  background: "var(--app-surface-muted)",
};

// ---------------------------------------------------------------------------
// Health Panel
// ---------------------------------------------------------------------------

export function HealthPanel({ health }: { health: HealthResponse }) {
  const services = [
    { label: "API", status: health.api, icon: Server },
    { label: "Database", status: health.database, icon: Database },
    { label: "Redis", status: health.redis, icon: HardDrive },
    { label: "Object Storage", status: health.objectStorage, icon: HardDrive },
    { label: "AI", status: health.ai, icon: Server },
  ];

  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold tracking-normal" style={headingStyle}>
        Service Health
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-lg border px-4 py-3"
            style={strongSurfaceStyle}
          >
            <s.icon className="h-5 w-5 shrink-0" style={mutedStyle} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium" style={foregroundStyle}>
                {s.label}
              </p>
              {s.status.detail && (
                <p className="truncate text-xs" style={mutedStyle}>
                  {s.status.detail}
                </p>
              )}
            </div>
            {s.status.ok ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 shrink-0 text-destructive" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-6 text-xs" style={mutedStyle}>
        <span>
          Last payment:{" "}
          {health.lastPaymentAt ? new Date(health.lastPaymentAt).toLocaleString() : "—"}
        </span>
        <span>
          Last dispatch:{" "}
          {health.lastDispatchAt ? new Date(health.lastDispatchAt).toLocaleString() : "—"}
        </span>
        {/*
          Every one of these is a customer still waiting on mail we owe them.
          `null` means the count could not be read — shown as "unavailable"
          rather than as a zero the operator would take for good news.
        */}
        <span
          style={health.undeliveredEmails !== 0 ? { color: "var(--app-fg)" } : undefined}
        >
          Undelivered email:{" "}
          <span className="font-medium">{health.undeliveredEmails ?? "unavailable"}</span>
        </span>
      </div>

      <div
        className="mt-4 rounded-lg border px-4 py-3 text-xs"
        style={{ ...mutedSurfaceStyle, ...mutedStyle }}
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <span>
            AI mode:{" "}
            <span className="font-medium" style={foregroundStyle}>
              {health.ai.providerMode}
            </span>
          </span>
          <span>
            Agent:{" "}
            <span className="font-medium" style={foregroundStyle}>
              {health.ai.agentId ?? "—"}
            </span>
          </span>
          <span>
            Project endpoint:{" "}
            <span className="font-medium" style={foregroundStyle}>
              {health.ai.projectEndpoint ?? "—"}
            </span>
          </span>
          <span>
            Environment:{" "}
            <span className="font-medium" style={foregroundStyle}>
              {health.ai.environmentName ?? "—"}
            </span>
          </span>
          <span>
            Location:{" "}
            <span className="font-medium" style={foregroundStyle}>
              {health.ai.location ?? "—"}
            </span>
          </span>
          <span>
            Subscription:{" "}
            <span className="font-medium" style={foregroundStyle}>
              {health.ai.subscriptionId ?? "—"}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Overview Panel
// ---------------------------------------------------------------------------

export function OverviewPanel({ overview }: { overview: OverviewResponse }) {
  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold tracking-normal" style={headingStyle}>
        Operational Overview
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Ambiguous Dispatches"
          value={overview.ambiguousDispatchQueue}
          alert={overview.ambiguousDispatchQueue > 0}
        />
        <StatCard
          label="Recent Refunds (7d)"
          value={overview.recentRefunds}
          alert={overview.recentRefunds > 5}
        />
        <StatCard
          label="Payments Captured (30d)"
          value={overview.payments.captured ?? 0}
        />
        <StatCard
          label="Payments Failed (30d)"
          value={overview.payments.failed ?? 0}
          alert={(overview.payments.failed ?? 0) > 0}
        />
        <StatCard
          label="Suspicious Queue"
          value={overview.suspiciousActivityQueue}
          alert={overview.suspiciousActivityQueue > 0}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <CountTable title="Dispatch States" data={overview.dispatch} />
        <CountTable title="Payment States (30d)" data={overview.payments} />
      </div>

      <p className="mt-4 text-xs" style={mutedStyle}>
        Generated at: {new Date(overview.generatedAt).toLocaleString()}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Queues Panel
// ---------------------------------------------------------------------------

export function QueuesPanel({ queues }: { queues: Record<string, QueueStatus> }) {
  const entries = Object.entries(queues);
  if (entries.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-sm font-semibold tracking-normal" style={headingStyle}>
        Queue Status
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([name, q]) => (
          <div
            key={name}
            className="rounded-lg border px-4 py-3"
            style={strongSurfaceStyle}
          >
            <p className="text-sm font-medium" style={foregroundStyle}>
              {name.replace(/-/g, " ")}
            </p>
            <div className="mt-2 flex gap-4 text-xs">
              <span style={mutedStyle}>
                Waiting:{" "}
                <span className="font-medium" style={foregroundStyle}>
                  {q.waiting}
                </span>
              </span>
              <span style={mutedStyle}>
                Active:{" "}
                <span className="font-medium" style={foregroundStyle}>
                  {q.active}
                </span>
              </span>
              <span
                className={q.failed > 0 ? "text-destructive" : ""}
                style={q.failed > 0 ? undefined : mutedStyle}
              >
                Failed: <span className="font-medium">{q.failed}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  alert,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div
      className="rounded-lg border px-4 py-3"
      style={{
        borderColor: alert ? "rgba(245, 158, 11, 0.3)" : "var(--app-border)",
        background: alert ? "rgba(245, 158, 11, 0.06)" : "var(--app-surface-strong)",
      }}
    >
      <p className="text-xs font-medium" style={mutedStyle}>
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-2xl font-semibold" style={foregroundStyle}>
          {value}
        </span>
        {alert && <AlertTriangle className="h-4 w-4 text-amber-500" />}
      </div>
    </div>
  );
}

function CountTable({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border" style={strongSurfaceStyle}>
      <h3
        className="border-b px-4 py-2 text-xs font-semibold tracking-normal"
        style={{ color: "var(--app-muted)", borderColor: "var(--app-border)" }}
      >
        {title}
      </h3>
      <div>
        {entries.map(([key, value], index) => (
          <div
            key={key}
            className="flex items-center justify-between px-4 py-2"
            style={index === 0 ? undefined : { borderTop: "1px solid var(--app-border)" }}
          >
            <span className="text-sm" style={mutedStyle}>
              {key.replace(/_/g, " ")}
            </span>
            <span className="font-mono text-sm font-medium" style={foregroundStyle}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
