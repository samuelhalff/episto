import type { SentryModule } from "./lib/sentry-client";
import { loadSentry } from "./lib/sentry-client";

const IDLE_TIMEOUT_MS = 4000;

function loadWhenIdle() {
  const run = () => void loadSentry().catch(() => undefined);
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS });
  } else {
    window.setTimeout(run, IDLE_TIMEOUT_MS);
  }
}

if (typeof window !== "undefined") {
  if (document.readyState === "complete") {
    loadWhenIdle();
  } else {
    window.addEventListener("load", loadWhenIdle, { once: true });
  }
}

export const onRouterTransitionStart: (
  ...args: Parameters<SentryModule["captureRouterTransitionStart"]>
) => void = (...args) => {
  void loadSentry()
    .then((Sentry) => Sentry?.captureRouterTransitionStart(...args))
    .catch(() => undefined);
};
