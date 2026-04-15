import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { buildContentSecurityPolicy } from "./lib/csp";

/**
 * Per-request Content Security Policy with a fresh nonce.
 *
 * The nonce is:
 *   1. Set on the forwarded request headers as `x-nonce`, so Next.js
 *      automatically applies it to the scripts it injects (hydration runtime,
 *      `<Script>`, etc.) and so Server Components can read it via `headers()`.
 *   2. Embedded in the response `Content-Security-Policy` header.
 *
 * Reference: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
 */
export function middleware(request: NextRequest): NextResponse {
  const nonce = generateNonce();
  const isDevelopment = process.env.NODE_ENV !== "production";
  const csp = buildContentSecurityPolicy(isDevelopment, nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Convert to base64 without Node `Buffer` (middleware runs on Edge runtime).
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export const config = {
  matcher: [
    // Apply to every HTML route; skip static assets and Next internals.
    // Also skip prefetches so we don't burn nonces on requests that never
    // produce a rendered HTML shell.
    {
      source: "/((?!_next/static|_next/image|favicon.ico|manifest.json).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
