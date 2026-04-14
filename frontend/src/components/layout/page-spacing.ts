export const MARKETING_SECTION_SPACING = {
  default: {
    base: "px-4 py-16 sm:px-6 sm:py-20 lg:py-24",
    trimTop: "px-4 pb-16 pt-0 sm:px-6 sm:pb-20 sm:pt-0 lg:pb-24 lg:pt-0",
    trimBottom: "px-4 pb-0 pt-16 sm:px-6 sm:pb-0 sm:pt-20 lg:pb-0 lg:pt-24",
    trimBoth: "px-4 py-0 sm:px-6 sm:py-0 lg:py-0",
  },
  compact: {
    base: "px-4 py-10 sm:px-6 sm:py-12 lg:py-16",
    trimTop: "px-4 pb-10 pt-0 sm:px-6 sm:pb-12 sm:pt-0 lg:pb-16 lg:pt-0",
    trimBottom: "px-4 pb-0 pt-10 sm:px-6 sm:pb-0 sm:pt-12 lg:pb-0 lg:pt-16",
    trimBoth: "px-4 py-0 sm:px-6 sm:py-0 lg:py-0",
  },
  tight: {
    base: "px-4 py-8 sm:px-6 sm:py-10 lg:py-12",
    trimTop: "px-4 pb-8 pt-0 sm:px-6 sm:pb-10 sm:pt-0 lg:pb-12 lg:pt-0",
    trimBottom: "px-4 pb-0 pt-8 sm:px-6 sm:pb-0 sm:pt-10 lg:pb-0 lg:pt-12",
    trimBoth: "px-4 py-0 sm:px-6 sm:py-0 lg:py-0",
  },
} as const;

export type MarketingSectionSpacing = keyof typeof MARKETING_SECTION_SPACING;

export function getMarketingSectionClassName({
  spacing = "default",
  trimTop = false,
  trimBottom = false,
}: {
  spacing?: MarketingSectionSpacing;
  trimTop?: boolean;
  trimBottom?: boolean;
}) {
  if (trimTop && trimBottom) {
    return MARKETING_SECTION_SPACING[spacing].trimBoth;
  }

  if (trimTop) {
    return MARKETING_SECTION_SPACING[spacing].trimTop;
  }

  if (trimBottom) {
    return MARKETING_SECTION_SPACING[spacing].trimBottom;
  }

  return MARKETING_SECTION_SPACING[spacing].base;
}

export const LEGAL_PAGE_MAIN_CLASS_NAME =
  "px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-12 lg:pb-24 lg:pt-16";

export const LEGAL_PAGE_ARTICLE_CLASS_NAME = "mx-auto max-w-3xl";

export const LEGAL_PAGE_HEADER_CLASS_NAME = "space-y-5 pb-8 sm:space-y-6 sm:pb-10";

export const LEGAL_PAGE_STACK_CLASS_NAME = "space-y-5 sm:space-y-6";

export const ADMIN_SHELL_MAIN_CLASS_NAME =
  "flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8";

export const ADMIN_PAGE_STACK_CLASS_NAME = "space-y-6 lg:space-y-8";

export const APP_PAGE_STACK_CLASS_NAME = "space-y-6 lg:space-y-8";

export const APP_WIDE_PAGE_SHELL_CLASS_NAME =
  "mx-auto max-w-7xl px-4 pt-8 sm:px-6 sm:pt-10 lg:pt-12";

export const STATUS_PAGE_SHELL_CLASS_NAME =
  "mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:py-12";

export const NARROW_APP_PAGE_SHELL_CLASS_NAME =
  "mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12";
