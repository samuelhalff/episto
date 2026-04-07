import { Ban, Building2, FileWarning, Home } from "lucide-react";
import { useTranslations } from "next-intl";
import { MarketingIconToken } from "./MarketingIconToken";
import { MarketingCard, MarketingSection, SectionLabel } from "./primitives";

const useCases = [
  { key: "cancellation", Icon: Ban },
  { key: "lease", Icon: Home },
  { key: "complaint", Icon: FileWarning },
  { key: "authority", Icon: Building2 },
] as const;

export function UseCaseGrid() {
  const t = useTranslations("marketing");

  return (
    <MarketingSection contentClassName="max-w-6xl">
      <div className="mx-auto max-w-3xl text-center">
        <SectionLabel>{t("homepage.useCases.eyebrow")}</SectionLabel>
        <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 sm:text-3xl md:text-4xl lg:text-5xl">
          {t("homepage.useCases.title")}
        </h2>
        <p className="mt-4 text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base sm:leading-7">
          {t("homepage.useCases.intro")}
        </p>
      </div>
      <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2 sm:gap-5">
        {useCases.map(({ key, Icon }, index) => (
          <MarketingCard
            key={key}
            className="animate-rise-in rounded-3xl border border-[var(--app-border)] p-6 transition-transform duration-200 hover:-translate-y-1"
            style={{ animationDelay: `${0.08 + index * 0.08}s` }}
          >
            <MarketingIconToken tone="accent">
              <Icon />
            </MarketingIconToken>
            <h3 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50">
              {t(`homepage.useCases.${key}.title`)}
            </h3>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300 sm:text-base sm:leading-7">
              {t(`homepage.useCases.${key}.description`)}
            </p>
          </MarketingCard>
        ))}
      </div>
    </MarketingSection>
  );
}
