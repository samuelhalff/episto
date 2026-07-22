import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { buildContentSecurityPolicy } from "./lib/csp";
import { routing } from "./i18n/routing";
import { LANDING_LOCALES, LANDING_SLUGS } from "./lib/landing-routes";

const handleI18nRouting = createMiddleware(routing);

const SITE_LOCALES = new Set<string>(routing.locales);
const LANDING_LOCALE_SET = new Set<string>(LANDING_LOCALES);
const LANDING_SLUG_SET = new Set<string>(LANDING_SLUGS);

/**
 * True when a locale-prefixed `/vorlagen` path does not correspond to a real
 * landing page. The [locale] tree renders dynamically (next-intl), so an
 * in-page `notFound()` returns HTTP 200 — a soft-404. We instead rewrite these
 * to a non-existent locale route, which the framework serves as a genuine 404
 * (verified: unknown routes under a valid locale already return 404).
 *
 * Only locale-prefixed paths are considered; bare `/vorlagen` is left to
 * next-intl to redirect to the locale first.
 */
function isUnknownVorlagenPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[1] !== "vorlagen") return false;

  const locale = segments[0] ?? "";
  if (!SITE_LOCALES.has(locale)) return false; // let i18n normalize the locale first
  if (!LANDING_LOCALE_SET.has(locale)) return true; // valid locale, but no landing pages (e.g. en-CH)
  if (segments.length === 2) return false; // /{locale}/vorlagen hub is valid
  if (segments.length === 3) return !LANDING_SLUG_SET.has(segments[2] ?? ""); // unknown slug
  return true; // nothing exists deeper than /{locale}/vorlagen/{slug}
}

export default function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const isDevelopment = process.env.NODE_ENV !== "production";
  const csp = buildContentSecurityPolicy(isDevelopment, nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  if (isUnknownVorlagenPath(request.nextUrl.pathname)) {
    const locale = request.nextUrl.pathname.split("/")[1];
    // A path that matches no route under the (valid) locale → real 404.
    const notFoundUrl = new URL(`/${locale}/__not-found__`, request.url);
    const rewrite = NextResponse.rewrite(notFoundUrl, {
      request: { headers: requestHeaders },
    });
    rewrite.headers.set("Content-Security-Policy", csp);
    return rewrite;
  }

  const response = handleI18nRouting(
    new NextRequest(request, {
      headers: requestHeaders,
    }),
  );
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export const config = {
  matcher: [
    {
      // `opengraph-image` is a root metadata route with no file extension, so
      // it must be excluded explicitly or next-intl redirects it to a localized
      // path that 404s (breaking the social share card).
      source: "/((?!api|_next|_vercel|opengraph-image|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
