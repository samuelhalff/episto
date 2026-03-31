import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Header } from "../../../components/marketing/Header";
import { Footer } from "../../../components/marketing/Footer";
import { MarketingHero } from "../../../components/marketing/MarketingHero";

export default function PricingPage() {
  const t = useTranslations("pricing");
  const tm = useTranslations("marketing");

  const rows = [
    { label: t("basePriceLabel"), price: t("basePrice") },
    { label: t("additionalPageLabel"), price: t("additionalPagePrice") },
    { label: t("attachmentLabel"), price: t("attachmentPrice") },
    { label: t("standardLabel"), price: t("standardPrice") },
    { label: t("registeredLabel"), price: t("registeredPrice"), highlight: true },
  ];

  return (
    <>
      <Header />
      <main id="main-content">
        <MarketingHero
          eyebrow={t("noHiddenFees")}
          title={t("title")}
          subtitle={t("subtitle")}
          primaryAction={{ href: "/draft/new", label: t("cta") }}
          secondaryAction={{ href: "/help", label: tm("nav.help") }}
          panel={
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-amber-700 shadow-sm">
                <Check className="h-4 w-4" />
                {t("noHiddenFees")}
              </div>
              <p className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-zinc-950 dark:text-zinc-50 md:text-5xl">
                {tm("pricingFrom")}
              </p>
              <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-300">{tm("pricingNotes")}</p>
              <div className="mt-8 space-y-3">
                {rows.map((row) => (
                  <PricingInlineRow
                    key={row.label}
                    label={row.label}
                    price={row.price}
                    {...(row.highlight ? { highlight: true } : {})}
                  />
                ))}
              </div>
            </div>
          }
        />

        <section className="px-6 pb-10 md:pb-14">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[2.5rem] bg-zinc-950 px-6 py-8 text-white shadow-prominent">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-300/80">
                {tm("pricingTitle")}
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">
                {t("title")}
              </h2>
              <div className="mt-8 space-y-4">
                <PricingFeature label={t("standardLabel")} description={t("standardPrice")} />
                <PricingFeature
                  label={t("registeredLabel")}
                  description={t("registeredPrice")}
                />
                <PricingFeature
                  label={t("attachmentLabel")}
                  description={t("attachmentPrice")}
                />
              </div>
            </div>

            <div className="rounded-[2.5rem] border border-zinc-200/80 bg-white/92 p-6 shadow-elevated dark:border-zinc-800 dark:bg-zinc-900/92 md:p-8">
              <div className="rounded-3xl border border-zinc-200/80 bg-[linear-gradient(180deg,#fffaf2_0%,#ffffff_100%)] p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                  <Check className="h-4 w-4" />
                  {t("noHiddenFees")}
                </div>
                <div className="mt-5 divide-y divide-zinc-100 dark:divide-zinc-700">
                  {rows.map((row) => (
                    <PricingRow
                      key={row.label}
                      label={row.label}
                      price={row.price}
                      {...(row.highlight ? { highlight: true } : {})}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function PricingFeature({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="mt-2 text-sm text-zinc-300">{description}</p>
    </div>
  );
}

function PricingInlineRow({
  label,
  price,
  highlight,
}: {
  label: string;
  price: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/85 px-4 py-3 shadow-sm">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-amber-700 dark:text-amber-400" : "text-zinc-950 dark:text-zinc-50"}`}>
        {price}
      </span>
    </div>
  );
}

function PricingRow({
  label,
  price,
  highlight,
}: {
  label: string;
  price: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-amber-700 dark:text-amber-400" : "text-zinc-950 dark:text-zinc-50"}`}>
        {price}
      </span>
    </div>
  );
}
