import { Eye, PenSquare, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { MarketingIconToken } from "./MarketingIconToken";
import { MarketingCard, MarketingSection, SectionLabel } from "./primitives";

const confidenceCards = [
  { key: "structured", Icon: PenSquare },
  { key: "review", Icon: Eye },
  { key: "privacy", Icon: ShieldCheck },
] as const;

export function ConfidenceBlock() {
  const t = useTranslations("marketing");

  return (
    <MarketingSection muted contentClassName="max-w-6xl">
      <div className="mx-auto max-w-3xl text-center">
        <SectionLabel>{t("homepage.confidence.eyebrow")}</SectionLabel>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 sm:text-3xl md:text-4xl lg:text-5xl">
          {t("homepage.confidence.title")}
        </h2>
        <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base sm:leading-7">
          {t("homepage.confidence.intro")}
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        {confidenceCards.map(({ key, Icon }, index) => (
          <MarketingCard
            key={key}
            className="animate-rise-in rounded-3xl border border-[var(--app-border)] p-6"
            style={{ animationDelay: `${0.08 + index * 0.08}s` }}
            tone="soft"
          >
            <MarketingIconToken tone="accent">
              <Icon />
            </MarketingIconToken>
            <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
              {t(`homepage.confidence.cards.${key}.title`)}
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base sm:leading-7">
              {t(`homepage.confidence.cards.${key}.body`)}
            </p>
          </MarketingCard>
        ))}
      </div>
    </MarketingSection>
  );
}
