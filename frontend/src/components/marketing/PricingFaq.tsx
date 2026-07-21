"use client";

import { Check, ChevronDown, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MarketingFaqItem } from "./faq-content";
import { MarketingActionLink, MarketingSection } from "./primitives";
import { MarketingBody, MarketingHeading } from "./typography";

function LedgerColumn({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: "included" | "excluded";
}) {
  const Icon = variant === "included" ? Check : Minus;
  const iconClass =
    variant === "included"
      ? "text-amber-600 dark:text-amber-400"
      : "text-[var(--app-muted)]";

  return (
    <div>
      <MarketingHeading
        as="h3"
        className="text-lg font-semibold tracking-[-0.02em] sm:text-xl"
      >
        {title}
      </MarketingHeading>
      <ul className="mt-5">
        {items.map((item) => (
          <li
            key={item}
            className="hairline flex items-start gap-3 border-t py-3 first:border-t-0 first:pt-0"
          >
            <Icon
              aria-hidden="true"
              className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`}
              strokeWidth={2}
            />
            <MarketingBody className="text-sm leading-6">{item}</MarketingBody>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PricingFaqSection({ pricingFaqs }: { pricingFaqs: MarketingFaqItem[] }) {
  const t = useTranslations("pricing");

  return (
    <>
      <MarketingSection>
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <LedgerColumn
            title={t("includedCardTitle")}
            variant="included"
            items={[
              t("includedDrafting"),
              t("includedFormatting"),
              t("includedRendering"),
              t("includedDispatch"),
            ]}
          />
          <LedgerColumn
            title={t("excludedCardTitle")}
            variant="excluded"
            items={[
              t("excludedLegalReview"),
              t("excludedGuaranteedOutcome"),
              t("excludedTranslation"),
              t("excludedDesign"),
            ]}
          />
        </div>
      </MarketingSection>

      <MarketingSection muted>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <MarketingHeading
              as="h2"
              className="text-2xl font-semibold tracking-[-0.04em] sm:text-3xl md:text-4xl"
            >
              {t("faqTitle")}
            </MarketingHeading>
          </div>

          <div>
            <div>
              {pricingFaqs.map((faq) => (
                <details
                  key={faq.id}
                  className="hairline group border-t py-4 first:border-t-0 first:pt-0"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                    <MarketingHeading
                      as="h3"
                      className="text-base font-semibold tracking-[-0.01em]"
                    >
                      {faq.question}
                    </MarketingHeading>
                    <ChevronDown
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-[var(--app-muted)] transition-transform duration-200 group-open:rotate-180"
                    />
                  </summary>
                  <MarketingBody className="mt-3 max-w-2xl text-sm leading-7">
                    {faq.answer}
                  </MarketingBody>
                </details>
              ))}
            </div>

            <div className="hairline mt-8 flex flex-col gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <MarketingHeading
                  as="h3"
                  className="text-lg font-semibold tracking-[-0.02em]"
                >
                  {t("faqMoreTitle")}
                </MarketingHeading>
                <MarketingBody className="mt-1.5 text-sm leading-6">
                  {t("faqMoreBody")}
                </MarketingBody>
              </div>
              <MarketingActionLink
                href="/help"
                variant="heroSecondary"
                className="w-full shrink-0 sm:w-auto"
              >
                {t("faqMoreCta")}
              </MarketingActionLink>
            </div>
          </div>
        </div>
      </MarketingSection>
    </>
  );
}
