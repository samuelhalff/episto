import { useTranslations } from "next-intl";
import { Header } from "../../../components/marketing/Header";
import { Footer } from "../../../components/marketing/Footer";

export default function ImprintPage() {
  const t = useTranslations("legal");

  return (
    <>
      <Header />
      <main id="main-content" className="px-4 pb-16 pt-16 sm:px-6 md:pt-24">
        <article className="mx-auto max-w-3xl">
          <header className="mb-10">
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 md:text-4xl">
              {t("imprintTitle")}
            </h1>
          </header>

          <div className="space-y-6">
            <section className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 transition-colors dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{t("operatedBy")}</p>
              <p className="mt-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {t("companyName")}
              </p>
              <p className="mt-1 text-sm italic text-zinc-500 dark:text-zinc-400">
                {t("legalReviewNote")}
              </p>
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 transition-colors dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-6">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                {t("contactTitle")}
              </h2>
              <div className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                <p>
                  {t("contactEmail")}:{" "}
                  <span className="italic text-zinc-400 dark:text-zinc-500">
                    {t("legalReviewNote")}
                  </span>
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 transition-colors dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-6">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                {t("commercialRegister")}
              </h2>
              <p className="mt-2 text-sm italic text-zinc-500 dark:text-zinc-400">
                {t("legalReviewNote")}
              </p>
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 transition-colors dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-6">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                {t("vatNumber")}
              </h2>
              <p className="mt-2 text-sm italic text-zinc-500 dark:text-zinc-400">
                {t("legalReviewNote")}
              </p>
            </section>

            <section className="rounded-2xl border border-zinc-200/80 bg-white/80 p-5 transition-colors dark:border-zinc-800 dark:bg-zinc-900/60 sm:p-6">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                {t("disputeResolution")}
              </h2>
              <p className="mt-2 text-sm italic text-zinc-500 dark:text-zinc-400">
                {t("legalReviewNote")}
              </p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
