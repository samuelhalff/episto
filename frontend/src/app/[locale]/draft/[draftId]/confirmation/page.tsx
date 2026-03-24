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
  HelpCircle as HelpCircleIcon,
} from "lucide-react";
import { DispatchConfirmation } from "../../../../../components/product/DispatchConfirmation.js";
import { FlowHeader } from "../../../../../components/product/FlowHeader.js";
import { getApiUrl } from "../../../../../lib/api.js";

// ---------------------------------------------------------------------------
// Timeline Step
// ---------------------------------------------------------------------------

const TIMELINE_STEPS = [
  { key: "stepPayment" as const, icon: Check },
  { key: "stepSubmitted" as const, icon: Send },
  { key: "stepProcessing" as const, icon: Clock },
  { key: "stepUpdates" as const, icon: HelpCircle },
] as const;

const DISPATCH_COMPLETE_STATES = ["submitted", "accepted", "reconciled"];

function TimelineStep({
  icon: Icon,
  label,
  description,
  isComplete,
  isLast,
}: {
  icon: typeof Check;
  label: string;
  description: string;
  isComplete: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            isComplete ? "bg-emerald-100 text-emerald-600" : "bg-zinc-100 text-zinc-400",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && (
          <div
            className={[
              "mt-1 h-8 w-px",
              isComplete ? "bg-emerald-300" : "bg-zinc-200",
            ].join(" ")}
          />
        )}
      </div>
      <p
        className={[
          "pt-1.5 text-sm",
          isComplete ? "font-medium text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500",
        ].join(" ")}
      >
        {label}
        <span className="mt-1 block text-xs font-normal text-zinc-500 dark:text-zinc-400">
          {description}
        </span>
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
  const [copyFailed, setCopyFailed] = useState(false);

  const redirectStatus = searchParams.get("redirect_status");
  const payment = usePaymentStatus(draftId);

  const paymentState = payment.data?.state ?? null;
  const isSuccess =
    paymentState !== null && PAYMENT_SUCCESS_STATES.includes(paymentState);
  const isFailed =
    redirectStatus === "failed" ||
    (paymentState !== null && PAYMENT_FAILURE_STATES.includes(paymentState));
  const isVerifying = !isSuccess && !isFailed;

  const dispatch = useDispatchInfo(draftId, isSuccess);

  const orderRef = `SM-${draftId.slice(0, 8).toUpperCase()}`;
  const pdfUrl = getApiUrl(`/v1/drafts/${draftId}/pdf`);

  const copyRef = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(orderRef);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 3000);
    }
  }, [orderRef]);

  if (isVerifying) {
    return (
      <main
        id="main-content"
        className="mx-auto max-w-2xl space-y-6 px-4 py-12 text-center"
      >
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("verifying")}</p>
      </main>
    );
  }

  if (isFailed) {
    return (
      <main
        id="main-content"
        className="mx-auto max-w-2xl space-y-6 px-4 py-12 text-center"
      >
        <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("paymentFailed")}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {payment.data?.failureReason ?? t("paymentFailedSubtitle")}
        </p>
        <Link
          href={`/draft/${draftId}/checkout`}
          className="inline-flex items-center gap-2 rounded-[16px] bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.98]"
        >
          {t("backToCheckout")}
        </Link>
      </main>
    );
  }

  const dispatchState = dispatch.data?.state ?? "queued";
  const stateCopy = {
    queued: {
      subtitle: t("queuedSubtitle"),
      tone: "warning" as const,
      icon: <Clock className="h-16 w-16 text-amber-500" />,
    },
    submitted: {
      subtitle: t("submittedSubtitle"),
      tone: "success" as const,
      icon: <CheckCircle2 className="h-16 w-16 text-success" />,
    },
    accepted: {
      subtitle: t("acceptedSubtitle"),
      tone: "success" as const,
      icon: <CheckCircle2 className="h-16 w-16 text-success" />,
    },
    rejected: {
      subtitle: t("rejectedSubtitle"),
      tone: "danger" as const,
      icon: <AlertCircle className="h-16 w-16 text-destructive" />,
    },
    unknown: {
      subtitle: t("unknownSubtitle"),
      tone: "warning" as const,
      icon: <HelpCircleIcon className="h-16 w-16 text-amber-500" />,
    },
    reconciled: {
      subtitle: t("acceptedSubtitle"),
      tone: "success" as const,
      icon: <CheckCircle2 className="h-16 w-16 text-success" />,
    },
  } as const;
  const activeStateCopy =
    stateCopy[dispatchState as keyof typeof stateCopy] ?? stateCopy.queued;

  // Determine which timeline steps are complete based on dispatch progress
  const isStepComplete = (index: number): boolean => {
    // Step 0: Payment — always complete in success state
    if (index === 0) return true;
    // Step 1: Submitted — complete when dispatch state is past queued
    if (index === 1) return DISPATCH_COMPLETE_STATES.includes(dispatchState);
    // Steps 2–3: Provider processing / updates — always pending
    return false;
  };

  return (
    <>
      <main
        id="main-content"
        className="mx-auto max-w-2xl space-y-8 px-4 pb-12 pt-8 text-center md:pb-10"
      >
        <div className="flex justify-center">{activeStateCopy.icon}</div>

        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{t("title")}</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{activeStateCopy.subtitle}</p>
        </div>

        {/* Order reference with copy */}
        <button
          type="button"
          onClick={copyRef}
          className="inline-flex items-center gap-2 rounded-[16px] bg-white px-5 py-2 text-sm text-zinc-600 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          style={{ outline: "1px solid var(--app-border)" }}
          aria-label={t("copyReference")}
        >
          <span className="font-medium">{t("orderReference")}:</span>
          <code className="font-mono text-zinc-900 dark:text-zinc-50">{orderRef}</code>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-zinc-400" />
          )}
          {copied && <span className="text-xs text-emerald-600">{t("copied")}</span>}
          {copyFailed && <span className="text-xs text-gray-500">{t("copyFailed")}</span>}
        </button>

        <div
          className="mx-auto max-w-sm rounded-[24px] bg-white p-6 text-left shadow-sm dark:bg-zinc-900"
          style={{ outline: "1px solid var(--app-border)" }}
          aria-live="polite"
        >
          <h2 className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
            {t("dispatchTitle")}
          </h2>
          <DispatchConfirmation
            dispatchState={
              dispatchState as Parameters<typeof DispatchConfirmation>[0]["dispatchState"]
            }
            providerReference={dispatch.data?.providerRef ?? null}
            isTrackable={dispatch.data?.trackingAvailable ?? false}
            submittedAt={dispatch.data?.submittedAt ?? null}
            lastCheckedAt={dispatch.data?.lastCheckedAt ?? null}
          />
        </div>

        {/* What happens next — 4-step timeline */}
        <div
          className="mx-auto max-w-sm rounded-[24px] bg-white p-6 text-left shadow-sm dark:bg-zinc-900"
          style={{ outline: "1px solid var(--app-border)" }}
        >
          <h2 className="mb-5 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
            {t("whatHappensNext")}
          </h2>
          <ol role="list" className="space-y-1">
            {TIMELINE_STEPS.map((step, i) => (
              <TimelineStep
                key={step.key}
                icon={step.icon}
                label={t(step.key)}
                description={t(`${step.key}Detail`)}
                isComplete={isStepComplete(i)}
                isLast={i === TIMELINE_STEPS.length - 1}
              />
            ))}
          </ol>
        </div>

        {/* Email notice */}
        <div
          className="mx-auto flex max-w-sm items-center gap-3 rounded-[20px] bg-blue-50 px-5 py-3 text-left text-sm text-blue-800"
          style={{ outline: "1px solid rgba(59,130,246,0.1)" }}
        >
          <Mail className="h-5 w-5 shrink-0" />
          <div>
            <p>{t("emailNotice")}</p>
            <p className="mt-1 text-xs text-blue-800/80">{t("emailNoticeDetail")}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-center">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[16px] bg-white px-5 py-2.5 text-sm text-zinc-600 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            style={{ outline: "1px solid var(--app-border)" }}
          >
            <ExternalLink className="h-4 w-4" />
            {t("viewLetter")}
          </a>
          <Link
            href="/draft/new"
            className="inline-flex items-center gap-2 rounded-[16px] bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.98]"
          >
            <PenLine className="h-4 w-4" />
            {t("sendAnother")}
          </Link>
        </div>
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#f6f4ef]/95 p-4 shadow-[0_-1px_0_rgba(0,0,0,0.05)] backdrop-blur-md dark:bg-zinc-950/95 dark:shadow-[0_-1px_0_rgba(255,255,255,0.06)] md:hidden">
        <Link
          href="/draft/new"
          className="block rounded-[16px] bg-zinc-950 py-3 text-center text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-[0.98]"
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
  const t = useTranslations("confirmation");

  return (
    <div className="min-h-screen bg-[#f6f4ef] transition-colors dark:bg-zinc-950">
      <FlowHeader currentStep={3} draftId={draftId} title={t("title")} />

      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        }
      >
        <ConfirmationContent draftId={draftId} />
      </Suspense>
    </div>
  );
}
