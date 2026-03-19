"use client";

import { use, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  usePaymentStatus,
  useDispatchInfo,
  PAYMENT_SUCCESS_STATES,
  PAYMENT_FAILURE_STATES,
} from "../../../../../hooks/use-payment-status.js";
import { Link } from "../../../../../i18n/navigation.js";
import {
  CheckCircle2,
  AlertCircle,
  Check,
  Clock,
  Send,
  HelpCircle,
  Copy,
  Mail,
  ExternalLink,
  PenLine,
  Loader2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Timeline Step
// ---------------------------------------------------------------------------

const TIMELINE_STEPS = [
  { key: "stepPayment" as const, icon: Check },
  { key: "stepSubmitted" as const, icon: Send },
  { key: "stepProcessing" as const, icon: Clock },
  { key: "stepUpdates" as const, icon: HelpCircle },
] as const;

function TimelineStep({
  icon: Icon,
  label,
  isComplete,
  isLast,
}: {
  icon: typeof Check;
  label: string;
  isComplete: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
            isComplete ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && (
          <div
            className={[
              "mt-1 h-8 w-px",
              isComplete ? "bg-emerald-300" : "bg-gray-200",
            ].join(" ")}
          />
        )}
      </div>
      <p
        className={[
          "pt-1.5 text-sm",
          isComplete ? "font-medium text-gray-900" : "text-gray-400",
        ].join(" ")}
      >
        {label}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispatch state label
// ---------------------------------------------------------------------------

function DispatchStateLabel({
  state,
  t,
}: {
  state: string | null;
  t: ReturnType<typeof useTranslations>;
}) {
  const labels: Record<string, { key: string; icon: typeof Clock }> = {
    queued: { key: "stateQueued", icon: Clock },
    submitted: { key: "stateSubmitted", icon: Send },
    accepted: { key: "stateAccepted", icon: Check },
    rejected: { key: "stateRejected", icon: AlertCircle },
    unknown: { key: "stateUnknown", icon: HelpCircle },
  };
  const entry = labels[state ?? "queued"] ?? labels["queued"];
  const Icon = entry!.icon;
  const isError = state === "rejected";

  return (
    <div className="flex items-center gap-3">
      <Icon className={`h-5 w-5 ${isError ? "text-destructive" : "text-navy"}`} />
      <p className={`text-sm ${isError ? "text-destructive" : "text-gray-700"}`}>
        {t(entry!.key)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner content (needs useSearchParams → Suspense)
// ---------------------------------------------------------------------------

function ConfirmationContent({ draftId }: { draftId: string }) {
  const t = useTranslations("confirmation");
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  const redirectStatus = searchParams.get("redirect_status");
  const payment = usePaymentStatus(draftId);

  const paymentState = payment.data?.state ?? null;
  const isSuccess = paymentState !== null && PAYMENT_SUCCESS_STATES.includes(paymentState);
  const isFailed =
    redirectStatus === "failed" ||
    (paymentState !== null && PAYMENT_FAILURE_STATES.includes(paymentState));
  const isVerifying = !isSuccess && !isFailed;

  const dispatch = useDispatchInfo(draftId, isSuccess);

  const orderRef = `SM-${draftId.slice(0, 8).toUpperCase()}`;

  const copyRef = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(orderRef);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  }, [orderRef]);

  if (isVerifying) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-20 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-navy" />
        <p className="text-sm text-gray-500">{t("verifying")}</p>
      </main>
    );
  }

  if (isFailed) {
    return (
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-gray-900">{t("paymentFailed")}</h1>
        <p className="text-sm text-gray-500">
          {payment.data?.failureReason ?? t("paymentFailedSubtitle")}
        </p>
        <Link
          href={`/draft/${draftId}/checkout`}
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-light"
        >
          {t("backToCheckout")}
        </Link>
      </main>
    );
  }

  const dispatchState = dispatch.data?.state ?? "queued";

  return (
    <>
      <main className="mx-auto max-w-2xl space-y-8 px-4 pb-24 pt-12 text-center md:pb-12">
        <div className="flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-success" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
          <p className="mt-2 text-sm text-gray-500">{t("subtitle")}</p>
        </div>

        {/* Order reference with copy */}
        <button
          type="button"
          onClick={copyRef}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2 text-sm text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
          aria-label={t("copyReference")}
        >
          <span className="font-medium">{t("orderReference")}:</span>
          <code className="font-mono text-navy">{orderRef}</code>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-gray-400" />
          )}
          {copied && (
            <span className="text-xs text-emerald-600">{t("copied")}</span>
          )}
        </button>

        {/* Dispatch status */}
        <div
          className="mx-auto max-w-sm rounded-lg border border-gray-200 bg-white p-6 text-left"
          aria-live="polite"
        >
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            {t("dispatchTitle")}
          </h2>
          <DispatchStateLabel state={dispatchState} t={t} />
        </div>

        {/* What happens next — 4-step timeline */}
        <div className="mx-auto max-w-sm rounded-lg border border-gray-200 bg-white p-6 text-left">
          <h2 className="mb-5 text-sm font-semibold text-gray-900">
            {t("whatHappensNext")}
          </h2>
          <div className="space-y-1">
            {TIMELINE_STEPS.map((step, i) => (
              <TimelineStep
                key={step.key}
                icon={step.icon}
                label={t(step.key)}
                isComplete={i === 0}
                isLast={i === TIMELINE_STEPS.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Email notice */}
        <div className="mx-auto flex max-w-sm items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 px-5 py-3 text-left text-sm text-blue-800">
          <Mail className="h-5 w-5 shrink-0" />
          <p>{t("emailNotice")}</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-center">
          <Link
            href={`/draft/${draftId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            {t("viewLetter")}
          </Link>
          <Link
            href="/draft/new"
            className="inline-flex items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-light"
          >
            <PenLine className="h-4 w-4" />
            {t("sendAnother")}
          </Link>
        </div>
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 md:hidden">
        <Link
          href="/draft/new"
          className="block rounded-lg bg-navy py-3 text-center text-sm font-semibold text-white transition hover:bg-navy-light"
        >
          {t("stickyCtaLabel")}
        </Link>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper (Suspense boundary for useSearchParams)
// ---------------------------------------------------------------------------

export default function ConfirmationPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = use(params);
  const tc = useTranslations("common");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-center">
          <Link href="/" className="font-bold text-navy">
            {tc("appName")}
          </Link>
        </div>
      </header>

      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-navy" />
          </div>
        }
      >
        <ConfirmationContent draftId={draftId} />
      </Suspense>
    </div>
  );
}
