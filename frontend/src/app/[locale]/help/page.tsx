import { useTranslations } from "next-intl";
import { HelpCircle, Mail } from "lucide-react";
import { Header } from "../../../components/marketing/Header.js";
import { Footer } from "../../../components/marketing/Footer.js";
import { MarketingHero } from "../../../components/marketing/MarketingHero.js";

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
  ];

  return (
    <>
      <Header />
      <main id="main-content">
        <MarketingHero
          eyebrow={t("contactTitle")}
          title={t("title")}
          subtitle={t("subtitle")}
          primaryAction={{ href: "/draft/new", label: tm("ctaButton") }}
          secondaryAction={{ href: "/how-it-works", label: tm("nav.howItWorks") }}
          panel={
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-amber-50">
                <Mail className="h-6 w-6 text-amber-600" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-stone-950 md:text-3xl">
                {t("contactTitle")}
              </h2>
              <p className="mt-4 text-base leading-7 text-stone-600">{t("contactDescription")}</p>
              <div className="mt-6 rounded-[1.5rem] border border-stone-200/80 bg-white/90 px-5 py-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                  {t("contactEmailLabel")}
                </p>
                <a
                  href={`mailto:${t("contactEmail")}`}
                  className="mt-2 inline-block text-lg font-semibold text-amber-700 hover:underline"
                >
                  {t("contactEmail")}
                </a>
                <p className="mt-3 text-sm text-stone-500">{t("contactResponseTime")}</p>
              </div>
            </div>
          }
        />

        <section className="px-6 pb-10 md:pb-14">
          <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-stone-200/80 bg-[linear-gradient(180deg,#fffaf2_0%,#ffffff_100%)] px-5 py-8 shadow-[0_24px_70px_rgba(120,53,15,0.08)] md:px-8 md:py-10">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-stone-950 md:text-4xl">
                {t("faqTitle")}
              </h2>
            </div>
            <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-2">
              {faqs.map((faq) => (
                <FaqCard key={faq.question} question={faq.question} answer={faq.answer} />
              ))}
            </div>
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
    <article className="rounded-[1.75rem] border border-stone-200/80 bg-white/95 p-5 shadow-sm">
      <div className="flex gap-3">
        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50">
          <HelpCircle className="h-4 w-4 text-amber-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-stone-950">{question}</h3>
          <p className="mt-3 text-sm leading-7 text-stone-600">{answer}</p>
        </div>
      </div>
    </article>
  );
}
