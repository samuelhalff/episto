import { FileText, MessageCircle, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { MarketingIconToken } from "./MarketingIconToken";
import { MarketingCard, MarketingSection, SectionLabel } from "./primitives";

const stepItems = [
  { key: "describe", Icon: MessageCircle },
  { key: "review", Icon: FileText },
  { key: "send", Icon: Send },
] as const;

export function HowItWorksSteps() {
  const t = useTranslations("marketing");

  return (
    <div id="how-it-works" className="scroll-mt-24">
      <MarketingSection contentClassName="max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <SectionLabel>{t("homepage.howItWorks.eyebrow")}</SectionLabel>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 sm:text-3xl md:text-4xl lg:text-5xl">
            {t("homepage.howItWorks.title")}
          </h2>
          <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base sm:leading-7">
            {t("homepage.howItWorks.intro")}
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {stepItems.map(({ key, Icon }, index) => {
            return (
              <MarketingCard
                key={key}
                className="animate-rise-in rounded-3xl border border-[var(--app-border)] p-6"
                style={{ animationDelay: `${0.08 + index * 0.08}s` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <MarketingIconToken tone="primary">
                    <Icon />
                  </MarketingIconToken>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
                  {t(`homepage.howItWorks.steps.${key}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base sm:leading-7">
                  {t(`homepage.howItWorks.steps.${key}.body`)}
                </p>
              </MarketingCard>
            );
          })}
        </div>
      </MarketingSection>
    </div>
  );
}
