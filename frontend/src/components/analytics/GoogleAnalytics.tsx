"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { getAnalyticsConsent, subscribeConsent } from "../../lib/consent";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Loads Google Analytics 4 — but only after the visitor has explicitly granted
 * analytics consent, and only when a measurement ID is configured. Nothing is
 * sent to Google before opt-in. The nonce (from the per-request CSP) is passed
 * through so the inline config script is allowed by the policy.
 */
export function GoogleAnalytics({ nonce }: { nonce?: string | undefined }) {
  const consent = useSyncExternalStore(subscribeConsent, getAnalyticsConsent, () => null);

  if (!GA_ID || consent !== "granted") {
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
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'granted'});gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
