"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { routing } from "../i18n/routing";
import { BRAND_NAME } from "../lib/brand";

type SupportedLocale = (typeof routing.locales)[number];

const COPY: Record<
  SupportedLocale,
  { title: string; description: string; primary: string; secondary: string }
> = {
  "de-CH": {
    title: "Seite nicht gefunden",
    description:
      "Die geöffnete Seite ist nicht mehr verfügbar. Sie können einen neuen Brief starten oder zur Startseite zurückkehren.",
    primary: "Neuen Brief starten",
    secondary: "Zurück zur Startseite",
  },
  "fr-CH": {
    title: "Page non trouvée",
    description:
      "La page que vous avez ouverte n'est plus disponible. Vous pouvez commencer une nouvelle lettre ou revenir à l'accueil.",
    primary: "Commencer une nouvelle lettre",
    secondary: "Retour à l'accueil",
  },
  "it-CH": {
    title: "Pagina non trovata",
    description:
      "La pagina che hai aperto non è più disponibile. Puoi iniziare una nuova lettera oppure tornare alla home.",
    primary: "Inizia una nuova lettera",
    secondary: "Torna alla home",
  },
  "en-CH": {
    title: "Page not found",
    description:
      "The page you opened is no longer available. You can start a new letter or go back home.",
    primary: "Start new letter",
    secondary: "Back to home",
  },
} as const;

function resolveLocale(pathname: string): SupportedLocale {
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return routing.locales.includes(firstSegment as SupportedLocale)
    ? (firstSegment as SupportedLocale)
    : routing.defaultLocale;
}

export default function RootNotFound() {
  const pathname = usePathname();
  const locale = resolveLocale(pathname);
  const copy = COPY[locale];
  const localeBase = `/${locale}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--app-surface-muted)] px-6 py-10 dark:bg-zinc-950">
      <div className="w-full max-w-xl rounded-4xl border border-zinc-200/80 bg-white/95 p-8 text-center shadow-prominent-warm dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-prominent">
        <div className="mx-auto flex max-w-md flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            <span className="text-zinc-600 dark:text-zinc-300">
              <AlertCircle className="h-5 w-5" />
            </span>
            <span>404</span>
          </div>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
            {BRAND_NAME}
          </p>

          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50">
            {copy.title}
          </h1>

          <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {copy.description}
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
            <Link
              href={`${localeBase}/draft/new`}
              className="cta-sheen inline-flex flex-1 items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            >
              {copy.primary}
            </Link>

            <Link
              href={localeBase}
              className="inline-flex flex-1 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              {copy.secondary}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
