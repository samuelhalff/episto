import { useTranslations } from "next-intl";
import { Header } from "../../../components/marketing/Header.js";
import { Footer } from "../../../components/marketing/Footer.js";

export default function TermsPage() {
  const t = useTranslations("legal");

  return (
    <>
      <Header />
      <main id="main-content" className="px-6 pb-20 pt-20 md:pt-28">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
            {t("termsTitle")}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {t("termsLastUpdated")}
          </p>
          <p className="mt-6 leading-relaxed text-gray-600">
            {t("termsIntro")}
          </p>

          <LegalSection title={t("serviceDescTitle")} note={t("legalReviewNote")} />
          <LegalSection title={t("userObligationsTitle")} note={t("legalReviewNote")} />
          <LegalSection title={t("paymentTermsTitle")} note={t("legalReviewNote")} />
          <LegalSection title={t("liabilityTitle")} note={t("legalReviewNote")} />
          <LegalSection title={t("applicableLawTitle")} note={t("legalReviewNote")} />
          <LegalSection title={t("amendmentsTitle")} note={t("legalReviewNote")} />
        </article>
      </main>
      <Footer />
    </>
  );
}

function LegalSection({ title, note }: { title: string; note: string }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm italic text-gray-400">{note}</p>
    </section>
  );
}
