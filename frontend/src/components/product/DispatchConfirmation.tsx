"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  CheckCircle,
  Clock,
  Send,
  Check,
  AlertCircle,
  HelpCircle,
  Copy,
  Download,
  FileText,
} from "lucide-react";
import { useDispatchStatus } from "../../hooks/use-api.js";

const STATE_CONFIG = {
  queued: { icon: Clock, labelKey: "stateQueued" },
  submitted: { icon: Send, labelKey: "stateSubmitted" },
  accepted: { icon: Check, labelKey: "stateAccepted" },
  rejected: { icon: AlertCircle, labelKey: "stateRejected" },
  unknown: { icon: HelpCircle, labelKey: "stateUnknown" },
} as const;

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export function DispatchConfirmation({
  draftId,
  orderReference,
}: {
  draftId: string;
  orderReference: string | null;
}) {
  const t = useTranslations("confirmation");
  const dispatch = useDispatchStatus(draftId);
  const [copied, setCopied] = useState(false);

  const state = dispatch.data?.dispatch.state ?? "unknown";
  const config =
    STATE_CONFIG[state as keyof typeof STATE_CONFIG] ?? STATE_CONFIG.unknown;
  const StateIcon = config.icon;

  async function copyReference() {
    if (!orderReference) return;
    await navigator.clipboard.writeText(orderReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mx-auto max-w-lg space-y-8 px-4 py-12 text-center">
      {/* Success header */}
      <div className="space-y-3">
        <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
        <h1 className="text-2xl font-semibold text-gray-900">{t("title")}</h1>
        <p className="text-sm text-gray-500">{t("subtitle")}</p>
      </div>

      {/* Order reference */}
      {orderReference && (
        <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-2.5">
          <span className="text-xs text-gray-500">{t("orderReference")}</span>
          <span className="font-mono text-sm font-medium text-gray-900">
            {orderReference}
          </span>
          <button
            type="button"
            onClick={copyReference}
            className="text-gray-400 transition hover:text-gray-600"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="sr-only">
              {copied ? t("copied") : t("orderReference")}
            </span>
          </button>
        </div>
      )}

      {/* Dispatch state */}
      <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-3">
        <StateIcon className="h-5 w-5 text-gray-500" />
        <span className="text-sm text-gray-700">{t(config.labelKey)}</span>
      </div>

      {/* What happens next */}
      <div className="space-y-4 text-left">
        <h2 className="text-sm font-medium text-gray-700">
          {t("whatHappensNext")}
        </h2>
        <ol className="space-y-3 border-l-2 border-gray-200 pl-4">
          {(
            ["stepPayment", "stepSubmitted", "stepProcessing", "stepUpdates"] as const
          ).map((step) => (
            <li key={step} className="relative text-sm text-gray-600">
              <span className="absolute -left-[1.3rem] top-1 h-2 w-2 rounded-full bg-gray-300" />
              {t(step)}
            </li>
          ))}
        </ol>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a
          href={`${API_BASE}/v1/drafts/${draftId}/receipt`}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 transition hover:border-gray-300"
        >
          <Download className="h-4 w-4" />
          {t("downloadReceipt")}
        </a>
        <a
          href={`${API_BASE}/v1/drafts/${draftId}/pdf`}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-700 transition hover:border-gray-300"
        >
          <FileText className="h-4 w-4" />
          {t("viewLetter")}
        </a>
      </div>
    </div>
  );
}
