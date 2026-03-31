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
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Service Health
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {services.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-lg border bg-white px-4 py-3"
          >
            <s.icon className="h-5 w-5 shrink-0 text-zinc-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-zinc-950">{s.label}</p>
              {s.status.detail && (
                <p className="truncate text-xs text-zinc-400">{s.status.detail}</p>
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

      <div className="mt-4 flex flex-wrap gap-6 text-xs text-zinc-400">
        <span>
          Last payment:{" "}
          {health.lastPaymentAt
            ? new Date(health.lastPaymentAt).toLocaleString()
            : "—"}
        </span>
        <span>
          Last dispatch:{" "}
          {health.lastDispatchAt
            ? new Date(health.lastDispatchAt).toLocaleString()
            : "—"}
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500">
        <div className="grid gap-2 sm:grid-cols-2">
          <span>AI mode: <span className="font-medium text-zinc-700">{health.ai.providerMode}</span></span>
          <span>Agent: <span className="font-medium text-zinc-700">{health.ai.agentId ?? "—"}</span></span>
          <span>Project endpoint: <span className="font-medium text-zinc-700">{health.ai.projectEndpoint ?? "—"}</span></span>
          <span>Environment: <span className="font-medium text-zinc-700">{health.ai.environmentName ?? "—"}</span></span>
          <span>Location: <span className="font-medium text-zinc-700">{health.ai.location ?? "—"}</span></span>
          <span>Subscription: <span className="font-medium text-zinc-700">{health.ai.subscriptionId ?? "—"}</span></span>
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
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Operational Overview
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <CountTable title="Dispatch States" data={overview.dispatch} />
        <CountTable title="Payment States (30d)" data={overview.payments} />
      </div>

      <p className="mt-4 text-xs text-zinc-400">
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
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Queue Status
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([name, q]) => (
          <div key={name} className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
            <p className="text-sm font-medium text-zinc-950">
              {name.replace(/-/g, " ")}
            </p>
            <div className="mt-2 flex gap-4 text-xs">
              <span className="text-zinc-500">
                Waiting: <span className="font-medium text-zinc-700">{q.waiting}</span>
              </span>
              <span className="text-zinc-500">
                Active: <span className="font-medium text-zinc-700">{q.active}</span>
              </span>
              <span className={q.failed > 0 ? "text-destructive" : "text-zinc-500"}>
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
      className={`rounded-lg border px-4 py-3 ${
        alert ? "border-amber-200 bg-amber-50" : "border-zinc-200 bg-white"
      }`}
    >
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-2xl font-semibold text-zinc-950">{value}</span>
        {alert && <AlertTriangle className="h-4 w-4 text-amber-500" />}
      </div>
    </div>
  );
}

function CountTable({
  title,
  data,
}: {
  title: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-white">
      <h3 className="border-b border-zinc-100 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h3>
      <div className="divide-y divide-zinc-50">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between px-4 py-2">
            <span className="text-sm text-zinc-600">{key.replace(/_/g, " ")}</span>
            <span className="font-mono text-sm font-medium text-zinc-950">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
