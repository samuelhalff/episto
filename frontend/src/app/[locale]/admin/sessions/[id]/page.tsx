"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@swiss-mail/shared";
import { ADMIN_PAGE_STACK_CLASS_NAME } from "@/components/layout/page-spacing";
import { adminPost, fetchAdminSession } from "../../admin-api";
import { PanelError, PanelLoading, SectionPanel } from "../../admin-metric-panels";
import { getAdminPagePath } from "@/lib/admin-paths";

export default function SessionDetailPage() {
  const pathname = usePathname();
  const { id } = useParams<{ id: string }>();
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");

  const session = useQuery({
    queryKey: queryKeys.admin.session(id),
    queryFn: () => fetchAdminSession(id),
  });

  async function handleClear() {
    if (reason.trim().length < 5) {
      setError("Reason must be at least 5 characters");
      return;
    }

    setClearing(true);
    setError("");
    try {
      await adminPost(`/admin/sessions/${id}/clear`, { reason: reason.trim() });
      setCleared(true);
      await session.refetch();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Clear failed");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className={ADMIN_PAGE_STACK_CLASS_NAME}>
      <div className="space-y-2">
        <Link
          href={getAdminPagePath(pathname, "sessions")}
          className="text-xs"
          style={{ color: "var(--app-muted)" }}
        >
          ← Sessions
        </Link>
        <h1 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
          Session
        </h1>
      </div>

      {session.isLoading ? (
        <PanelLoading />
      ) : session.error ? (
        <PanelError message={session.error.message || "Failed to load session"} />
      ) : session.data ? (
        <>
          <SectionPanel title="Session Info">
            <div
              className="grid gap-3 text-sm sm:grid-cols-2"
              style={{ color: "var(--app-fg)" }}
            >
              <p>ID: {session.data.session.id}</p>
              <p>Locale: {session.data.session.locale}</p>
              <p>Email: {session.data.session.email ?? "None"}</p>
              <p>IP address: {session.data.session.ipAddress ?? "Not retained"}</p>
              <p>Created: {new Date(session.data.session.createdAt).toLocaleString()}</p>
              <p>Expires: {new Date(session.data.session.expiresAt).toLocaleString()}</p>
            </div>
          </SectionPanel>

          <SectionPanel title="Drafts">
            {session.data.drafts.length > 0 ? (
              <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
                {session.data.drafts.map((draft) => (
                  <Link
                    key={draft.id}
                    href={getAdminPagePath(pathname, `drafts/${draft.id}`)}
                    className="block space-y-1 py-3 transition-opacity hover:opacity-80"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--app-fg)" }}
                      >
                        Draft {draft.id.slice(0, 8)}
                      </p>
                      <span className="text-xs" style={{ color: "var(--app-muted)" }}>
                        {new Date(draft.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--app-muted)" }}>
                      Status {draft.status} · Payment {draft.paymentState ?? "none"} ·
                      Dispatch {draft.dispatchState ?? "none"}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--app-muted)" }}>
                No drafts linked to this session.
              </p>
            )}
          </SectionPanel>

          <SectionPanel title="Support Events">
            {session.data.supportEvents.length > 0 ? (
              <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
                {session.data.supportEvents.map((event) => (
                  <div key={event.id} className="space-y-1 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <p
                        className="text-sm font-medium"
                        style={{ color: "var(--app-fg)" }}
                      >
                        {event.eventType}
                      </p>
                      <span className="text-xs" style={{ color: "var(--app-muted)" }}>
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--app-muted)" }}>
                      {event.actor}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--app-muted)" }}>
                No support events recorded.
              </p>
            )}
          </SectionPanel>

          <SectionPanel title="Data Management">
            <div className="space-y-3">
              <p className="text-sm" style={{ color: "var(--app-fg)" }}>
                This redacts retained draft subject and body fields while preserving
                operational metadata.
              </p>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                placeholder="Reason for clearing retained content"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{
                  background: "var(--app-surface-muted)",
                  borderColor: "var(--app-border)",
                  color: "var(--app-fg)",
                }}
              />
              {error ? <PanelError message={error} /> : null}
              {cleared ? (
                <p className="text-xs" style={{ color: "var(--app-muted)" }}>
                  Session content cleared. Metadata remains available for support and
                  audit.
                </p>
              ) : null}
              <div className="flex justify-end">
                <button
                  onClick={() => void handleClear()}
                  disabled={clearing || reason.trim().length < 5}
                  className="rounded-lg px-4 py-2 text-xs font-medium transition disabled:opacity-40"
                  style={{
                    background: "var(--app-fg)",
                    color: "var(--app-bg)",
                  }}
                >
                  {clearing ? "Clearing..." : "Clear retained content"}
                </button>
              </div>
            </div>
          </SectionPanel>
        </>
      ) : null}
    </div>
  );
}
