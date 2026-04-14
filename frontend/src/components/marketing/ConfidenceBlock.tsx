import { Eye, PenSquare, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { MarketingFeatureSection } from "./MarketingFeatureSection";

const confidenceCards = [
  { key: "structured", Icon: PenSquare },
  { key: "review", Icon: Eye },
  { key: "privacy", Icon: ShieldCheck },
] as const;

export function ConfidenceBlock() {
  const t = useTranslations("marketing");

  return (
    <MarketingFeatureSection
      eyebrow={t("homepage.confidence.eyebrow")}
      title={t("homepage.confidence.title")}
      intro={t("homepage.confidence.intro")}
      iconTone="emerald"
      muted
      items={confidenceCards.map(({ key, Icon }) => ({
        key,
        Icon,
        title: t(`homepage.confidence.cards.${key}.title`),
        body: t(`homepage.confidence.cards.${key}.body`),
      }))}
    />
  );
}
