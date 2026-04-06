"use client";

import { use, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  usePaymentStatus,
  useDispatchInfo,
  PAYMENT_SUCCESS_STATES,
  PAYMENT_FAILURE_STATES,
} from "../../../../../hooks/use-payment-status";
import {
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
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
import { ActionLink } from "../../../../../components/product/ActionButton";
import { DispatchConfirmation } from "../../../../../components/product/DispatchConfirmation";
import { FlowHeader } from "../../../../../components/product/FlowHeader";
import { getApiUrl } from "../../../../../lib/api";
import { getCustomerFlowPath } from "../../../../../lib/customer-flow";
import { getAppButtonClassName } from "../../../../../components/ui/app-button";
import { StatusBadge } from "../../../../../components/ui/status-badge";

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
            isComplete
              ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && (
          <div
            className={[
              "mt-1 h-8 w-px",
              isComplete ? "bg-emerald-300 dark:bg-emerald-400/40" : "bg-zinc-200 dark:bg-zinc-800",
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
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{t("paymentFailed")}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {payment.data?.failureReason ?? t("paymentFailedSubtitle")}
        </p>
        <ActionLink
          href={getCustomerFlowPath(draftId, "checkout")}
          variant="secondary"
          leadingIcon={<ArrowLeft className="h-4 w-4 shrink-0" />}
        >
          {t("backToCheckout")}
        </ActionLink>
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
      icon: <HelpCircle className="h-16 w-16 text-amber-500" />,
    },
    reconciled: {
      subtitle: t("acceptedSubtitle"),
      tone: "success" as const,
      icon: <CheckCircle2 className="h-16 w-16 text-success" />,
    },
  } as const;
  const activeStateCopy =
    stateCopy[dispatchState as keyof typeof stateCopy] ?? stateCopy.queued;
  const stateLabel =
    dispatchState === "submitted"
      ? t("stateSubmitted")
      : dispatchState === "accepted" || dispatchState === "reconciled"
        ? t("stateAccepted")
        : dispatchState === "rejected"
          ? t("stateRejected")
          : dispatchState === "unknown"
            ? t("stateUnknown")
            : t("stateQueued");
  const stateTone =
    activeStateCopy.tone === "success"
      ? "success"
      : activeStateCopy.tone === "danger"
        ? "danger"
        : "warning";

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
          <StatusBadge tone={stateTone} className="mb-3">
            {stateLabel}
          </StatusBadge>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{t("title")}</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{activeStateCopy.subtitle}</p>
        </div>

        {/* Order reference with copy */}
        <button
          type="button"
          onClick={copyRef}
          className={getAppButtonClassName({
            variant: "secondary",
            size: "sm",
            className: "font-medium",
          })}
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
          {copyFailed && <span className="text-xs text-zinc-500">{t("copyFailed")}</span>}
        </button>

        <div
          className="app-panel mx-auto max-w-sm rounded-3xl p-6 text-left"
          aria-live="polite"
        >
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
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
          className="app-panel mx-auto max-w-sm rounded-3xl p-6 text-left"
        >
          <h2 className="mb-5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
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
          className="app-panel-muted mx-auto flex max-w-sm items-center gap-3 rounded-2.5xl px-5 py-3 text-left text-sm text-zinc-700 dark:text-zinc-200"
        >
          <Mail className="h-5 w-5 shrink-0" />
          <div>
            <StatusBadge tone="info" className="mb-2">
              {t("emailNotice")}
            </StatusBadge>
            <p className="text-xs text-zinc-600 dark:text-zinc-300">{t("emailNoticeDetail")}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-center">
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={getAppButtonClassName({
              variant: "secondary",
              className: "sm:flex-1",
            })}
          >
            <ExternalLink className="h-4 w-4" />
            {t("viewLetter")}
          </a>
          <ActionLink
            href="/draft/new"
            variant="primary"
            fullWidth
            className="sm:flex-1"
            leadingIcon={<PenLine className="h-4 w-4" />}
          >
            {t("sendAnother")}
          </ActionLink>
        </div>
      </main>

      {/* Mobile sticky CTA */}
      <div className="app-sticky-bar fixed inset-x-4 bottom-4 rounded-2.5xl p-2 md:hidden">
        <ActionLink
          href="/draft/new"
          variant="primary"
          fullWidth
        >
          {t("stickyCtaLabel")}
        </ActionLink>
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
    <div className="min-h-screen bg-[var(--app-surface-muted)] transition-colors">
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
