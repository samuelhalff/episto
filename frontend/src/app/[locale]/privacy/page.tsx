import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Header } from "../../../components/marketing/Header.js";
import { Footer } from "../../../components/marketing/Footer.js";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("metaTitle", { defaultValue: "Privacy Policy — Swiss Mail" }),
    description: t("metaDescription", { defaultValue: "How Swiss Mail handles your data. Privacy policy and data protection information." }),
  };
}

export default function PrivacyPage() {
  const t = useTranslations("legal");

  return (
    <>
      <Header />
      <main id="main-content" className="px-6 pb-20 pt-20 md:pt-28">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            {t("privacyTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("privacyLastUpdated")}
          </p>
          <p className="mt-6 leading-relaxed text-muted-foreground">
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
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm italic text-muted-foreground">{note}</p>
    </section>
  );
}
