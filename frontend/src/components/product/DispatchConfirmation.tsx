"use client";

import {
  AlertTriangle,
  CheckCircle,
  Circle,
  Clock,
  HelpCircle,
  Send,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { DispatchState } from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DispatchConfirmationProps {
  dispatchState: (typeof DispatchState)[keyof typeof DispatchState] | null;
  providerReference: string | null;
  trackingNumber?: string | null;
  providerMode: "mock" | "live" | null;
  isTrackable: boolean;
  submittedAt: string | null;
  lastCheckedAt: string | null;
}

// ---------------------------------------------------------------------------
// Timeline step definition
// ---------------------------------------------------------------------------

interface TimelineStep {
  key: string;
  /** States in which this step is 'completed' */
  completedIn: string[];
  /** States in which this step is 'current' (active) */
  activeIn: string[];
}

const TIMELINE_STEPS: TimelineStep[] = [
  {
    key: "submitted",
    completedIn: ["submitted", "accepted", "unknown", "rejected", "reconciled"],
    activeIn: ["queued"],
  },
  {
    key: "accepted",
    completedIn: ["accepted", "reconciled"],
    activeIn: ["submitted", "unknown"],
  },
  {
    key: "dispatching",
    completedIn: ["reconciled"],
    activeIn: ["accepted"],
  },
];

type StepStatus = "completed" | "active" | "upcoming" | "error";

function getStepStatus(step: TimelineStep, state: string | null): StepStatus {
  if (!state) return "upcoming";
  if (state === "rejected") return "error";
  if (step.completedIn.includes(state)) return "completed";
  if (step.activeIn.includes(state)) return "active";
  return "upcoming";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DispatchConfirmation({
  dispatchState,
  providerReference,
  trackingNumber,
  providerMode,
  isTrackable,
  submittedAt,
  lastCheckedAt,
}: DispatchConfirmationProps) {
  const t = useTranslations("dispatch");

  const state = dispatchState ?? "queued";
  const statusCopy = {
    queued: {
      title: t("title.queued"),
      subtitle: t("subtitle.queued"),
      icon: <Clock className="h-6 w-6 text-amber-500" />,
    },
    submitted: {
      title: t("title.submitted"),
      subtitle: t("subtitle.submitted"),
      icon: <Send className="h-6 w-6 text-primary" />,
    },
    accepted: {
      title: t("title.accepted"),
      subtitle: t("subtitle.accepted"),
      icon: <CheckCircle className="h-6 w-6 text-emerald-600" />,
    },
    rejected: {
      title: t("title.rejected"),
      subtitle: t("subtitle.rejected"),
      icon: <AlertTriangle className="h-6 w-6 text-destructive" />,
    },
    unknown: {
      title: t("title.unknown"),
      subtitle: t("subtitle.unknown"),
      icon: <HelpCircle className="h-6 w-6 text-amber-500" />,
    },
    reconciled: {
      title: t("title.accepted"),
      subtitle: t("subtitle.accepted"),
      icon: <CheckCircle className="h-6 w-6 text-emerald-600" />,
    },
  } as const;

  const current = statusCopy[state as keyof typeof statusCopy] ?? statusCopy.queued;
  const isRejected = state === "rejected";
  const primaryReference = trackingNumber ?? providerReference;
  const primaryReferenceLabel = trackingNumber
    ? t("reference.trackingLabel")
    : t("reference.label");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {current.icon}
        <div>
          <h2 className="text-lg font-semibold">{current.title}</h2>
          <p className="text-sm text-muted-foreground">{current.subtitle}</p>
        </div>
      </div>

      {/* Provider reference */}
      {primaryReference && (
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {primaryReferenceLabel}
          </p>
          <p className="mt-2 font-mono text-base font-semibold leading-snug text-zinc-950 dark:text-zinc-50">
            {primaryReference}
          </p>
          {trackingNumber && providerReference && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">{t("reference.label")}:</span>{" "}
              <span className="font-mono">{providerReference}</span>
            </p>
          )}
          {isTrackable ? (
            <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {t("reference.trackingAvailable")}
            </p>
          ) : (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {t("reference.noTracking")}
            </p>
          )}
          {providerMode === "mock" && (
            <div className="mt-3 rounded-2xl bg-[var(--action-choice-active-bg)] px-3 py-3 text-xs text-[var(--app-muted-strong)]">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                {t("reference.mockLabel")}
              </p>
              <p className="mt-1.5 leading-5">{t("reference.mockBody")}</p>
            </div>
          )}
        </div>
      )}

      {!primaryReference && (
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-4 py-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{t("reference.pending")}</p>
        </div>
      )}

      {/* Timeline */}
      {!isRejected && (
        <div className="space-y-3">
          {TIMELINE_STEPS.map((step, i) => {
            const status = getStepStatus(step, state);
            return (
              <div key={step.key} className="flex gap-3">
                {/* Connector */}
                <div className="flex flex-col items-center">
                  <StepIcon status={status} />
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div
                      className={[
                        "mt-1 w-px flex-1",
                        status === "completed" ? "bg-emerald-400" : "bg-border",
                      ].join(" ")}
                      style={{ minHeight: "1.5rem" }}
                    />
                  )}
                </div>
                {/* Label */}
                <div className="pb-3">
                  <p
                    className={[
                      "text-sm font-medium",
                      status === "active" ? "text-primary" : "",
                      status === "upcoming" ? "text-muted-foreground" : "",
                      status === "completed" ? "text-foreground" : "",
                    ].join(" ")}
                  >
                    {t(`step.${step.key}`)}
                  </p>
                  {step.key === "submitted" && submittedAt && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(submittedAt).toLocaleString()}
                    </p>
                  )}
                  {status === "active" && step.key !== "submitted" && (
                    <p className="text-xs text-muted-foreground">
                      {t("step.providerNote")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Last checked */}
      {lastCheckedAt && (
        <p className="text-xs text-muted-foreground">
          {t("lastChecked", { time: new Date(lastCheckedAt).toLocaleString() })}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step icon
// ---------------------------------------------------------------------------

function StepIcon({ status }: { status: StepStatus }) {
  switch (status) {
    case "completed":
      return <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />;
    case "active":
      return (
        <div className="h-5 w-5 shrink-0 animate-pulse rounded-full border-2 border-primary bg-primary/20" />
      );
    case "error":
      return <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />;
    case "upcoming":
    default:
      return <Circle className="h-5 w-5 shrink-0 text-border" />;
  }
}
