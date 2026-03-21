import { useTranslations } from "next-intl";
import { Header } from "../../../components/marketing/Header.js";
import { Footer } from "../../../components/marketing/Footer.js";
import { MarketingHero } from "../../../components/marketing/MarketingHero.js";
import { FileSearch, PenLine, Send } from "lucide-react";

export default function HowItWorksPage() {
  const tm = useTranslations("marketing");
  const t = useTranslations("howItWorks");

  const steps = [
    {
      icon: <PenLine className="h-6 w-6 text-amber-600" />,
      number: "1",
      title: tm("step1Title"),
      description: t("step1Detail"),
    },
    {
      icon: <FileSearch className="h-6 w-6 text-amber-600" />,
      number: "2",
      title: tm("step2Title"),
      description: t("step2Detail"),
    },
    {
      icon: <Send className="h-6 w-6 text-amber-600" />,
      number: "3",
      title: tm("step3Title"),
      description: t("step3Detail"),
    },
  ];

  return (
    <>
      <Header />
      <main id="main-content">
        <MarketingHero
          eyebrow={tm("howItWorksTitle")}
          title={t("title")}
          subtitle={t("subtitle")}
          primaryAction={{ href: "/draft/new", label: t("cta") }}
          secondaryAction={{ href: "/pricing", label: tm("nav.pricing") }}
          panel={
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                    {tm("howItWorksTitle")}
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-stone-950 md:text-3xl">
                    {tm("step1Title")} • {tm("step2Title")} • {tm("step3Title")}
                  </h2>
                </div>
                <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                  3 steps
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.number}
                    className="flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 shadow-sm"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50">
                      {step.icon}
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
                        {t("stepLabel", { number: step.number })}
                      </p>
                      <p className="text-sm font-semibold text-stone-900">{step.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        />

        <section className="px-6 py-10 md:py-14 lg:py-16">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
            {steps.map((step) => (
              <article
                key={step.number}
                className="rounded-[2rem] border border-stone-200/80 bg-white/90 p-6 shadow-[0_18px_50px_rgba(120,53,15,0.08)]"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-amber-50">
                  {step.icon}
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                  {t("stepLabel", { number: step.number })}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-stone-950">
                  {step.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-stone-600">{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="px-6 pb-14 md:pb-16">
          <div className="mx-auto max-w-7xl rounded-[2.5rem] border border-stone-200/80 bg-[linear-gradient(180deg,#fffaf2_0%,#ffffff_100%)] px-5 py-8 shadow-[0_24px_70px_rgba(120,53,15,0.08)] md:px-8 md:py-10">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-stone-950 md:text-4xl">
                {t("faqTitle")}
              </h2>
            </div>
            <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2">
              <FaqCard question={t("faq1q")} answer={t("faq1a")} />
              <FaqCard question={t("faq2q")} answer={t("faq2a")} />
              <FaqCard question={t("faq3q")} answer={t("faq3a")} />
              <FaqCard question={t("faq4q")} answer={t("faq4a")} />
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
      <h3 className="text-base font-semibold text-stone-950">{question}</h3>
      <p className="mt-3 text-sm leading-7 text-stone-600">{answer}</p>
    </article>
  );
}
