import { ArrowRight, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "../../i18n/routing";
import { HeroPrice } from "./HeroPrice";
import { LetterSpecimen } from "./LetterSpecimen";
import { MarketingActionLink } from "./primitives";
import { MarketingBody, MarketingHeading } from "./typography";

export function HomepageHero({ initialPrice }: { initialPrice?: string | undefined }) {
  const t = useTranslations("marketing");
  const locale = useLocale() as Locale;

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16 lg:pb-24 lg:pt-20">
        <div className="relative z-10 max-w-xl">
          <p className="section-label">{t("homepage.hero.badge")}</p>
          <MarketingHeading
            as="h1"
            tone="hero"
            className="mt-5 text-4xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-5xl md:text-6xl lg:text-[4.25rem]"
          >
            {t("homepage.hero.title")}
          </MarketingHeading>
          <MarketingBody
            tone="hero"
            className="mt-5 max-w-lg text-base leading-7 md:text-lg md:leading-8"
          >
            {t("homepage.hero.subtitle")}
          </MarketingBody>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <MarketingActionLink
              href="/draft/new"
              className="w-full sm:w-auto sm:px-7 sm:py-4 sm:text-base"
            >
              {t("homepage.hero.primaryCta")}
              <ArrowRight className="h-4 w-4" />
            </MarketingActionLink>
            <MarketingActionLink
              href="#how-it-works"
              variant="heroSecondary"
              className="w-full sm:w-auto sm:px-7 sm:py-4 sm:text-base"
            >
              {t("homepage.hero.secondaryCta")}
            </MarketingActionLink>
          </div>
          <HeroPrice initialPrice={initialPrice} />
          <ul className="hairline mt-9 flex flex-col gap-2.5 border-t pt-5 sm:flex-row sm:flex-wrap sm:gap-x-5">
            {(["noAccount", "exactTotal", "privacy"] as const).map((key) => (
              <li key={key} className="flex items-center gap-2">
                <Check
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-[var(--action-primary-bg)]"
                  strokeWidth={2.5}
                />
                <MarketingBody className="text-sm">
                  {t(`homepage.hero.proof.${key}`)}
                </MarketingBody>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <LetterSpecimen locale={locale} />
        </div>
      </div>
    </section>
  );
}
