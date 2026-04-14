"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@swiss-mail/shared";
import { ADMIN_PAGE_STACK_CLASS_NAME } from "@/components/layout/page-spacing";
import { useAdminAuth } from "../admin-auth-context";
import { fetchAdminRetention } from "../admin-api";
import {
  MetricCard,
  SectionPanel,
  PanelLoading,
  PanelError,
} from "../admin-metric-panels";

export default function RetentionPage() {
  const { authenticated } = useAdminAuth();

  const retention = useQuery({
    queryKey: queryKeys.admin.retention(),
    queryFn: () => fetchAdminRetention(),
    refetchInterval: 30_000,
    enabled: authenticated,
  });

  return (
    <div className={ADMIN_PAGE_STACK_CLASS_NAME}>
      <h1 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
        Retention
      </h1>

      {retention.isLoading ? (
        <PanelLoading />
      ) : retention.error ? (
        <PanelError message="Failed to load retention data" />
      ) : retention.data ? (
        <>
          <SectionPanel title="Retention Policy">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Content Retention"
                value={`${retention.data.contentRetentionDays}d`}
              />
              <MetricCard
                label="Session TTL"
                value={`${retention.data.sessionTtlHours}h`}
              />
              <MetricCard
                label="PDF Retention"
                value={`${retention.data.pdfRetentionHours}h`}
              />
              <MetricCard
                label="Audit Retention"
                value={`${retention.data.auditRetentionDays}d`}
              />
            </div>
          </SectionPanel>

          <SectionPanel title="Pending Expirations">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                label="Expired Sessions"
                value={retention.data.pendingExpirations.expiredSessions}
                alert={retention.data.pendingExpirations.expiredSessions > 0}
              />
              <MetricCard
                label="Expired Content"
                value={retention.data.pendingExpirations.expiredContent}
                alert={retention.data.pendingExpirations.expiredContent > 0}
              />
              <MetricCard
                label="Expired PDFs"
                value={retention.data.pendingExpirations.expiredPdfs}
                alert={retention.data.pendingExpirations.expiredPdfs > 0}
              />
            </div>
          </SectionPanel>

          <SectionPanel title="Recent Cleanups">
            {retention.data.recentCleanups.length > 0 ? (
              <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
                {retention.data.recentCleanups.map((cleanup, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm" style={{ color: "var(--app-fg)" }}>
                        {cleanup.type}
                      </p>
                      <p className="text-xs" style={{ color: "var(--app-muted)" }}>
                        {new Date(cleanup.ranAt).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className="font-mono text-sm font-medium"
                      style={{ color: "var(--app-fg)" }}
                    >
                      {cleanup.count} removed
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--app-muted)" }}>
                No recent cleanups
              </p>
            )}
          </SectionPanel>
        </>
      ) : null}
    </div>
  );
}
