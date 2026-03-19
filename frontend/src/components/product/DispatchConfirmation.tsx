"use client";

import { CheckCircle, Clock, AlertTriangle, Circle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DispatchState } from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DispatchConfirmationProps {
  dispatchState: (typeof DispatchState)[keyof typeof DispatchState] | null;
  providerReference: string | null;
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
    completedIn: ["accepted", "reconciled"],
    activeIn: ["submitted"],
  },
  {
    key: "accepted",
    completedIn: ["reconciled"],
    activeIn: ["accepted"],
  },
  {
    key: "dispatching",
    completedIn: [],
    activeIn: ["reconciled"],
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
  isTrackable,
  submittedAt,
  lastCheckedAt,
}: DispatchConfirmationProps) {
  const t = useTranslations("dispatch");

  const isRejected = dispatchState === "rejected";
  const isQueued = dispatchState === "queued" || dispatchState === null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        {isRejected ? (
          <AlertTriangle className="h-6 w-6 text-destructive" />
        ) : isQueued ? (
          <Clock className="h-6 w-6 text-amber-500" />
        ) : (
          <CheckCircle className="h-6 w-6 text-emerald-600" />
        )}
        <div>
          <h2 className="text-lg font-semibold">
            {isRejected ? t("title.rejected") : isQueued ? t("title.queued") : t("title.dispatched")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isRejected
              ? t("subtitle.rejected")
              : isQueued
                ? t("subtitle.queued")
                : t("subtitle.dispatched")}
          </p>
        </div>
      </div>

      {/* Provider reference */}
      {providerReference && (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground">{t("reference.label")}</p>
          <p className="mt-1 font-mono text-sm font-medium">{providerReference}</p>
          {isTrackable ? (
            <p className="mt-1 text-xs text-emerald-700">{t("reference.trackingAvailable")}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{t("reference.noTracking")}</p>
          )}
        </div>
      )}

      {/* Timeline */}
      {!isRejected && (
        <div className="space-y-3">
          {TIMELINE_STEPS.map((step, i) => {
            const status = getStepStatus(step, dispatchState);
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
                  {status === "active" && step.key === "dispatching" && (
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
