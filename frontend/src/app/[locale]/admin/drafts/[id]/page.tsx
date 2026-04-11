"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@swiss-mail/shared";
import { adminPost, fetchAdminDraftCase, fetchAdminDraftTimeline } from "../../admin-api";
import { MetricCard, PanelError, PanelLoading, SectionPanel } from "../../admin-metric-panels";
import { getAdminPagePath } from "@/lib/admin-paths";

interface ViewedDraftResponse {
  draft: {
    subject: string | null;
    body: string | null;
  };
}

function TimelineMeta({ meta }: { meta: Record<string, unknown> | null }) {
  if (!meta) return null;
  const entries = Object.entries(meta).filter(([, value]) => value !== null && value !== undefined);
  if (entries.length === 0) return null;

  return (
    <p className="mt-1 text-xs" style={{ color: "var(--app-muted)" }}>
      {entries.map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}
    </p>
  );
}

function ReasonAction({
  title,
  description,
  placeholder,
  buttonLabel,
  loadingLabel,
  pending,
  error,
  success,
  onSubmit,
}: {
  title: string;
  description: string;
  placeholder: string;
  buttonLabel: string;
  loadingLabel: string;
  pending: boolean;
  error: string;
  success: string;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");

  return (
    <SectionPanel title={title}>
      <div className="space-y-3">
        <p className="text-sm" style={{ color: "var(--app-fg)" }}>
          {description}
        </p>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder={placeholder}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{
            background: "var(--app-surface-muted)",
            borderColor: "var(--app-border)",
            color: "var(--app-fg)",
          }}
        />
        {error ? <PanelError message={error} /> : null}
        {success ? (
          <p className="text-xs" style={{ color: "var(--app-muted)" }}>
            {success}
          </p>
        ) : null}
        <div className="flex justify-end">
          <button
            onClick={() => void onSubmit(reason)}
            disabled={pending || reason.trim().length < 5}
            className="rounded-lg px-4 py-2 text-xs font-medium transition disabled:opacity-40"
            style={{
              background: "var(--app-fg)",
              color: "var(--app-bg)",
            }}
          >
            {pending ? loadingLabel : buttonLabel}
          </button>
        </div>
      </div>
    </SectionPanel>
  );
}

export default function DraftCasePage() {
  const pathname = usePathname();
  const { id } = useParams<{ id: string }>();
  const [contentError, setContentError] = useState("");
  const [contentLoading, setContentLoading] = useState(false);
  const [content, setContent] = useState<ViewedDraftResponse["draft"] | null>(null);
  const [contentSuccess, setContentSuccess] = useState("");
  const [refundError, setRefundError] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState("");
  const [reconcileError, setReconcileError] = useState("");
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [reconcileSuccess, setReconcileSuccess] = useState("");

  const draftCase = useQuery({
    queryKey: queryKeys.admin.draftCase(id),
    queryFn: () => fetchAdminDraftCase(id),
  });

  const timeline = useQuery({
    queryKey: queryKeys.admin.timeline(id),
    queryFn: () => fetchAdminDraftTimeline(id),
  });

  async function handleViewContent(reason: string) {
    setContentLoading(true);
    setContentError("");
    setContentSuccess("");
    try {
      const response = await adminPost<ViewedDraftResponse>(`/admin/drafts/${id}/view-content`, {
        reason,
      });
      setContent(response.draft);
      setContentSuccess("Content access logged.");
    } catch (error) {
      setContentError(error instanceof Error ? error.message : "Content access failed");
    } finally {
      setContentLoading(false);
    }
  }

  async function handleRefund(reason: string) {
    setRefundLoading(true);
    setRefundError("");
    setRefundSuccess("");
    try {
      const response = await adminPost<{ refundId: string }>(`/admin/drafts/${id}/refund`, {
        reason,
      });
      setRefundSuccess(`Refund queued: ${response.refundId}`);
      await draftCase.refetch();
      await timeline.refetch();
    } catch (error) {
      setRefundError(error instanceof Error ? error.message : "Refund failed");
    } finally {
      setRefundLoading(false);
    }
  }

  async function handleReconcile(reason: string) {
    const dispatchId = draftCase.data?.dispatch?.id;
    if (!dispatchId) return;

    setReconcileLoading(true);
    setReconcileError("");
    setReconcileSuccess("");
    try {
      await adminPost(`/admin/dispatches/${dispatchId}/reconcile`, {
        reason,
      });
      setReconcileSuccess("Manual reconciliation queued.");
      await draftCase.refetch();
      await timeline.refetch();
    } catch (error) {
      setReconcileError(error instanceof Error ? error.message : "Reconciliation failed");
    } finally {
      setReconcileLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href={getAdminPagePath(pathname, `sessions/${draftCase.data?.session.id ?? ""}`)}
          className="text-xs"
          style={{ color: "var(--app-muted)" }}
        >
          ← Session
        </Link>
        <h1 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
          Draft Case
        </h1>
      </div>

      {draftCase.isLoading ? (
        <PanelLoading />
      ) : draftCase.error ? (
        <PanelError message={draftCase.error.message || "Failed to load case"} />
      ) : draftCase.data ? (
        <>
          <SectionPanel title="Case Summary">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Draft Status" value={draftCase.data.draft.status} />
              <MetricCard
                label="Payment"
                value={draftCase.data.payment?.state ?? "None"}
                alert={draftCase.data.payment?.state === "failed"}
              />
              <MetricCard
                label="Dispatch"
                value={draftCase.data.dispatch?.state ?? "None"}
                alert={draftCase.data.dispatch?.state === "unknown"}
              />
              <MetricCard
                label="Content"
                value={draftCase.data.draft.contentRetained ? "Retained" : "Redacted"}
              />
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <p style={{ color: "var(--app-fg)" }}>
                Session: {draftCase.data.session.id}
              </p>
              <p style={{ color: "var(--app-fg)" }}>
                Delivery: {draftCase.data.draft.deliveryType}
              </p>
              <p style={{ color: "var(--app-fg)" }}>
                Customer: {draftCase.data.session.email ?? "No email"}
              </p>
              <p style={{ color: "var(--app-fg)" }}>
                Created: {new Date(draftCase.data.draft.createdAt).toLocaleString()}
              </p>
            </div>
          </SectionPanel>

          <SectionPanel title="Dispatch Details">
            {draftCase.data.dispatch ? (
              <div className="space-y-2 text-sm" style={{ color: "var(--app-fg)" }}>
                <p>Provider: {draftCase.data.dispatch.providerName}</p>
                <p>Provider reference: {draftCase.data.dispatch.providerReference ?? "None"}</p>
                <p>Tracking number: {draftCase.data.dispatch.trackingNumber ?? "None"}</p>
                <p>Submitted: {draftCase.data.dispatch.submittedAt ? new Date(draftCase.data.dispatch.submittedAt).toLocaleString() : "Not submitted"}</p>
                <p>Last checked: {draftCase.data.dispatch.lastCheckedAt ? new Date(draftCase.data.dispatch.lastCheckedAt).toLocaleString() : "Never"}</p>
                <p>Failure reason: {draftCase.data.dispatch.failureReason ?? "None"}</p>
              </div>
            ) : (
              <p className="text-sm" style={{ color: "var(--app-muted)" }}>
                No dispatch attempt yet.
              </p>
            )}
          </SectionPanel>

          {draftCase.data.draft.actions.canViewContent ? (
            <ReasonAction
              title="Content Access"
              description="Open retained draft content only when the metadata is insufficient. This action is audited."
              placeholder="Reason for viewing content"
              buttonLabel="View content"
              loadingLabel="Opening..."
              pending={contentLoading}
              error={contentError}
              success={contentSuccess}
              onSubmit={handleViewContent}
            />
          ) : null}

          {content ? (
            <SectionPanel title="Viewed Content">
              <div className="space-y-3">
                <div>
                  <p className="text-xs" style={{ color: "var(--app-muted)" }}>
                    Subject
                  </p>
                  <p className="text-sm" style={{ color: "var(--app-fg)" }}>
                    {content.subject ?? "No subject"}
                  </p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: "var(--app-muted)" }}>
                    Body
                  </p>
                  <pre
                    className="whitespace-pre-wrap rounded-lg p-4 text-sm"
                    style={{
                      background: "var(--app-surface-muted)",
                      color: "var(--app-fg)",
                    }}
                  >
                    {content.body ?? "No body"}
                  </pre>
                </div>
              </div>
            </SectionPanel>
          ) : null}

          {draftCase.data.draft.actions.canRefund ? (
            <ReasonAction
              title="Refund"
              description="Refund only when the case is approved for refund handling. This action records a support event."
              placeholder="Refund justification"
              buttonLabel="Request refund"
              loadingLabel="Requesting..."
              pending={refundLoading}
              error={refundError}
              success={refundSuccess}
              onSubmit={handleRefund}
            />
          ) : null}

          {draftCase.data.draft.actions.canReconcile ? (
            <ReasonAction
              title="Manual Reconciliation"
              description="Queue a safe provider status check for an ambiguous dispatch. Only provider references are retained."
              placeholder="Reason for reconciliation"
              buttonLabel="Queue reconciliation"
              loadingLabel="Queueing..."
              pending={reconcileLoading}
              error={reconcileError}
              success={reconcileSuccess}
              onSubmit={handleReconcile}
            />
          ) : null}

          <SectionPanel title="Timeline">
            {timeline.isLoading ? (
              <PanelLoading />
            ) : timeline.error ? (
              <PanelError message={timeline.error.message || "Failed to load timeline"} />
            ) : timeline.data ? (
              timeline.data.events.length > 0 ? (
                <div className="space-y-3">
                  {timeline.data.events.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-lg border px-4 py-3"
                      style={{ borderColor: "var(--app-border)" }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-medium" style={{ color: "var(--app-fg)" }}>
                          {event.eventType}
                        </p>
                        <span className="text-xs" style={{ color: "var(--app-muted)" }}>
                          {new Date(event.occurredAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 text-xs" style={{ color: "var(--app-muted)" }}>
                        {event.actor}
                        {event.from || event.to ? ` · ${event.from ?? "∅"} → ${event.to ?? "∅"}` : ""}
                      </p>
                      <TimelineMeta meta={event.meta} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--app-muted)" }}>
                  No events yet.
                </p>
              )
            ) : null}
          </SectionPanel>
        </>
      ) : null}
    </div>
  );
}
