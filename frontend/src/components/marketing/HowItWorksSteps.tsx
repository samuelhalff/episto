import { FileText, MessageCircle, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { MarketingFeatureSection } from "./MarketingFeatureSection";

const stepItems = [
  { key: "describe", Icon: MessageCircle },
  { key: "review", Icon: FileText },
  { key: "send", Icon: Send },
] as const;

export function HowItWorksSteps() {
  const t = useTranslations("marketing");

  return (
    <div id="how-it-works" className="scroll-mt-24">
      <MarketingFeatureSection
        eyebrow={t("homepage.howItWorks.eyebrow")}
        title={t("homepage.howItWorks.title")}
        intro={t("homepage.howItWorks.intro")}
        iconTone="sky"
        items={stepItems.map(({ key, Icon }) => ({
          key,
          Icon,
          title: t(`homepage.howItWorks.steps.${key}.title`),
          body: t(`homepage.howItWorks.steps.${key}.body`),
        }))}
      />
    </div>
  );
}
