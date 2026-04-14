export const HELP_FAQ_IDS = [
  "writing",
  "dispatchTiming",
  "tracking",
  "postHandoff",
  "paymentTiming",
  "refunds",
  "priceCoverage",
  "editingAfterCheckout",
  "attachments",
  "guestCheckout",
  "privacyRetention",
  "addressOrDeliveryIssues",
] as const;

export const PRICING_FAQ_IDS = [
  "paymentTiming",
  "priceCoverage",
  "dispatchTiming",
  "editingAfterCheckout",
] as const;

export interface MarketingFaqItem {
  id: (typeof HELP_FAQ_IDS)[number];
  question: string;
  answer: string;
}

export type Translate = (key: string) => string;

const HELP_FAQ_KEYS = {
  writing: { question: "faq1q", answer: "faq1a" },
  dispatchTiming: { question: "faq2q", answer: "faq2a" },
  tracking: { question: "faq3q", answer: "faq3a" },
  postHandoff: { question: "faq4q", answer: "faq4a" },
  paymentTiming: { question: "faq5q", answer: "faq5a" },
  refunds: { question: "faq6q", answer: "faq6a" },
  priceCoverage: { question: "faq7q", answer: "faq7a" },
  editingAfterCheckout: { question: "faq8q", answer: "faq8a" },
  attachments: { question: "faq9q", answer: "faq9a" },
  guestCheckout: { question: "faq10q", answer: "faq10a" },
  privacyRetention: { question: "faq11q", answer: "faq11a" },
  addressOrDeliveryIssues: { question: "faq12q", answer: "faq12a" },
} as const;

function buildFaqs(
  ids: readonly (typeof HELP_FAQ_IDS)[number][],
  t: Translate,
): MarketingFaqItem[] {
  return ids.map((id) => ({
    id,
    question: t(HELP_FAQ_KEYS[id].question),
    answer: t(HELP_FAQ_KEYS[id].answer),
  }));
}

export function buildHelpFaqs(t: Translate): MarketingFaqItem[] {
  return buildFaqs(HELP_FAQ_IDS, t);
}

export function buildPricingFaqs(t: Translate): MarketingFaqItem[] {
  return buildFaqs(PRICING_FAQ_IDS, t);
}
