import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Header } from "../../../components/marketing/Header.js";
import { Footer } from "../../../components/marketing/Footer.js";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: t("metaTitle", { defaultValue: "Terms of Service — Swiss Mail" }),
    description: t("metaDescription", { defaultValue: "Terms of service for using the Swiss Mail letter sending platform." }),
  };
}

export default function TermsPage() {
  const t = useTranslations("legal");

  return (
    <>
      <Header />
      <main id="main-content" className="px-6 pb-20 pt-20 md:pt-28">
        <article className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            {t("termsTitle")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("termsLastUpdated")}
          </p>
          <p className="mt-6 leading-relaxed text-muted-foreground">
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
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm italic text-muted-foreground">{note}</p>
    </section>
  );
}
