import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "../../i18n/routing";
import { SPECIMEN_COPY } from "./LetterSpecimen";
import { EditorialHeader, MarketingSection } from "./primitives";
import { MarketingBody, MarketingHeading } from "./typography";

const useCaseKeys = ["cancellation", "lease", "complaint", "authority"] as const;

export function UseCaseGrid() {
  const t = useTranslations("marketing");
  const locale = useLocale() as Locale;
  const betreff = (SPECIMEN_COPY[locale] ?? SPECIMEN_COPY["de-CH"]).betreff;
  const [featured, ...rest] = useCaseKeys;

  return (
    <MarketingSection contentClassName="max-w-6xl">
      <EditorialHeader
        eyebrow={t("homepage.useCases.eyebrow")}
        title={t("homepage.useCases.title")}
        intro={t("homepage.useCases.intro")}
      />

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* Featured case, framed as a letter subject */}
        <div className="letter-sheet rounded-[1.5rem] p-7 sm:p-9">
          <p className="section-label">{t("homepage.useCases.eyebrow")}</p>
          <h3 className="mt-4 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            <span className="text-zinc-500 dark:text-zinc-400">{betreff}: </span>
            {t(`homepage.useCases.${featured}.title`)}
          </h3>
          <MarketingBody className="mt-4 text-sm leading-6 sm:text-base sm:leading-7">
            {t(`homepage.useCases.${featured}.description`)}
          </MarketingBody>
          <p
            aria-hidden="true"
            className="signature-script mt-8 text-2xl text-zinc-700 dark:text-amber-100/80"
          >
            {(SPECIMEN_COPY[locale] ?? SPECIMEN_COPY["de-CH"]).signatory}
          </p>
        </div>

        {/* The remaining cases as a ruled index */}
        <ul>
          {rest.map((key) => (
            <li key={key} className="hairline border-t py-5 first:border-t-0 first:pt-0">
              <MarketingHeading
                as="h3"
                className="text-lg font-semibold tracking-[-0.02em]"
              >
                {t(`homepage.useCases.${key}.title`)}
              </MarketingHeading>
              <MarketingBody className="mt-1.5 text-sm leading-6 sm:text-[15px]">
                {t(`homepage.useCases.${key}.description`)}
              </MarketingBody>
            </li>
          ))}
        </ul>
      </div>
    </MarketingSection>
  );
}
