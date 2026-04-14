import { Ban, Building2, FileWarning, Home } from "lucide-react";
import { useTranslations } from "next-intl";
import { MarketingFeatureSection } from "./MarketingFeatureSection";

const useCases = [
  { key: "cancellation", Icon: Ban },
  { key: "lease", Icon: Home },
  { key: "complaint", Icon: FileWarning },
  { key: "authority", Icon: Building2 },
] as const;

export function UseCaseGrid() {
  const t = useTranslations("marketing");

  return (
    <MarketingFeatureSection
      eyebrow={t("homepage.useCases.eyebrow")}
      title={t("homepage.useCases.title")}
      intro={t("homepage.useCases.intro")}
      iconTone="amber"
      columns={2}
      items={useCases.map(({ key, Icon }) => ({
        key,
        Icon,
        title: t(`homepage.useCases.${key}.title`),
        body: t(`homepage.useCases.${key}.description`),
      }))}
    />
  );
}
