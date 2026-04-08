"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { isPrivacyAcknowledged, acknowledgePrivacy } from "../../lib/consent";

function subscribeToPrivacyAcknowledgement() {
  return () => {};
}

export function PrivacyNoticeStrip() {
  const t = useTranslations("common");
  const [dismissed, setDismissed] = useState(false);
  const visible =
    useSyncExternalStore(
      subscribeToPrivacyAcknowledgement,
      () => !isPrivacyAcknowledged(),
      () => false,
    ) && !dismissed;

  if (!visible) return null;

  const handleDismiss = () => {
    acknowledgePrivacy();
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 sm:left-1/2 sm:right-auto sm:w-[min(42rem,calc(100vw-2rem))] sm:-translate-x-1/2">
      <div className="app-sticky-bar rounded-2xl px-4 py-3">
        <div className="flex items-start justify-between gap-3 sm:items-center">
          <p className="min-w-0 flex-1 text-xs leading-relaxed" style={{ color: "var(--app-muted)" }}>
            {t("privacyNoticeBody")}{" "}
            <a
              href="/privacy"
              className="underline underline-offset-2"
              style={{ color: "var(--app-fg)" }}
            >
              {t("privacyPolicy")}
            </a>
          </p>
          <button
            onClick={handleDismiss}
            className="app-choice-pill h-9 w-9 shrink-0 p-0 text-[var(--app-muted)] hover:text-[var(--app-fg)]"
            aria-label={t("dismissPrivacyNotice")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
