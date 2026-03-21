import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "../../i18n/routing.js";
import { QueryProvider } from "../../lib/query-client.js";
import "../globals.css";

export const metadata: Metadata = {
  title: "Swiss Mail — Send formal letters via Swiss Post",
  description:
    "Draft and send formal letters via Swiss Post — quickly, securely, and professionally.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://ark-fid.ddns.net"),
  manifest: "/manifest.json",
  // PWA icons: add /icon-192.png and /icon-512.png to frontend/public/ before launch
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();
  const t = await getTranslations("common");

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-white text-gray-900 antialiased" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-secondary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
