import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "../../i18n/routing";
import { SPECIMEN_COPY } from "./LetterSpecimen";
import { EditorialHeader, MarketingSection } from "./primitives";
import { MarketingBody, MarketingHeading } from "./typography";

const useCaseKeys = ["cancellation", "lease", "complaint", "authority"] as const;

export function UseCaseGrid() {
  const t = useTranslations("marketing");
  const locale = useLocale() as Locale;
  const subjectLabel = (SPECIMEN_COPY[locale] ?? SPECIMEN_COPY["de-CH"]).subjectLabel;
  const [featured, ...rest] = useCaseKeys;

  return (
    <MarketingSection contentClassName="max-w-6xl">
      <EditorialHeader
        eyebrow={t("homepage.useCases.eyebrow")}
        title={t("homepage.useCases.title")}
        intro={t("homepage.useCases.intro")}
      />

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* Featured case, framed as a flat letter document */}
        <div className="rounded-sm border border-[var(--app-border)] bg-white p-7 text-zinc-800 shadow-[0_1px_2px_rgba(22,22,22,0.06)] sm:p-9">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--app-muted)]">
            {subjectLabel}
          </p>
          <h3 className="mt-4 font-serif text-xl font-semibold text-zinc-900">
            {t(`homepage.useCases.${featured}.title`)}
          </h3>
          <MarketingBody className="mt-4 font-serif text-[15px] leading-7 text-zinc-700">
            {t(`homepage.useCases.${featured}.description`)}
          </MarketingBody>
          <p className="mt-8 font-serif text-[15px] text-zinc-900">
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
