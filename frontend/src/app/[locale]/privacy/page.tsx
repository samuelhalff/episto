import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { buildMarketingMetadata } from "@/lib/marketing-seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "/privacy",
    title: t("privacy.title"),
    description: t("privacy.description"),
  });
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <>
      <Header />
      <main id="main-content" className="px-4 pb-16 pt-16 sm:px-6 md:pt-24">
        <article className="mx-auto max-w-3xl">
          <header className="mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {t("privacyLastUpdated")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 md:text-4xl">
              {t("privacyTitle")}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t("privacyIntro")}
            </p>
          </header>

          <div className="space-y-6">
            <LegalSection title={t("dataCollectionTitle")} note={t("legalReviewNote")} />
            <LegalSection title={t("dataUsageTitle")} note={t("legalReviewNote")} />
            <LegalSection title={t("addressAssistTitle")} body={t("addressAssistBody")} />
            <LegalSection title={t("dataStorageTitle")} note={t("legalReviewNote")} />
            <LegalSection title={t("dataRetentionTitle")} note={t("legalReviewNote")} />
            <LegalSection title={t("yourRightsTitle")} note={t("legalReviewNote")} />
            <LegalSection title={t("contactTitle")} note={t("legalReviewNote")} />
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}

function LegalSection({
  title,
  note,
  body,
}: {
  title: string;
  note?: string;
  body?: string;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 transition-colors dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-6">
      <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
      {body ? (
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{body}</p>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 italic dark:text-zinc-400">
          {note}
        </p>
      )}
    </section>
  );
}
