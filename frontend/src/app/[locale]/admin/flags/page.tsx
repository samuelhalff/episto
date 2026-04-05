"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@swiss-mail/shared";
import { useAdminAuth } from "../admin-auth-context";
import { adminFetch, type HealthResponse, type OverviewResponse } from "../admin-api";
import { OverviewPanel, QueuesPanel } from "../admin-panels";
import { PanelLoading, PanelError } from "../admin-metric-panels";

const REFETCH_MS = 15_000;

export default function FlagsPage() {
  const { authHeader } = useAdminAuth();

  const overview = useQuery({
    queryKey: queryKeys.admin.overview(),
    queryFn: () => adminFetch<OverviewResponse>("/admin/overview", authHeader),
    refetchInterval: REFETCH_MS,
    enabled: !!authHeader,
  });

  const health = useQuery({
    queryKey: queryKeys.admin.health(),
    queryFn: () => adminFetch<HealthResponse>("/admin/health", authHeader),
    refetchInterval: REFETCH_MS,
    enabled: !!authHeader,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
        Flags &amp; Queue
      </h1>

      {overview.isLoading ? (
        <PanelLoading />
      ) : overview.error ? (
        <PanelError message="Failed to load overview" />
      ) : overview.data ? (
        <OverviewPanel overview={overview.data} />
      ) : null}

      {health.isLoading ? (
        <PanelLoading />
      ) : health.error ? (
        <PanelError message="Failed to load queue status" />
      ) : health.data?.queues ? (
        <QueuesPanel queues={health.data.queues} />
      ) : null}
    </div>
  );
}
