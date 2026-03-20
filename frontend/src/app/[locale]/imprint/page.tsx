import { useTranslations } from "next-intl";
import { Header } from "../../../components/marketing/Header.js";
import { Footer } from "../../../components/marketing/Footer.js";

export default function ImprintPage() {
  const t = useTranslations("legal");

  return (
    <>
      <Header />
      <main id="main-content" className="px-6 pb-20 pt-20 md:pt-28">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-navy md:text-4xl">
            {t("imprintTitle")}
          </h1>

          <section className="mt-10">
            <p className="text-sm text-gray-500">{t("operatedBy")}</p>
            <p className="mt-2 text-lg font-semibold text-navy">
              {t("companyName")}
            </p>
            <p className="mt-1 text-sm italic text-gray-400">
              {t("legalReviewNote")}
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-navy">
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

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-navy">
              {t("commercialRegister")}
            </h2>
            <p className="mt-2 text-sm italic text-gray-400">
              {t("legalReviewNote")}
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-navy">
              {t("vatNumber")}
            </h2>
            <p className="mt-2 text-sm italic text-gray-400">
              {t("legalReviewNote")}
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-navy">
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
