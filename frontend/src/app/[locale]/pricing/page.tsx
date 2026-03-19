import { useTranslations } from "next-intl";
import { Link } from "../../../i18n/navigation.js";
import { Header } from "../../../components/marketing/Header.js";
import { Footer } from "../../../components/marketing/Footer.js";
import { Check } from "lucide-react";

export default function PricingPage() {
  const t = useTranslations("pricing");

  return (
    <>
      <Header />
      <main>
        {/* Heading */}
        <section className="px-6 pb-16 pt-20 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-navy md:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 text-lg text-gray-500">{t("subtitle")}</p>
          </div>
        </section>

        {/* Pricing table */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-xl">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                  <Check className="h-4 w-4" />
                  {t("noHiddenFees")}
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                <PricingRow
                  label={t("basePriceLabel")}
                  price={t("basePrice")}
                />
                <PricingRow
                  label={t("additionalPageLabel")}
                  price={t("additionalPagePrice")}
                />
                <PricingRow
                  label={t("attachmentLabel")}
                  price={t("attachmentPrice")}
                />
              </div>

              <div className="border-t border-gray-200 bg-gray-50">
                <div className="divide-y divide-gray-100">
                  <PricingRow
                    label={t("standardLabel")}
                    price={t("standardPrice")}
                  />
                  <PricingRow
                    label={t("registeredLabel")}
                    price={t("registeredPrice")}
                    highlight
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gray-50 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Link
              href="/draft/new"
              className="inline-block rounded-lg bg-navy px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-navy-light"
            >
              {t("cta")}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
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
    <div className="flex items-center justify-between px-6 py-4">
      <span className="text-sm text-gray-600">{label}</span>
      <span
        className={`text-sm font-medium ${highlight === true ? "text-navy" : "text-gray-900"}`}
      >
        {price}
      </span>
    </div>
  );
}
