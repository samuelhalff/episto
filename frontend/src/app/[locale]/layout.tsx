import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "../../i18n/routing.js";
import { Toaster } from "sonner";
import { QueryProvider } from "../../lib/query-client.js";
import { ThemeProvider } from "../../lib/theme.js";
import { getThemeInitScript } from "../../lib/theme-script.js";
import "../globals.css";

export const metadata: Metadata = {
  title: "Swiss Mail — Send formal letters via Swiss Post",
  description:
    "Draft and send formal letters via Swiss Post — quickly, securely, and professionally.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://ark-fid.ddns.net"),
  manifest: "/manifest.json",
  // PWA icons: add /icon-192.png and /icon-512.png to frontend/public/ before launch
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: getThemeInitScript() }} />
      </head>
      <body
        className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] antialiased transition-colors duration-300"
        suppressHydrationWarning
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-secondary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          {t("skipToContent")}
        </a>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <QueryProvider>
              <Toaster
                position="top-center"
                toastOptions={{
                  className:
                    "!rounded-2xl !border !border-stone-200/80 !bg-white !text-stone-800 !shadow-lg dark:!border-zinc-700 dark:!bg-zinc-900 dark:!text-zinc-100",
                }}
              />
              {children}
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
