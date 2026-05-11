"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@episto/shared";
import { ADMIN_PAGE_STACK_CLASS_NAME } from "@/components/layout/page-spacing";
import { useAdminAuth } from "../admin-auth-context";
import { downloadAdminAudienceExport, fetchAdminSentAudience } from "../admin-api";
import { PanelError, PanelLoading, SectionPanel } from "../admin-metric-panels";

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-90"
      style={{
        borderColor: "var(--app-border)",
        background: "var(--app-surface-strong)",
        color: "var(--app-fg)",
      }}
    >
      {label}
    </button>
  );
}

export default function AudiencePage() {
  const { authenticated } = useAdminAuth();

  const sentAudience = useQuery({
    queryKey: queryKeys.admin.audience("sent_or_dispatching"),
    queryFn: () => fetchAdminSentAudience(),
    enabled: authenticated,
  });

  return (
    <div className={ADMIN_PAGE_STACK_CLASS_NAME}>
      <div className="space-y-2">
        <h1 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
          Audience
        </h1>
        <p className="text-sm" style={{ color: "var(--app-muted)" }}>
          Minimal operational email list for customers who reached dispatch.
        </p>
      </div>

      <SectionPanel
        title={`Sent / dispatching (${sentAudience.data?.total ?? "—"})`}
        action={
          <ExportButton
            label="Export CSV"
            onClick={() => {
              void downloadAdminAudienceExport("sent_or_dispatching");
            }}
          />
        }
      >
        {sentAudience.isLoading ? (
          <PanelLoading />
        ) : sentAudience.error ? (
          <PanelError message="Failed to load sent / dispatching audience" />
        ) : sentAudience.data ? (
          <div className="space-y-4">
            <p className="text-xs" style={{ color: "var(--app-muted)" }}>
              Most recent unique emails are shown below. CSV export includes the full
              audience. `submitted` means sent / being dispatched.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ color: "var(--app-muted)" }}>
                    <th className="py-2 pr-3 font-medium">Email</th>
                    <th className="py-2 pr-3 font-medium">Locale</th>
                    <th className="py-2 pr-3 font-medium">furthestStatus</th>
                    <th className="py-2 pr-3 font-medium">First seen</th>
                    <th className="py-2 font-medium">Last seen</th>
                  </tr>
                </thead>
                <tbody>
                  {sentAudience.data.rows.map((row) => (
                    <tr
                      key={`${row.email}-${row.draftId}`}
                      className="border-t"
                      style={{ borderColor: "var(--app-border)" }}
                    >
                      <td className="py-2 pr-3" style={{ color: "var(--app-fg)" }}>
                        {row.email}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--app-muted)" }}>
                        {row.locale ?? "—"}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--app-fg)" }}>
                        {row.furthestStatus}
                      </td>
                      <td className="py-2 pr-3" style={{ color: "var(--app-muted)" }}>
                        {formatTimestamp(row.firstSeenAt)}
                      </td>
                      <td className="py-2" style={{ color: "var(--app-muted)" }}>
                        {formatTimestamp(row.lastSeenAt)}
                      </td>
                    </tr>
                  ))}
                  {sentAudience.data.rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center"
                        style={{ color: "var(--app-muted)" }}
                      >
                        No sent / dispatching emails yet
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </SectionPanel>
    </div>
  );
}
