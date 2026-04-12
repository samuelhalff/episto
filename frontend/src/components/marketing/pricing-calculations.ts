import type { PricingExample } from "./pricing-types";
import { formatCentsAsCHF } from "@/hooks/use-pricing";

export function getExampleForPageCount(
  examples: PricingExample[],
  pageCount: number,
): PricingExample | undefined {
  return examples.find((e) => e.pageCount === pageCount);
}

export function getPageBounds(
  examples: PricingExample[],
): { min: number; max: number } | undefined {
  if (examples.length === 0) return undefined;
  const first = examples[0].pageCount;
  const last = examples[examples.length - 1].pageCount;
  return { min: first, max: last };
}

export function getPerPageIncrementDisplayPrice(
  examples: PricingExample[],
): string | undefined {
  if (examples.length < 2) return undefined;

  const increments = examples.slice(1).map((example, index) => {
    const previous = examples[index];
    if (!previous || example.pageCount !== previous.pageCount + 1) return null;
    return example.totalCents - previous.totalCents;
  });

  const firstIncrement = increments[0];
  if (firstIncrement === null || firstIncrement === undefined || firstIncrement <= 0) {
    return undefined;
  }

  if (!increments.every((inc) => inc === firstIncrement)) return undefined;

  return `+${formatCentsAsCHF(firstIncrement)}`;
}
