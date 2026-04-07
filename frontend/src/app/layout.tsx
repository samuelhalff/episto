import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { getLocale } from "next-intl/server";
import { AppProviders } from "../components/ui/AppProviders";
import { getThemeInitScript } from "../lib/theme-script";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Swiss Mail — Send formal letters via Swiss Post",
  description:
    "Draft and send formal letters via Swiss Post — quickly, securely, and professionally.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://swissmail.ch"),
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
      </head>
      <body
        className="min-h-screen bg-[var(--app-bg)] font-sans text-[var(--app-fg)] antialiased transition-colors duration-300"
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
