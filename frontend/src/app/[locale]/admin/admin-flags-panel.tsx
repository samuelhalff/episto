"use client";

import Link from "next/link";
import { useState } from "react";
import type { AdminEscalationLevel, AdminSuspiciousCase } from "@episto/shared";
import { adminPost } from "./admin-api";
import { PanelError, SectionPanel } from "./admin-metric-panels";
import { getAdminPagePath } from "@/lib/admin-paths";

const ESCALATION_OPTIONS: Array<{
  value: AdminEscalationLevel;
  label: string;
}> = [
  { value: "observe", label: "Observe" },
  { value: "review", label: "Review" },
  { value: "manual_review", label: "Manual Review" },
  { value: "incident", label: "Incident" },
];

function EscalationControl({
  sessionId,
  currentLevel,
  currentNote,
  onSaved,
}: {
  sessionId: string;
  currentLevel: AdminEscalationLevel;
  currentNote: string | null;
  onSaved: () => Promise<unknown>;
}) {
  const [level, setLevel] = useState<AdminEscalationLevel>(currentLevel);
  const [note, setNote] = useState(currentNote ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setPending(true);
    setError("");
    try {
      await adminPost(`/admin/sessions/${sessionId}/escalation`, {
        level,
        note,
      });
      await onSaved();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to save escalation",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)_auto]">
        <select
          value={level}
          onChange={(event) => setLevel(event.target.value as AdminEscalationLevel)}
          className="rounded-lg border px-3 py-2 text-xs"
          style={{
            background: "var(--app-surface-muted)",
            borderColor: "var(--app-border)",
            color: "var(--app-fg)",
          }}
        >
          {ESCALATION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Review note"
          className="rounded-lg border px-3 py-2 text-xs"
          style={{
            background: "var(--app-surface-muted)",
            borderColor: "var(--app-border)",
            color: "var(--app-fg)",
          }}
        />
        <button
          onClick={() => void handleSave()}
          disabled={pending || note.trim().length < 5}
          className="rounded-lg px-3 py-2 text-xs font-medium transition disabled:opacity-40"
          style={{
            background: "var(--app-fg)",
            color: "var(--app-bg)",
          }}
        >
          {pending ? "Saving..." : "Save"}
        </button>
      </div>
      {error ? <PanelError message={error} /> : null}
    </div>
  );
}

function SignalBadge({ label }: { label: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
      style={{
        background: "var(--app-surface-muted)",
        color: "var(--app-muted)",
      }}
    >
      {label.replace(/_/g, " ")}
    </span>
  );
}

export function SuspiciousQueuePanel({
  cases,
  pathname,
  onUpdated,
}: {
  cases: AdminSuspiciousCase[];
  pathname: string;
  onUpdated: () => Promise<unknown>;
}) {
  return (
    <SectionPanel title="Suspicious Activity Queue">
      {cases.length > 0 ? (
        <div className="space-y-4">
          {cases.map((entry) => (
            <div
              key={entry.sessionId}
              className="rounded-xl border p-4"
              style={{ borderColor: "var(--app-border)" }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold" style={{ color: "var(--app-fg)" }}>
                    {entry.email ?? `Session ${entry.sessionId.slice(0, 8)}`}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {entry.categories.map((category) => (
                      <SignalBadge key={category} label={category} />
                    ))}
                  </div>
                </div>
                <div
                  className="flex flex-wrap gap-3 text-xs"
                  style={{ color: "var(--app-muted)" }}
                >
                  <Link href={getAdminPagePath(pathname, `sessions/${entry.sessionId}`)}>
                    Session
                  </Link>
                  {entry.draftId ? (
                    <Link href={getAdminPagePath(pathname, `drafts/${entry.draftId}`)}>
                      Draft
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                <p style={{ color: "var(--app-muted)" }}>
                  Failed payments:{" "}
                  <span style={{ color: "var(--app-fg)" }}>
                    {entry.signals.failedPayments}
                  </span>
                </p>
                <p style={{ color: "var(--app-muted)" }}>
                  Refunds:{" "}
                  <span style={{ color: "var(--app-fg)" }}>{entry.signals.refunds}</span>
                </p>
                <p style={{ color: "var(--app-muted)" }}>
                  Rejections:{" "}
                  <span style={{ color: "var(--app-fg)" }}>
                    {entry.signals.rejectedDispatches}
                  </span>
                </p>
                <p style={{ color: "var(--app-muted)" }}>
                  Ambiguous:{" "}
                  <span style={{ color: "var(--app-fg)" }}>
                    {entry.signals.ambiguousDispatches}
                  </span>
                </p>
                <p style={{ color: "var(--app-muted)" }}>
                  First seen:{" "}
                  <span style={{ color: "var(--app-fg)" }}>
                    {new Date(entry.firstSeenAt).toLocaleString()}
                  </span>
                </p>
                <p style={{ color: "var(--app-muted)" }}>
                  Last seen:{" "}
                  <span style={{ color: "var(--app-fg)" }}>
                    {new Date(entry.lastSeenAt).toLocaleString()}
                  </span>
                </p>
                <p style={{ color: "var(--app-muted)" }}>
                  Draft status:{" "}
                  <span style={{ color: "var(--app-fg)" }}>
                    {entry.latestDraftStatus ?? "None"}
                  </span>
                </p>
                <p style={{ color: "var(--app-muted)" }}>
                  Escalation:{" "}
                  <span style={{ color: "var(--app-fg)" }}>
                    {entry.escalationLevel.replace("_", " ")}
                  </span>
                </p>
              </div>

              {entry.escalationNote ? (
                <p className="mt-3 text-xs" style={{ color: "var(--app-muted)" }}>
                  Latest note: {entry.escalationNote}
                </p>
              ) : null}

              <div className="mt-4">
                <EscalationControl
                  sessionId={entry.sessionId}
                  currentLevel={entry.escalationLevel}
                  currentNote={entry.escalationNote}
                  onSaved={onUpdated}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--app-muted)" }}>
          No suspicious sessions currently match the starter heuristics.
        </p>
      )}
    </SectionPanel>
  );
}
