import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "./lib/csp";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const isDevelopment = process.env.NODE_ENV !== "production";
  const csp = buildContentSecurityPolicy(isDevelopment, nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

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
      source: "/((?!api|_next|_vercel|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
