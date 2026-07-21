import { useTranslations } from "next-intl";
import { EditorialHeader, MarketingSection } from "./primitives";
import { MarketingBody, MarketingHeading } from "./typography";

const cardKeys = ["structured", "review", "privacy"] as const;

export function ConfidenceBlock() {
  const t = useTranslations("marketing");

  return (
    <MarketingSection muted contentClassName="max-w-6xl">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
        <EditorialHeader
          eyebrow={t("homepage.confidence.eyebrow")}
          title={t("homepage.confidence.title")}
          intro={t("homepage.confidence.intro")}
          className="lg:sticky lg:top-28 lg:self-start"
        />

        <dl>
          {cardKeys.map((key) => (
            <div key={key} className="hairline border-t py-6 first:border-t-0 first:pt-0">
              <MarketingHeading
                as="dt"
                className="text-lg font-semibold tracking-[-0.02em] sm:text-xl"
              >
                {t(`homepage.confidence.cards.${key}.title`)}
              </MarketingHeading>
              <MarketingBody
                as="dd"
                className="mt-2 max-w-2xl text-sm leading-6 sm:text-base sm:leading-7"
              >
                {t(`homepage.confidence.cards.${key}.body`)}
              </MarketingBody>
            </div>
          ))}
        </dl>
      </div>
    </MarketingSection>
  );
}
