import { useTranslations } from "next-intl";
import { EditorialHeader, MarketingSection } from "./primitives";
import { MarketingBody, MarketingHeading } from "./typography";

// The mailing is the moat: anyone can draft a letter; episto submits it to Swiss
// Post, which prints and delivers it in Switzerland. This strip shows that journey.
const stepKeys = ["draft", "printed", "sent", "delivered"] as const;

export function DispatchJourney() {
  const t = useTranslations("marketing");

  return (
    <MarketingSection contentClassName="max-w-6xl">
      <EditorialHeader
        eyebrow={t("homepage.journey.eyebrow")}
        title={t("homepage.journey.title")}
        intro={t("homepage.journey.intro")}
      />

      <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {stepKeys.map((key, index) => (
          <li key={key} className="hairline border-t-2 border-[var(--app-fg)] pt-4">
            <span
              aria-hidden="true"
              className="numeral font-serif text-3xl font-normal leading-none text-[var(--app-fg)] sm:text-4xl"
            >
              {index + 1}
            </span>
            <MarketingHeading
              as="h3"
              className="mt-3 text-base font-semibold tracking-[-0.01em] sm:text-lg"
            >
              {t(`homepage.journey.steps.${key}.title`)}
            </MarketingHeading>
            <MarketingBody className="mt-1.5 text-sm leading-6">
              {t(`homepage.journey.steps.${key}.body`)}
            </MarketingBody>
          </li>
        ))}
      </ol>
    </MarketingSection>
  );
}
