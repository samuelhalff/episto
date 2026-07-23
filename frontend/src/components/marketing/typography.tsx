import React, {
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";

function cx(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

type MarketingTextProps<T extends ElementType, Tone extends string> = {
  as?: T;
  tone?: Tone;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

const MARKETING_HEADING_TONE_CLASS_NAMES = {
  default: "text-zinc-950 dark:text-zinc-50",
  accent: "text-zinc-950",
  hero: "text-zinc-950 dark:text-white",
  inverse: "text-white",
} as const;

export type MarketingHeadingTone = keyof typeof MARKETING_HEADING_TONE_CLASS_NAMES;

export function getMarketingHeadingToneClassName(tone: MarketingHeadingTone) {
  return MARKETING_HEADING_TONE_CLASS_NAMES[tone];
}

export function MarketingHeading<T extends ElementType = "h2">({
  as,
  tone = "default",
  className,
  children,
  ...props
}: MarketingTextProps<T, MarketingHeadingTone>) {
  const Component = (as ?? "h2") as ElementType;

  return (
    <Component
      {...props}
      className={cx("font-serif", getMarketingHeadingToneClassName(tone), className)}
    >
      {children}
    </Component>
  );
}

const MARKETING_BODY_TONE_CLASS_NAMES = {
  default: "text-zinc-600 dark:text-zinc-300",
  soft: "text-zinc-600 dark:text-zinc-400",
  strong: "text-zinc-700 dark:text-zinc-200",
  label: "text-zinc-700 dark:text-zinc-300",
  muted: "text-zinc-500 dark:text-zinc-400",
  emphasis: "text-zinc-900 dark:text-zinc-100",
  accentMuted: "text-zinc-800/80",
  contrast: "text-white dark:text-zinc-950",
  hero: "text-zinc-700 dark:text-white/80",
  inverse: "text-white/80",
  inverseMuted: "text-white/70",
  inherit: "text-inherit",
} as const;

export type MarketingBodyTone = keyof typeof MARKETING_BODY_TONE_CLASS_NAMES;

export function getMarketingBodyToneClassName(tone: MarketingBodyTone) {
  return MARKETING_BODY_TONE_CLASS_NAMES[tone];
}

export function MarketingBody<T extends ElementType = "p">({
  as,
  tone = "default",
  className,
  children,
  ...props
}: MarketingTextProps<T, MarketingBodyTone>) {
  const Component = (as ?? "p") as ElementType;

  return (
    <Component {...props} className={cx(getMarketingBodyToneClassName(tone), className)}>
      {children}
    </Component>
  );
}

const MARKETING_META_TONE_CLASS_NAMES = {
  default: "text-zinc-400 dark:text-zinc-500",
  muted: "text-zinc-500 dark:text-zinc-400",
  accent: "text-zinc-500 dark:text-amber-200/80",
  hero: "text-zinc-600 dark:text-white/70",
  inverse: "text-white/70",
  inherit: "text-inherit",
} as const;

export type MarketingMetaTone = keyof typeof MARKETING_META_TONE_CLASS_NAMES;

export function getMarketingMetaToneClassName(tone: MarketingMetaTone) {
  return MARKETING_META_TONE_CLASS_NAMES[tone];
}

export function MarketingMeta<T extends ElementType = "p">({
  as,
  tone = "default",
  className,
  children,
  ...props
}: MarketingTextProps<T, MarketingMetaTone>) {
  const Component = (as ?? "p") as ElementType;

  return (
    <Component {...props} className={cx(getMarketingMetaToneClassName(tone), className)}>
      {children}
    </Component>
  );
}
