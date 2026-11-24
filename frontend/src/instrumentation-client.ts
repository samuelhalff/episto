import type { SentryModule } from "./lib/sentry-client";
import { loadSentry } from "./lib/sentry-client";

const FALLBACK_DELAY_MS = 8000;
const TRIGGER_EVENTS = [
  "pointerdown",
  "keydown",
  "scroll",
  "touchstart",
  "error",
  "unhandledrejection",
] as const;

// Keep the Sentry SDK off the critical path: it loads on the first interaction,
// the first uncaught error, or after a fallback delay, whichever comes first.
function loadOnFirstTrigger() {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    for (const name of TRIGGER_EVENTS) window.removeEventListener(name, run);
    void loadSentry().catch(() => undefined);
  };
  const timer = window.setTimeout(run, FALLBACK_DELAY_MS);
  for (const name of TRIGGER_EVENTS) {
    window.addEventListener(name, run, { passive: true });
  }
}

if (typeof window !== "undefined") {
  loadOnFirstTrigger();
}

export const onRouterTransitionStart: (
  ...args: Parameters<SentryModule["captureRouterTransitionStart"]>
) => void = (...args) => {
  void loadSentry()
    .then((Sentry) => Sentry?.captureRouterTransitionStart(...args))
    .catch(() => undefined);
};
