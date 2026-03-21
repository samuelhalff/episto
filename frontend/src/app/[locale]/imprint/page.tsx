import { useTranslations } from "next-intl";
import { Header } from "../../../components/marketing/Header.js";
import { Footer } from "../../../components/marketing/Footer.js";

export default function ImprintPage() {
  const t = useTranslations("legal");

  return (
    <>
      <Header />
      <main id="main-content" className="px-6 pb-16 pt-16 md:pt-24">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
            {t("imprintTitle")}
          </h1>

          <section className="mt-8">
            <p className="text-sm text-gray-500">{t("operatedBy")}</p>
            <p className="mt-2 text-lg font-semibold text-gray-900">
              {t("companyName")}
            </p>
            <p className="mt-1 text-sm italic text-gray-400">
              {t("legalReviewNote")}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("contactTitle")}
            </h2>
            <div className="mt-2 text-sm text-gray-500">
              <p>
                {t("contactEmail")}:{" "}
                <span className="italic text-gray-400">
                  {t("legalReviewNote")}
                </span>
              </p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("commercialRegister")}
            </h2>
            <p className="mt-2 text-sm italic text-gray-400">
              {t("legalReviewNote")}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("vatNumber")}
            </h2>
            <p className="mt-2 text-sm italic text-gray-400">
              {t("legalReviewNote")}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("disputeResolution")}
            </h2>
            <p className="mt-2 text-sm italic text-gray-400">
              {t("legalReviewNote")}
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
