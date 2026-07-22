"use client";

import Script from "next/script";
import { useEffect } from "react";
import { useSyncExternalStore } from "react";
import { getAnalyticsConsent, subscribeConsent } from "../../lib/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Loads Google Analytics 4 using Consent Mode v2.
 *
 * The gtag script is always present when a measurement ID is configured (so GA
 * detects the tag and reports the stream as "active"), but consent defaults to
 * DENIED: no analytics/ad cookies are set and no personal data is collected
 * until the visitor explicitly opts in via the consent banner. On opt-in we
 * push a `consent update` that flips analytics_storage to "granted".
 *
 * The nonce (from the per-request CSP) is passed through so the inline config
 * script is allowed by the policy.
 */
export function GoogleAnalytics({ nonce }: { nonce?: string | undefined }) {
  const consent = useSyncExternalStore(subscribeConsent, getAnalyticsConsent, () => null);

  useEffect(() => {
    if (!GA_ID || typeof window === "undefined") return;
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag !== "function") return;
    gtag("consent", "update", {
      analytics_storage: consent === "granted" ? "granted" : "denied",
    });
  }, [consent]);

  if (!GA_ID) {
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
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
