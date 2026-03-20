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
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            {t("imprintTitle")}
          </h1>

          <section className="mt-10">
            <p className="text-sm text-muted-foreground">{t("operatedBy")}</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {t("companyName")}
            </p>
            <p className="mt-1 text-sm italic text-muted-foreground">
              {t("legalReviewNote")}
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">
              {t("contactTitle")}
            </h2>
            <div className="mt-2 text-sm text-muted-foreground">
              <p>
                {t("contactEmail")}:{" "}
                <span className="italic text-muted-foreground">
                  {t("legalReviewNote")}
                </span>
              </p>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">
              {t("commercialRegister")}
            </h2>
            <p className="mt-2 text-sm italic text-muted-foreground">
              {t("legalReviewNote")}
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">
              {t("vatNumber")}
            </h2>
            <p className="mt-2 text-sm italic text-muted-foreground">
              {t("legalReviewNote")}
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">
              {t("disputeResolution")}
            </h2>
            <p className="mt-2 text-sm italic text-muted-foreground">
              {t("legalReviewNote")}
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
