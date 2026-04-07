"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";

import { ActionButton } from "./ActionButton";
import { downloadFile } from "../../lib/download-file";
import { getApiErrorUserMessage } from "../../lib/api";

interface ProtectedPdfDownloadButtonProps {
  /** API path relative to the API base, e.g. /v1/drafts/{id}/pdf */
  apiPath: string;
  /** i18n namespace that contains the downloadLetter/downloadUnavailable keys */
  namespace?: "confirmation" | "status";
  className?: string;
}

export function ProtectedPdfDownloadButton({
  apiPath,
  namespace = "confirmation",
  className,
}: ProtectedPdfDownloadButtonProps) {
  const t = useTranslations(namespace);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setErrorMessage(null);
    try {
      await downloadFile(apiPath);
    } catch (err) {
      const userMessage = getApiErrorUserMessage(err);
      setErrorMessage(userMessage ?? t("downloadUnavailable"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <ActionButton
        variant="secondary"
        fullWidth
        loading={loading}
        onClick={handleClick}
        leadingIcon={<Download className="h-4 w-4 shrink-0" />}
      >
        {t("downloadLetter")}
      </ActionButton>
      {errorMessage && (
        <p role="alert" className="mt-1 text-center text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  );
}
