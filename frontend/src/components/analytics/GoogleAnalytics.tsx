"use client";

import Script from "next/script";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getAnalyticsConsent, subscribeConsent } from "../../lib/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const LOAD_DELAY_MS = 5000;
const INTERACTION_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

/**
 * Loads Google Analytics 4 using Consent Mode v2.
 *
 * The gtag script is always present when a measurement ID is configured (so GA
 * detects the tag and reports the stream as "active"), but consent defaults to
 * DENIED: no analytics/ad cookies are set and no personal data is collected
 * until the visitor explicitly opts in via the consent banner. On opt-in we
 * push a `consent update` that flips analytics_storage to "granted".
 *
 * gtag.js itself is loaded after first paint: on the first interaction, or
 * after a short delay, whichever comes first. Events queued on `dataLayer` by
 * the bootstrap are replayed when it arrives, so nothing is lost.
 *
 * The nonce (from the per-request CSP) is passed through so the inline config
 * script is allowed by the policy.
 */
export function GoogleAnalytics({ nonce }: { nonce?: string | undefined }) {
  const consent = useSyncExternalStore(subscribeConsent, getAnalyticsConsent, () => null);
  const [loadScript, setLoadScript] = useState(false);

  useEffect(() => {
    if (!GA_ID) return;
    const start = () => setLoadScript(true);
    const timer = window.setTimeout(start, LOAD_DELAY_MS);
    for (const name of INTERACTION_EVENTS) {
      window.addEventListener(name, start, { once: true, passive: true });
    }
    return () => {
      window.clearTimeout(timer);
      for (const name of INTERACTION_EVENTS) window.removeEventListener(name, start);
    };
  }, []);

  useEffect(() => {
    if (!GA_ID || typeof window === "undefined") return;
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag !== "function") return;
    gtag("consent", "update", {
      analytics_storage: consent === "granted" ? "granted" : "denied",
    });
  }, [consent]);

  if (!GA_ID || !loadScript) {
    return null;
  }

  return (
    <>
      <Script
        id="ga-loader"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        nonce={nonce}
      />
      <Script id="ga-config" strategy="afterInteractive" nonce={nonce}>
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'${consent === "granted" ? "granted" : "denied"}',wait_for_update:500});gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
