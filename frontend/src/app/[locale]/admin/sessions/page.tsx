"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@swiss-mail/shared";
import { useAdminAuth } from "../admin-auth-context";
import { fetchAdminSessions } from "../admin-api";
import { SectionPanel, PanelLoading, PanelError } from "../admin-metric-panels";
import { getAdminPagePath } from "../../../../lib/admin-paths";

const PAGE_SIZE = 20;

export default function SessionsPage() {
  const { authenticated } = useAdminAuth();
  const pathname = usePathname();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const filterString = statusFilter !== "all" ? statusFilter : "";

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    ...(statusFilter !== "all" && { status: statusFilter }),
  });

  const sessions = useQuery({
    queryKey: queryKeys.admin.sessions(page, filterString),
    queryFn: () => fetchAdminSessions(params.toString()),
    enabled: authenticated,
  });

  const totalPages = sessions.data
    ? Math.ceil(sessions.data.total / PAGE_SIZE)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
          Sessions
        </h1>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border px-3 py-1.5 text-xs"
            style={{
              background: "var(--app-surface-muted)",
              borderColor: "var(--app-border)",
              color: "var(--app-fg)",
            }}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <SectionPanel title={`${sessions.data?.total ?? "—"} sessions`}>
        {sessions.isLoading ? (
          <PanelLoading />
        ) : sessions.error ? (
          <PanelError message="Failed to load sessions" />
        ) : sessions.data ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr
                    className="border-b text-[11px] uppercase tracking-wider"
                    style={{
                      borderColor: "var(--app-border)",
                      color: "var(--app-muted)",
                    }}
                  >
                    <th className="pb-2 pr-4 font-medium">ID</th>
                    <th className="pb-2 pr-4 font-medium">Locale</th>
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <th className="pb-2 pr-4 font-medium">Drafts</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Payment</th>
                    <th className="pb-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.data.sessions.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b transition-colors"
                      style={{ borderColor: "var(--app-border)" }}
                    >
                      <td className="py-2.5 pr-4">
                        <Link
                          href={getAdminPagePath(pathname, `sessions/${s.id}`)}
                          className="font-mono text-xs underline-offset-2 hover:underline"
                          style={{ color: "var(--app-fg)" }}
                        >
                          {s.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-xs" style={{ color: "var(--app-muted)" }}>
                        {s.locale ?? "—"}
                      </td>
                      <td
                        className="max-w-[200px] truncate py-2.5 pr-4 text-xs"
                        style={{ color: "var(--app-fg)" }}
                      >
                        {s.email ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-xs" style={{ color: "var(--app-fg)" }}>
                        {s.draftCount}
                      </td>
                      <td className="py-2.5 pr-4 text-xs">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            background: s.latestDraftStatus
                              ? "rgba(34,197,94,0.1)"
                              : "var(--app-surface-muted)",
                            color: s.latestDraftStatus
                              ? "var(--app-fg)"
                              : "var(--app-muted)",
                          }}
                        >
                          {s.latestDraftStatus ?? "—"}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-xs">
                        <span
                          className="inline-block rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            background: s.paymentState
                              ? "rgba(34,197,94,0.1)"
                              : "var(--app-surface-muted)",
                            color: s.paymentState
                              ? "var(--app-fg)"
                              : "var(--app-muted)",
                          }}
                        >
                          {s.paymentState ?? "—"}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs" style={{ color: "var(--app-muted)" }}>
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {sessions.data.sessions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-sm" style={{ color: "var(--app-muted)" }}>
                        No sessions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--app-muted)" }}>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border px-3 py-1 text-xs disabled:opacity-30"
                    style={{ borderColor: "var(--app-border)", color: "var(--app-fg)" }}
                  >
                    ← Prev
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border px-3 py-1 text-xs disabled:opacity-30"
                    style={{ borderColor: "var(--app-border)", color: "var(--app-fg)" }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        ) : null}
      </SectionPanel>
    </div>
  );
}
