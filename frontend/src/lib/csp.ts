/**
 * Content Security Policy and Permissions Policy builders.
 *
 * Values are locked in docs/07-operations/security-and-privacy.md §Security headers.
 * The CSP is set per-request from `src/proxy.ts` so that a fresh nonce can be
 * attached to `script-src` on every HTML response. The same `buildContentSecurityPolicy`
 * helper is imported by tests and by `next.config.ts`.
 */

export type CspOptions = {
  isDevelopment: boolean;
  /** Per-request nonce. When provided, `script-src` drops `'unsafe-inline'`. */
  nonce?: string;
};

// Exported so proxy and next.config.ts read the same env vars.
function getApiConnectOrigin(): string | null {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl || apiUrl.startsWith("/")) return null;
  try {
    return new URL(apiUrl).origin;
  } catch {
    return null;
  }
}

function getSentryConnectOrigin(): string | null {
  const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!sentryDsn) return null;
  try {
    return new URL(sentryDsn).origin;
  } catch {
    return null;
  }
}

export function buildContentSecurityPolicy(
  isDevelopment: boolean,
  nonce?: string,
): string {
  // When a nonce is available, Next.js-generated scripts and our own inline
  // scripts reference it via the `nonce` attribute; `'unsafe-inline'` is
  // dropped. When no nonce is provided (e.g. as a fallback for routes that
  // bypass proxy), we fall back to `'unsafe-inline'` so the app keeps
  // working — proxy always provides a nonce in normal operation.
  // Google Analytics domains are only permitted when a measurement ID is
  // configured, so non-GA builds keep the tightest possible policy. GA still
  // only loads after explicit analytics consent (see GoogleAnalytics.tsx).
  const gaEnabled = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);

  const scriptSrcParts = [
    "script-src 'self'",
    nonce ? `'nonce-${nonce}'` : "'unsafe-inline'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    "https://js.stripe.com",
    ...(gaEnabled ? ["https://www.googletagmanager.com"] : []),
  ];
  const scriptSrc = scriptSrcParts.join(" ");

  const connectSrc = [
    "connect-src 'self' https://api.stripe.com ws: wss:",
    getApiConnectOrigin(),
    getSentryConnectOrigin(),
    ...(gaEnabled
      ? [
          "https://www.googletagmanager.com",
          "https://www.google-analytics.com",
          "https://*.google-analytics.com",
          "https://*.analytics.google.com",
        ]
      : []),
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    scriptSrc,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    connectSrc,
    "img-src 'self' data: https:",
    // `style-src 'unsafe-inline'` is retained intentionally: React inline
    // styles and styled-jsx generate inline <style> tags at hydration time.
    // Removing this would require a comprehensive migration to CSS Modules.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function buildPermissionsPolicy(): string {
  return "camera=(), microphone=(self), geolocation=()";
}
