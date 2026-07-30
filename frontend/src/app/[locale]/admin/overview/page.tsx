"use client";

import { Search, ShieldAlert, Trash2, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@episto/shared";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

import { ADMIN_PAGE_STACK_CLASS_NAME } from "@/components/layout/page-spacing";
import { getAdminPagePath } from "@/lib/admin-paths";
import { useAdminAuth } from "../admin-auth-context";
import { fetchAdminOverview, fetchAdminRetention } from "../admin-api";
import { PanelError, PanelLoading } from "../admin-metric-panels";
import {
  AdminPriorityQueuesPanel,
  AdminQuickActionPanel,
  AdminStateBreakdownPanel,
} from "../admin-overview-panels";

const REFETCH_MS = 15_000;

export default function OverviewPage() {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const { authenticated } = useAdminAuth();

  const overview = useQuery({
    queryKey: queryKeys.admin.overview(),
    queryFn: () => fetchAdminOverview(),
    refetchInterval: REFETCH_MS,
    enabled: authenticated,
  });

  const retention = useQuery({
    queryKey: queryKeys.admin.retention(),
    queryFn: () => fetchAdminRetention(),
    refetchInterval: 30_000,
    enabled: authenticated,
  });

  const generatedAt = overview.data?.generatedAt ?? retention.data?.generatedAt ?? null;
  const dispatchCasesHref = `${getAdminPagePath(pathname, "dashboard")}#dispatch-cases`;

  const quickActions = [
    {
      href: getAdminPagePath(pathname, "search"),
      label: t("overview.quickActions.search"),
      description: t("overview.quickActions.searchBody"),
      icon: Search,
    },
    {
      href: getAdminPagePath(pathname, "flags"),
      label: t("overview.quickActions.flags"),
      description: t("overview.quickActions.flagsBody"),
      icon: ShieldAlert,
    },
    {
      href: getAdminPagePath(pathname, "sessions"),
      label: t("overview.quickActions.sessions"),
      description: t("overview.quickActions.sessionsBody"),
      icon: Users,
    },
    {
      href: getAdminPagePath(pathname, "retention"),
      label: t("overview.quickActions.retention"),
      description: t("overview.quickActions.retentionBody"),
      icon: Trash2,
    },
  ];

  return (
    <div className={ADMIN_PAGE_STACK_CLASS_NAME}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
            {t("overview.title")}
          </h2>
          {generatedAt ? (
            <span className="text-xs" style={{ color: "var(--app-muted)" }}>
              {t("overview.generatedAt", {
                time: new Date(generatedAt).toLocaleString(),
              })}
            </span>
          ) : null}
        </div>
        <p className="max-w-3xl text-sm" style={{ color: "var(--app-muted)" }}>
          {t("overview.description")}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.95fr)]">
        {overview.isLoading ? (
          <PanelLoading />
        ) : overview.error ? (
          <PanelError message={t("overview.errors.priority")} />
        ) : overview.data ? (
          <AdminPriorityQueuesPanel
            title={t("overview.priority.title")}
            metrics={[
              {
                label: t("overview.priority.ambiguous"),
                value: overview.data.ambiguousDispatchQueue,
                alert: overview.data.ambiguousDispatchQueue > 0,
                sub: t("overview.priority.ambiguousInfo"),
                href: dispatchCasesHref,
              },
              {
                label: t("overview.priority.failedDispatches"),
                value: overview.data.failedDispatches,
                alert: overview.data.failedDispatches > 0,
                sub: t("overview.priority.failedDispatchesInfo"),
                href: dispatchCasesHref,
              },
              {
                label: t("overview.priority.suspicious"),
                value: overview.data.suspiciousActivityQueue,
                alert: overview.data.suspiciousActivityQueue > 0,
                sub: t("overview.priority.suspiciousInfo"),
              },
            ]}
          />
        ) : null}

        <AdminQuickActionPanel
          title={t("overview.quickActions.title")}
          actions={quickActions}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {overview.isLoading ? (
          <PanelLoading />
        ) : overview.error ? (
          <PanelError message={t("overview.errors.priority")} />
        ) : overview.data ? (
          <>
            <AdminStateBreakdownPanel
              title={t("overview.dispatchStates")}
              entries={[
                { label: t("states.queued"), value: overview.data.dispatch.queued ?? 0 },
                {
                  label: t("states.submitted"),
                  value: overview.data.dispatch.submitted ?? 0,
                },
                {
                  label: t("states.accepted"),
                  value: overview.data.dispatch.accepted ?? 0,
                },
                {
                  label: t("states.rejected"),
                  value: overview.data.dispatch.rejected ?? 0,
                },
                {
                  label: t("states.unknown"),
                  value: overview.data.dispatch.unknown ?? 0,
                },
                {
                  label: t("states.reconciled"),
                  value: overview.data.dispatch.reconciled ?? 0,
                },
              ]}
            />
            <AdminStateBreakdownPanel
              title={t("overview.paymentStates")}
              entries={[
                {
                  label: t("states.pending"),
                  value: overview.data.payments.pending ?? 0,
                },
                {
                  label: t("states.captured"),
                  value: overview.data.payments.captured ?? 0,
                },
                { label: t("states.failed"), value: overview.data.payments.failed ?? 0 },
                {
                  label: t("states.refundPending"),
                  value: overview.data.payments.refund_pending ?? 0,
                },
                {
                  label: t("states.refunded"),
                  value: overview.data.payments.refunded ?? 0,
                },
              ]}
            />
            <AdminPriorityQueuesPanel
              title={t("overview.signals.title")}
              metrics={[
                {
                  label: t("overview.signals.recentRefunds"),
                  value: overview.data.recentRefunds,
                  alert: overview.data.recentRefunds > 0,
                  sub: t("overview.signals.recentRefundsInfo"),
                },
              ]}
            />
          </>
        ) : null}

        {retention.isLoading ? (
          <PanelLoading />
        ) : retention.error ? (
          <PanelError message={t("overview.errors.retention")} />
        ) : retention.data ? (
          <AdminPriorityQueuesPanel
            title={t("overview.retention.title")}
            metrics={[
              {
                label: t("overview.retention.expiredSessions"),
                value: retention.data.pendingExpirations.expiredSessions,
                alert: retention.data.pendingExpirations.expiredSessions > 0,
                sub: t("overview.retention.expiredSessionsInfo"),
              },
              {
                label: t("overview.retention.expiredContent"),
                value: retention.data.pendingExpirations.expiredContent,
                alert: retention.data.pendingExpirations.expiredContent > 0,
                sub: t("overview.retention.expiredContentInfo"),
              },
              {
                label: t("overview.retention.expiredPdfs"),
                value: retention.data.pendingExpirations.expiredPdfs,
                alert: retention.data.pendingExpirations.expiredPdfs > 0,
                sub: t("overview.retention.expiredPdfsInfo"),
              },
            ]}
          />
        ) : null}
      </div>
    </div>
  );
}
