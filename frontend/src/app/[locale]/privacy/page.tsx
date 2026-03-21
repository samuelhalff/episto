import { useTranslations } from "next-intl";
import { Header } from "../../../components/marketing/Header.js";
import { Footer } from "../../../components/marketing/Footer.js";

export default function PrivacyPage() {
  const t = useTranslations("legal");

  return (
    <>
      <Header />
      <main id="main-content" className="px-6 pb-16 pt-16 md:pt-24">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">
            {t("privacyTitle")}
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            {t("privacyLastUpdated")}
          </p>
          <p className="mt-6 leading-relaxed text-gray-600">
            {t("privacyIntro")}
          </p>

          <LegalSection title={t("dataCollectionTitle")} note={t("legalReviewNote")} />
          <LegalSection title={t("dataUsageTitle")} note={t("legalReviewNote")} />
          <LegalSection title={t("dataStorageTitle")} note={t("legalReviewNote")} />
          <LegalSection title={t("dataRetentionTitle")} note={t("legalReviewNote")} />
          <LegalSection title={t("yourRightsTitle")} note={t("legalReviewNote")} />
          <LegalSection title={t("contactTitle")} note={t("legalReviewNote")} />
        </article>
      </main>
      <Footer />
    </>
  );
}

function LegalSection({ title, note }: { title: string; note: string }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm italic text-gray-400">{note}</p>
    </section>
  );
}
