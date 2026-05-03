import type { PublicPricingResponse } from "@episto/shared";

export type PricingTier = PublicPricingResponse["standard"];
export type PricingSync = PublicPricingResponse["sync"];
export type PricingProvider = PublicPricingResponse["providerBreakdown"];
export type PricingExample = PricingProvider["pageCountExamples"]["standard"][number];
