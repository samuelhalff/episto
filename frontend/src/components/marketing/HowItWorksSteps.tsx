import { useTranslations } from "next-intl";
import { EditorialHeader, MarketingSection } from "./primitives";
import { MarketingBody, MarketingHeading } from "./typography";

const stepKeys = ["describe", "review", "send"] as const;

export function HowItWorksSteps() {
  const t = useTranslations("marketing");

  return (
    <MarketingSection contentClassName="max-w-6xl">
      <div
        id="how-it-works"
        className="grid scroll-mt-24 gap-10 lg:grid-cols-[minmax(0,18rem)_1fr] lg:gap-16"
      >
        <EditorialHeader
          eyebrow={t("homepage.howItWorks.eyebrow")}
          title={t("homepage.howItWorks.title")}
          intro={t("homepage.howItWorks.intro")}
          className="lg:sticky lg:top-28 lg:self-start"
        />

        <ol className="relative">
          {stepKeys.map((key, index) => (
            <li
              key={key}
              className="grid grid-cols-[auto_1fr] items-baseline gap-x-5 border-t-2 border-[var(--app-fg)] py-6 sm:gap-x-7"
            >
              <span className="numeral text-3xl font-semibold text-[var(--app-fg)] sm:text-4xl">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <MarketingHeading
                  as="h3"
                  className="text-lg font-semibold tracking-[-0.02em] sm:text-xl"
                >
                  {t(`homepage.howItWorks.steps.${key}.title`)}
                </MarketingHeading>
                <MarketingBody className="mt-2 text-sm leading-6 sm:text-base sm:leading-7">
                  {t(`homepage.howItWorks.steps.${key}.body`)}
                </MarketingBody>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </MarketingSection>
  );
}
