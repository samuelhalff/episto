import { useLocale, useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link } from "../../i18n/navigation";
import { isLandingLocale, LANDING_UI } from "../../lib/landing-content";
import { FeedbackTrigger } from "../feedback/FeedbackTrigger";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { MarketingMeta } from "./typography";

export function Footer() {
  const t = useTranslations("marketing");
  const locale = useLocale();

  return (
    <footer
      role="contentinfo"
      data-theme-chrome="marketing"
      className="border-t border-zinc-100 bg-[var(--app-surface-muted)] transition-colors dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <MarketingMeta
            as="nav"
            aria-label="Footer navigation"
            tone="muted"
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm"
          >
            <Link
              href="/help"
              className="transition-colors hover:text-zinc-950 dark:hover:text-white"
            >
              {t("footer.help")}
            </Link>
            {/* Landing pages exist in de/fr/it-CH; link only where they exist. */}
            {isLandingLocale(locale) ? (
              <Link
                href="/vorlagen"
                className="transition-colors hover:text-zinc-950 dark:hover:text-white"
              >
                {LANDING_UI[locale].breadcrumbHub}
              </Link>
            ) : null}
            <Link
              href="/privacy"
              className="transition-colors hover:text-zinc-950 dark:hover:text-white"
            >
              {t("footer.privacy")}
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-zinc-950 dark:hover:text-white"
            >
              {t("footer.terms")}
            </Link>
            <Link
              href="/imprint"
              className="transition-colors hover:text-zinc-950 dark:hover:text-white"
            >
              {t("footer.imprint")}
            </Link>
            {/* "Feedback" is an identical loanword across de/fr/it/en-CH. */}
            <FeedbackTrigger className="text-left transition-colors hover:text-zinc-950 dark:hover:text-white">
              Feedback
            </FeedbackTrigger>
          </MarketingMeta>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <ThemeToggle className="w-full justify-between sm:w-auto" />
            <Suspense
              fallback={
                <div
                  aria-hidden="true"
                  className="min-h-12 w-full sm:min-w-[10.5rem] sm:w-auto"
                />
              }
            >
              <LanguageSwitcher variant="menu" className="w-full sm:w-auto" />
            </Suspense>
          </div>
        </div>

        <MarketingMeta className="text-center text-sm md:text-left">
          {t("footer.copyright")}
        </MarketingMeta>
      </div>
    </footer>
  );
}
