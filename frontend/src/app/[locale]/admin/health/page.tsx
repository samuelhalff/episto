"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@swiss-mail/shared";
import { useAdminAuth } from "../admin-auth-context";
import { adminFetch, type HealthResponse } from "../admin-api";
import { HealthPanel, QueuesPanel } from "../admin-panels";
import { PanelLoading, PanelError } from "../admin-metric-panels";

const REFETCH_MS = 15_000;

export default function HealthPage() {
  const { authenticated } = useAdminAuth();

  const health = useQuery({
    queryKey: queryKeys.admin.health(),
    queryFn: () => adminFetch<HealthResponse>("/admin/health"),
    refetchInterval: REFETCH_MS,
    enabled: authenticated,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
        Health
      </h1>

      {health.isLoading ? (
        <PanelLoading />
      ) : health.error ? (
        <PanelError message="Failed to load health data" />
      ) : health.data ? (
        <>
          <HealthPanel health={health.data} />
          <QueuesPanel queues={health.data.queues} />
        </>
      ) : null}
    </div>
  );
}
