"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import {
  getAnalyticsConsent,
  setAnalyticsConsent,
  subscribeConsent,
} from "../../lib/consent";

interface ConsentCopy {
  body: string;
  policy: string;
  accept: string;
  decline: string;
}

// Self-contained per-locale copy for the consent banner (mirrors the other
// contained widgets). Honestly discloses Google Analytics + offers a choice.
const DE_CONSENT_COPY: ConsentCopy = {
  body: "Wir nutzen Google Analytics, um zu verstehen, wie Episto genutzt wird. Sie entscheiden, ob wir dürfen.",
  policy: "Datenschutz",
  accept: "Akzeptieren",
  decline: "Ablehnen",
};

const COPY: Record<string, ConsentCopy> = {
  "de-CH": DE_CONSENT_COPY,
  "fr-CH": {
    body: "Nous utilisons Google Analytics pour comprendre comment Episto est utilisé. C'est votre choix.",
    policy: "Confidentialité",
    accept: "Accepter",
    decline: "Refuser",
  },
  "it-CH": {
    body: "Utilizziamo Google Analytics per capire come viene usato Episto. La scelta è Sua.",
    policy: "Privacy",
    accept: "Accetto",
    decline: "Rifiuto",
  },
  "en-CH": {
    body: "We use Google Analytics to understand how Episto is used. It's your choice.",
    policy: "Privacy",
    accept: "Accept",
    decline: "Decline",
  },
};

export function PrivacyNoticeStrip() {
  const locale = useLocale();
  const copy = COPY[locale] ?? DE_CONSENT_COPY;

  // Visible until the visitor has made an analytics decision.
  const undecided = useSyncExternalStore(
    subscribeConsent,
    () => getAnalyticsConsent() === null,
    () => false,
  );

  if (!undecided) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 sm:left-1/2 sm:right-auto sm:w-[min(42rem,calc(100vw-2rem))] sm:-translate-x-1/2">
      <div className="app-sticky-bar rounded-2xl px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className="min-w-0 flex-1 text-xs leading-relaxed"
            style={{ color: "var(--app-muted)" }}
          >
            {copy.body}{" "}
            <a
              href="/privacy"
              className="underline underline-offset-2"
              style={{ color: "var(--app-fg)" }}
            >
              {copy.policy}
            </a>
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setAnalyticsConsent("denied")}
              className="app-choice-pill min-h-9 px-3 text-xs font-medium text-[var(--app-muted)] hover:text-[var(--app-fg)]"
            >
              {copy.decline}
            </button>
            <button
              onClick={() => setAnalyticsConsent("granted")}
              className="btn-primary min-h-9 px-4 text-xs"
            >
              {copy.accept}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
