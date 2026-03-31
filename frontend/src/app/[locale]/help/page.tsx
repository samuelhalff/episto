import { useTranslations } from "next-intl";
import { ArrowRight, HelpCircle, Mail } from "lucide-react";
import { Header } from "../../../components/marketing/Header";
import { Footer } from "../../../components/marketing/Footer";
import { Link } from "../../../i18n/navigation";

export default function HelpPage() {
  const t = useTranslations("help");
  const tm = useTranslations("marketing");

  const faqs = [
    { question: t("faq1q"), answer: t("faq1a") },
    { question: t("faq2q"), answer: t("faq2a") },
    { question: t("faq3q"), answer: t("faq3a") },
    { question: t("faq4q"), answer: t("faq4a") },
    { question: t("faq5q"), answer: t("faq5a") },
    { question: t("faq6q"), answer: t("faq6a") },
    { question: t("faq7q"), answer: t("faq7a") },
    { question: t("faq8q"), answer: t("faq8a") },
  ];

  return (
    <>
      <Header />
      <main id="main-content">
        {/* FAQ Section */}
        <section className="px-4 pt-12 pb-10 sm:px-6 sm:pt-16 md:pt-20 md:pb-14">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 sm:text-4xl md:text-5xl">
              {t("faqTitle")}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-base">
              {t("subtitle")}
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-12 md:grid-cols-2 md:gap-5">
            {faqs.map((faq) => (
              <FaqCard key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </section>

        {/* Write a letter CTA */}
        <section className="px-4 py-8 sm:px-6 sm:py-10 md:py-12">
          <div className="mx-auto max-w-2xl text-center">
            <Link
              href="/draft/new"
              className="cta-sheen inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-7 py-3.5 text-sm font-semibold text-white shadow-prominent transition-all duration-300 hover:-translate-y-0.5 hover:bg-zinc-800 sm:px-8 sm:py-4 sm:text-base"
            >
              {tm("ctaButton")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Contact — below FAQs */}
        <section className="px-4 pb-12 sm:px-6 md:pb-16">
          <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-200/80 bg-zinc-50/50 p-6 text-center transition-colors dark:border-zinc-800 dark:bg-zinc-900/50 sm:rounded-3xl sm:p-8 md:p-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10">
              <Mail className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-zinc-50 sm:text-2xl">
              {t("contactTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-base">
              {t("contactDescription")}
            </p>
            <a
              href={`mailto:${t("contactEmail")}`}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-zinc-950 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 dark:bg-amber-400 dark:text-zinc-950 dark:hover:bg-amber-300"
            >
              {t("contactEmail")}
            </a>
            <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">{t("contactResponseTime")}</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function FaqCard({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <article className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-3xl">
      <div className="flex gap-3">
        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-500/10">
          <HelpCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{question}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{answer}</p>
        </div>
      </div>
    </article>
  );
}
