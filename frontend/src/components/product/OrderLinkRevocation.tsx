"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { KeyRound, MailCheck } from "lucide-react";

import { ConfirmDialog } from "./ConfirmDialog";
import { apiFetch, getApiErrorUserMessage, isApiErrorWithStatus } from "../../lib/api";

interface RevokeOrderLinksButtonProps {
  orderToken: string;
  /** Called once the token in the current URL has been invalidated server-side. */
  onRevoked: () => void;
}

export function RevokeOrderLinksButton({
  orderToken,
  onRevoked,
}: RevokeOrderLinksButtonProps) {
  const t = useTranslations("status");
  const tc = useTranslations("common");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleConfirm() {
    setPending(true);
    setErrorMessage(null);
    try {
      await apiFetch(`/v1/orders/${orderToken}/revoke-links`, { method: "POST" });
      setConfirmOpen(false);
      onRevoked();
    } catch (err) {
      setErrorMessage(
        isApiErrorWithStatus(err, 429)
          ? t("revokeLinksRateLimited")
          : (getApiErrorUserMessage(err) ?? t("revokeLinksError")),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={() => {
          setErrorMessage(null);
          setConfirmOpen(true);
        }}
        className="inline-flex items-center gap-2 text-xs text-zinc-500 underline underline-offset-4 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        <KeyRound className="h-3.5 w-3.5 shrink-0" />
        {t("revokeLinks")}
      </button>
      {errorMessage && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {errorMessage}
        </p>
      )}
      <ConfirmDialog
        open={confirmOpen}
        title={t("revokeLinksConfirmTitle")}
        description={t("revokeLinksConfirmBody")}
        confirmLabel={t("revokeLinksConfirmCta")}
        cancelLabel={tc("cancel")}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        destructive
        confirmLoading={pending}
      />
    </div>
  );
}

export function OrderLinksRevokedNotice() {
  const t = useTranslations("status");

  return (
    <div className="rounded-4xl border border-zinc-200/80 bg-white/92 p-8 text-center shadow-elevated dark:border-zinc-800 dark:bg-zinc-900/92">
      <MailCheck className="mx-auto mb-4 h-10 w-10 text-primary" />
      <h2 className="text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
        {t("revokeLinksDoneTitle")}
      </h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {t("revokeLinksDoneBody")}
      </p>
    </div>
  );
}
