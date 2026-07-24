import { useTranslations } from "next-intl";
import { EditorialHeader, MarketingSection } from "./primitives";
import { MarketingBody, MarketingHeading } from "./typography";

// The mailing is the moat: anyone can draft a letter, only Episto prints it in
// Switzerland and hands it to Swiss Post. This strip shows that physical journey.
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
            <span className="numeral font-mono text-sm text-[var(--app-muted)]">
              {String(index + 1).padStart(2, "0")}
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
