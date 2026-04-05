"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { isPrivacyAcknowledged, acknowledgePrivacy } from "../../lib/consent";

export function PrivacyNoticeStrip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isPrivacyAcknowledged()) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    acknowledgePrivacy();
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t px-4 py-3"
      style={{
        background: "var(--app-surface-strong)",
        borderColor: "var(--app-border)",
      }}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
        <p className="text-xs leading-relaxed" style={{ color: "var(--app-muted)" }}>
          Swiss Mail uses a single essential cookie for your session.
          No tracking, no third-party analytics.{" "}
          <a
            href="/privacy"
            className="underline underline-offset-2"
            style={{ color: "var(--app-fg)" }}
          >
            Privacy policy
          </a>
        </p>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1.5 transition hover:opacity-70"
          style={{ color: "var(--app-muted)" }}
          aria-label="Dismiss privacy notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
