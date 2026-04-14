import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { MarketingIconTone } from "./MarketingIconToken";
import {
  MarketingFeatureCard,
  MarketingSection,
  SectionGrid,
  SectionHeader,
} from "./primitives";

interface MarketingFeatureSectionItem {
  key: string;
  Icon: LucideIcon;
  title: ReactNode;
  body: ReactNode;
}

export function MarketingFeatureSection({
  eyebrow,
  title,
  intro,
  items,
  iconTone,
  columns = 3,
  muted = false,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  intro: ReactNode;
  items: ReadonlyArray<MarketingFeatureSectionItem>;
  iconTone: MarketingIconTone;
  columns?: 2 | 3;
  muted?: boolean;
}) {
  return (
    <MarketingSection muted={muted} contentClassName="max-w-6xl">
      <SectionHeader eyebrow={eyebrow} title={title} intro={intro} />
      <SectionGrid columns={columns} className="auto-rows-fr">
        {items.map(({ key, Icon, title: itemTitle, body }, index) => {
          const style: CSSProperties = {
            animationDelay: `${0.08 + index * 0.08}s`,
          };

          return (
            <MarketingFeatureCard
              key={key}
              icon={<Icon strokeWidth={1.6} />}
              title={itemTitle}
              body={body}
              tone={iconTone}
              className="min-h-full transition-transform duration-200 hover:-translate-y-0.5"
              titleClassName="sm:text-xl"
              style={style}
            />
          );
        })}
      </SectionGrid>
    </MarketingSection>
  );
}
