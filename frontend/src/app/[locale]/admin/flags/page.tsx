"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@episto/shared";
import { useAdminAuth } from "../admin-auth-context";
import {
  adminFetch,
  fetchAdminSuspiciousQueue,
  type HealthResponse,
  type OverviewResponse,
} from "../admin-api";
import { OverviewPanel, QueuesPanel } from "../admin-panels";
import { PanelLoading, PanelError } from "../admin-metric-panels";
import { SuspiciousQueuePanel } from "../admin-flags-panel";
import { ADMIN_PAGE_STACK_CLASS_NAME } from "@/components/layout/page-spacing";

const REFETCH_MS = 15_000;

export default function FlagsPage() {
  const { authenticated } = useAdminAuth();
  const pathname = usePathname();

  const overview = useQuery({
    queryKey: queryKeys.admin.overview(),
    queryFn: () => adminFetch<OverviewResponse>("/admin/overview"),
    refetchInterval: REFETCH_MS,
    enabled: authenticated,
  });

  const health = useQuery({
    queryKey: queryKeys.admin.health(),
    queryFn: () => adminFetch<HealthResponse>("/admin/health"),
    refetchInterval: REFETCH_MS,
    enabled: authenticated,
  });

  const suspicious = useQuery({
    queryKey: queryKeys.admin.suspicious(),
    queryFn: () => fetchAdminSuspiciousQueue(),
    refetchInterval: REFETCH_MS,
    enabled: authenticated,
  });

  return (
    <div className={ADMIN_PAGE_STACK_CLASS_NAME}>
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

      {suspicious.isLoading ? (
        <PanelLoading />
      ) : suspicious.error ? (
        <PanelError message="Failed to load suspicious activity" />
      ) : suspicious.data ? (
        <SuspiciousQueuePanel
          cases={suspicious.data.cases}
          pathname={pathname}
          onUpdated={() => suspicious.refetch()}
        />
      ) : null}
    </div>
  );
}
