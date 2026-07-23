import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { AppProviders } from "../components/ui/AppProviders";
import { GoogleAnalytics } from "../components/analytics/GoogleAnalytics";
import { env } from "../lib/env";
import { getThemeInitScript } from "../lib/theme-script";
import { BRAND_NAME } from "../lib/brand";
import "./globals.css";

// Editorial type system: a serif for headings/leads, a humanist sans for body
// and UI, and a mono reserved for postal metadata (order refs, tracking, docket).
const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND_NAME} — Send formal letters via Swiss Post`,
  description:
    "Draft and send formal letters via Swiss Post — quickly, securely, and professionally.",
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  manifest: "/manifest.json",
  openGraph: {
    siteName: BRAND_NAME,
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: ["/opengraph-image"] },
  // Google Search Console verification (HTML-tag method; always present,
  // independent of analytics consent).
  verification: { google: "0-fl7n9_LBdxLlHbjN0r6m1a1oWCiLKxRR6ugsKqpdI" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang={locale}
      className={`${sans.variable} ${serif.variable} ${mono.variable}`}
      data-theme-ready="false"
      suppressHydrationWarning
    >
      <head>
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: getThemeInitScript() }}
        />
      </head>
      <body
        className="min-h-screen bg-[var(--app-bg)] font-sans text-[var(--app-fg)] antialiased transition-colors duration-300"
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
        <GoogleAnalytics nonce={nonce} />
      </body>
    </html>
  );
}
