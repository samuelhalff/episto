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
import { Button } from "../../../../../components/ui/button.js";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card.js";
import { Badge } from "../../../../../components/ui/badge.js";
import { cn } from "../../../../../lib/utils.js";

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
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
            isComplete
              ? "bg-success/10 text-success"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && (
          <div
            className={cn(
              "mt-1 h-8 w-px",
              isComplete ? "bg-success/40" : "bg-border"
            )}
          />
        )}
      </div>
      <p
        className={cn(
          "pt-1.5 text-sm",
          isComplete ? "font-medium text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </p>
    </div>
  );
}

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
  const fallback = labels["queued"] as { key: string; icon: typeof Clock };
  const entry = labels[state ?? "queued"] ?? fallback;
  const Icon = entry.icon;
  const isError = state === "rejected";

  return (
    <div className="flex items-center gap-3">
      <Icon className={cn("h-5 w-5", isError ? "text-destructive" : "text-primary")} />
      <p className={cn("text-sm", isError ? "text-destructive" : "text-muted-foreground")}>
        {t(entry.key)}
      </p>
    </div>
  );
}

function ConfirmationContent({ draftId }: { draftId: string }) {
  const t = useTranslations("confirmation");
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

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
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 3000);
    }
  }, [orderRef]);

  if (isVerifying) {
    return (
      <main id="main-content" className="mx-auto max-w-2xl space-y-6 px-4 py-20 text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("verifying")}</p>
      </main>
    );
  }

  if (isFailed) {
    return (
      <main id="main-content" className="mx-auto max-w-2xl space-y-6 px-4 py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-10 w-10 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t("paymentFailed")}</h1>
        <p className="text-sm text-muted-foreground">
          {payment.data?.failureReason ?? t("paymentFailedSubtitle")}
        </p>
        <Button asChild size="lg">
          <Link href={`/draft/${draftId}/checkout`}>
            {t("backToCheckout")}
          </Link>
        </Button>
      </main>
    );
  }

  const dispatchState = dispatch.data?.state ?? "queued";
  const dispatchComplete = ["submitted", "accepted", "reconciled"];
  const isStepComplete = (index: number): boolean => {
    if (index === 0) return true;
    if (index === 1) return dispatchComplete.includes(dispatchState);
    return false;
  };

  return (
    <>
      <main id="main-content" className="mx-auto max-w-2xl space-y-8 px-4 pb-24 pt-12 text-center md:pb-12">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-10 w-10 text-success" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        {/* Order reference */}
        <button
          type="button"
          onClick={copyRef}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm transition-colors hover:bg-accent"
          aria-label={t("copyReference")}
        >
          <span className="font-medium text-muted-foreground">{t("orderReference")}:</span>
          <code className="font-mono font-semibold text-foreground">{orderRef}</code>
          {copied ? (
            <Badge variant="success" className="text-[10px]">{t("copied")}</Badge>
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          {copyFailed && (
            <span className="text-xs text-muted-foreground">{t("copyFailed")}</span>
          )}
        </button>

        {/* Dispatch status */}
        <Card className="mx-auto max-w-sm text-left">
          <CardHeader>
            <CardTitle className="text-sm">{t("dispatchTitle")}</CardTitle>
          </CardHeader>
          <CardContent aria-live="polite">
            <DispatchStateLabel state={dispatchState} t={t} />
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="mx-auto max-w-sm text-left">
          <CardHeader>
            <CardTitle className="text-sm">{t("whatHappensNext")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {TIMELINE_STEPS.map((step, i) => (
                <TimelineStep
                  key={step.key}
                  icon={step.icon}
                  label={t(step.key)}
                  isComplete={isStepComplete(i)}
                  isLast={i === TIMELINE_STEPS.length - 1}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Email notice */}
        <Card className="mx-auto max-w-sm border-primary/20 bg-primary/5 text-left">
          <CardContent className="flex items-center gap-3 p-5">
            <Mail className="h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-foreground">{t("emailNotice")}</p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 pt-4 sm:flex-row sm:justify-center">
          <Button asChild variant="outline">
            <Link href={`/draft/${draftId}`}>
              <ExternalLink className="mr-1.5 h-4 w-4" />
              {t("viewLetter")}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/draft/new">
              <PenLine className="mr-1.5 h-4 w-4" />
              {t("sendAnother")}
            </Link>
          </Button>
        </div>
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background p-4 md:hidden">
        <Button asChild className="w-full">
          <Link href="/draft/new">{t("stickyCtaLabel")}</Link>
        </Button>
      </div>
    </>
  );
}

export default function ConfirmationPage({
  params,
}: {
  params: Promise<{ draftId: string }>;
}) {
  const { draftId } = use(params);
  const tc = useTranslations("common");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-center">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Mail className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">{tc("appName")}</span>
          </Link>
        </div>
      </header>

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
