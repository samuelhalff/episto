import { useTranslations } from "next-intl";
import { EditorialHeader, MarketingSection } from "./primitives";
import { MarketingBody, MarketingHeading } from "./typography";

const useCaseKeys = ["cancellation", "lease", "complaint", "authority"] as const;

export function UseCaseGrid() {
  const t = useTranslations("marketing");

  return (
    <MarketingSection contentClassName="max-w-6xl">
      <EditorialHeader
        eyebrow={t("homepage.useCases.eyebrow")}
        title={t("homepage.useCases.title")}
        intro={t("homepage.useCases.intro")}
      />

      <dl className="mt-12 grid gap-x-16 sm:grid-cols-2">
        {useCaseKeys.map((key) => (
          <div key={key} className="hairline border-t py-6">
            <MarketingHeading
              as="dt"
              className="text-lg font-semibold tracking-[-0.02em] sm:text-xl"
            >
              {t(`homepage.useCases.${key}.title`)}
            </MarketingHeading>
            <MarketingBody
              as="dd"
              className="mt-2 max-w-md text-sm leading-6 sm:text-[15px] sm:leading-7"
            >
              {t(`homepage.useCases.${key}.description`)}
            </MarketingBody>
          </div>
        ))}
      </dl>
    </MarketingSection>
  );
}
