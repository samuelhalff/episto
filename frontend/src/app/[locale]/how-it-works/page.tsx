import { useTranslations } from "next-intl";
import { Link } from "../../../i18n/navigation.js";
import { Header } from "../../../components/marketing/Header.js";
import { Footer } from "../../../components/marketing/Footer.js";
import { PenLine, FileSearch, Send } from "lucide-react";

export default function HowItWorksPage() {
  const tm = useTranslations("marketing");
  const t = useTranslations("howItWorks");

  return (
    <>
      <Header />
      <main>
        {/* Heading */}
        <section className="px-6 pb-16 pt-20 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-navy md:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 text-lg text-gray-500">{t("subtitle")}</p>
          </div>
        </section>

        {/* Steps */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-3xl space-y-16">
            <DetailStep
              icon={<PenLine className="h-8 w-8 text-navy" />}
              number="1"
              title={tm("step1Title")}
              description={t("step1Detail")}
            />
            <DetailStep
              icon={<FileSearch className="h-8 w-8 text-navy" />}
              number="2"
              title={tm("step2Title")}
              description={t("step2Detail")}
            />
            <DetailStep
              icon={<Send className="h-8 w-8 text-navy" />}
              number="3"
              title={tm("step3Title")}
              description={t("step3Detail")}
            />
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-gray-50 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-navy md:text-3xl">
              {t("faqTitle")}
            </h2>
            <div className="mt-12 space-y-8">
              <FaqItem question={t("faq1q")} answer={t("faq1a")} />
              <FaqItem question={t("faq2q")} answer={t("faq2a")} />
              <FaqItem question={t("faq3q")} answer={t("faq3a")} />
              <FaqItem question={t("faq4q")} answer={t("faq4a")} />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Link
              href="/draft/new"
              className="inline-block rounded-lg bg-navy px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-navy-light"
            >
              {t("cta")}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function DetailStep({
  icon,
  number,
  title,
  description,
}: {
  icon: React.ReactNode;
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-6">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-50">
        {icon}
      </div>
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Step {number}
        </span>
        <h3 className="mt-1 text-lg font-semibold text-navy">{title}</h3>
        <p className="mt-2 leading-relaxed text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <div>
      <h3 className="font-semibold text-navy">{question}</h3>
      <p className="mt-2 leading-relaxed text-gray-500">{answer}</p>
    </div>
  );
}
