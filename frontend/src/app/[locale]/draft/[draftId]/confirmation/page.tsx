"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { useDraft } from "../../../../../hooks/use-api.js";
import { Link } from "../../../../../i18n/navigation.js";
import {
  CheckCircle2,
  FileText,
  Printer,
  Truck,
  Download,
  PenLine,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Timeline Step
// ---------------------------------------------------------------------------

function TimelineStep({
  icon,
  label,
  isLast,
}: {
  icon: React.ReactNode;
  label: string;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy">
          {icon}
        </div>
        {!isLast && <div className="mt-1 h-8 w-px bg-gray-200" />}
      </div>
      <p className="pt-1.5 text-sm text-gray-700">{label}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirmation Page
// ---------------------------------------------------------------------------

export default function ConfirmationPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = use(params);
  const t = useTranslations("confirmation");
  const tc = useTranslations("common");
  const draft = useDraft(draftId);

  if (draft.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-navy" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-center">
          <Link href="/" className="font-bold text-navy">
            {tc("appName")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-8 px-4 py-12 text-center">
        {/* Success icon */}
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-success" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="mt-2 text-sm text-gray-500">{t("subtitle")}</p>
        </div>

        {/* Order reference */}
        <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm text-gray-600">
          <span className="font-medium">{t("orderReference")}:</span>
          <code className="font-mono text-navy">{draftId.slice(0, 8)}</code>
        </div>

        {/* What happens next */}
        <div className="mx-auto max-w-sm rounded-lg border border-gray-200 bg-white p-6 text-left">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">
            {t("whatHappensNext")}
          </h2>
          <div className="space-y-1">
            <TimelineStep
              icon={<FileText className="h-4 w-4" />}
              label={t("stepProcessing")}
              isLast={false}
            />
            <TimelineStep
              icon={<Printer className="h-4 w-4" />}
              label={t("stepPrinting")}
              isLast={false}
            />
            <TimelineStep
              icon={<Truck className="h-4 w-4" />}
              label={t("stepDelivery")}
              isLast={true}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            {t("downloadReceipt")}
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-light"
          >
            <PenLine className="h-4 w-4" />
            {t("sendAnother")}
          </Link>
        </div>
      </main>
    </div>
  );
}
