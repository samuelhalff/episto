"use client";

import { useEffect, useRef } from "react";
import { apiFetch, getApiUrl } from "@/lib/api";

const IDLE_AFTER_MS = 60_000; // 60s of inactivity → idle event
const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = [
  "click",
  "keydown",
  "scroll",
  "pointermove",
  "touchstart",
  "input",
];

export type StepName = string;

type StepEvent =
  | "step_entered"
  | "step_completed"
  | "step_idle"
  | "step_abandoned"
  | "step_error";

interface StepEventBody {
  event: StepEvent;
  step: StepName;
  draftId?: string;
  durationMs?: number;
  errorFamily?: string;
  locale?: string;
}

function postEvent(body: StepEventBody, useBeacon = false): void {
  const path = "/v1/events";
  if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
      navigator.sendBeacon(getApiUrl(path), blob);
      return;
    } catch {
      /* fall through */
    }
  }
  void apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
    keepalive: useBeacon,
  }).catch(() => {
    // Telemetry must never break the UI.
  });
}

interface UseStepTrackingOptions {
  step: StepName;
  draftId?: string;
  locale?: string;
  /** When set, treat the step as completed instead of abandoned on unmount. */
  completeOnUnmount?: boolean;
}

export function useStepTracking({
  step,
  draftId,
  locale,
  completeOnUnmount = false,
}: UseStepTrackingOptions): {
  reportError: (errorFamily: string) => void;
  markCompleted: () => void;
} {
  const enteredAtRef = useRef<number>(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleEmittedRef = useRef(false);
  const completedRef = useRef(false);

  function clearIdleTimer() {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }

  function scheduleIdleTimer() {
    clearIdleTimer();
    if (idleEmittedRef.current) return;
    idleTimerRef.current = setTimeout(() => {
      idleEmittedRef.current = true;
      postEvent({
        event: "step_idle",
        step,
        durationMs: IDLE_AFTER_MS,
        ...(draftId ? { draftId } : {}),
        ...(locale ? { locale } : {}),
      });
    }, IDLE_AFTER_MS);
  }

  useEffect(() => {
    enteredAtRef.current = Date.now();
    completedRef.current = false;
    idleEmittedRef.current = false;

    postEvent({
      event: "step_entered",
      step,
      ...(draftId ? { draftId } : {}),
      ...(locale ? { locale } : {}),
    });

    function handleActivity() {
      idleEmittedRef.current = false;
      scheduleIdleTimer();
    }
    function handleVisibility() {
      if (document.visibilityState === "hidden" && !completedRef.current) {
        const durationMs = Date.now() - enteredAtRef.current;
        postEvent(
          {
            event: "step_abandoned",
            step,
            durationMs,
            ...(draftId ? { draftId } : {}),
            ...(locale ? { locale } : {}),
          },
          true,
        );
        completedRef.current = true;
      }
    }

    scheduleIdleTimer();
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, handleActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearIdleTimer();
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, handleActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibility);

      if (!completedRef.current) {
        const durationMs = Date.now() - enteredAtRef.current;
        postEvent({
          event: completeOnUnmount ? "step_completed" : "step_abandoned",
          step,
          durationMs,
          ...(draftId ? { draftId } : {}),
          ...(locale ? { locale } : {}),
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, draftId, locale, completeOnUnmount]);

  return {
    reportError(errorFamily: string) {
      postEvent({
        event: "step_error",
        step,
        errorFamily,
        ...(draftId ? { draftId } : {}),
        ...(locale ? { locale } : {}),
      });
    },
    markCompleted() {
      if (completedRef.current) return;
      completedRef.current = true;
      const durationMs = Date.now() - enteredAtRef.current;
      postEvent({
        event: "step_completed",
        step,
        durationMs,
        ...(draftId ? { draftId } : {}),
        ...(locale ? { locale } : {}),
      });
    },
  };
}
