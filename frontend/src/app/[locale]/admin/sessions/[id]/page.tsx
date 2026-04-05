"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminAuth } from "../../admin-auth-context";
import { adminPost } from "../../admin-api";
import { SectionPanel, PanelError } from "../../admin-metric-panels";
import { Loader2 } from "lucide-react";

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { authHeader } = useAdminAuth();
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleClear = useCallback(async () => {
    setClearing(true);
    setError("");
    try {
      await adminPost(`/admin/sessions/${id}/clear`, authHeader);
      setCleared(true);
      setConfirmOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setClearing(false);
    }
  }, [id, authHeader]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-xs"
          style={{ color: "var(--app-muted)" }}
        >
          ← Sessions
        </button>
        <h1 className="text-lg font-semibold" style={{ color: "var(--app-fg)" }}>
          Session
        </h1>
      </div>

      <SectionPanel title="Session Info">
        <div className="space-y-3">
          <div>
            <span className="text-xs" style={{ color: "var(--app-muted)" }}>ID</span>
            <p className="mt-0.5 font-mono text-sm" style={{ color: "var(--app-fg)" }}>
              {id}
            </p>
          </div>

          {cleared && (
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{
                borderColor: "rgba(34,197,94,0.3)",
                background: "rgba(34,197,94,0.06)",
                color: "#16a34a",
              }}
            >
              Session data has been cleared (GDPR).
            </div>
          )}

          {error && <PanelError message={error} />}
        </div>
      </SectionPanel>

      {!cleared && (
        <SectionPanel title="Data Management">
          {!confirmOpen ? (
            <button
              onClick={() => setConfirmOpen(true)}
              className="rounded-lg border px-4 py-2 text-xs font-medium text-destructive transition hover:bg-destructive/5"
              style={{ borderColor: "var(--app-border)" }}
            >
              Clear Session Data (GDPR)
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm" style={{ color: "var(--app-fg)" }}>
                This will permanently remove PII from this session (addresses, subject, content).
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => void handleClear()}
                  disabled={clearing}
                  className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-xs font-medium text-white transition disabled:opacity-50"
                >
                  {clearing && <Loader2 className="h-3 w-3 animate-spin" />}
                  Confirm Clear
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="rounded-lg border px-4 py-2 text-xs"
                  style={{ borderColor: "var(--app-border)", color: "var(--app-muted)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </SectionPanel>
      )}
    </div>
  );
}
