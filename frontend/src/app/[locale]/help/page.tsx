import { useTranslations } from "next-intl";
import { Link } from "../../../i18n/navigation.js";
import { Header } from "../../../components/marketing/Header.js";
import { Footer } from "../../../components/marketing/Footer.js";
import { HelpCircle, Mail } from "lucide-react";

export default function HelpPage() {
  const t = useTranslations("help");
  const tm = useTranslations("marketing");

  return (
    <>
      <Header />
      <main id="main-content">
        {/* Heading */}
        <section className="px-6 pb-16 pt-20 md:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 text-lg text-gray-500">{t("subtitle")}</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-gray-900 md:text-3xl">
              {t("faqTitle")}
            </h2>
            <div className="mt-12 space-y-8">
              <FaqItem
                icon={<HelpCircle className="h-5 w-5 text-primary" />}
                question={t("faq1q")}
                answer={t("faq1a")}
              />
              <FaqItem
                icon={<HelpCircle className="h-5 w-5 text-primary" />}
                question={t("faq2q")}
                answer={t("faq2a")}
              />
              <FaqItem
                icon={<HelpCircle className="h-5 w-5 text-primary" />}
                question={t("faq3q")}
                answer={t("faq3a")}
              />
              <FaqItem
                icon={<HelpCircle className="h-5 w-5 text-primary" />}
                question={t("faq4q")}
                answer={t("faq4a")}
              />
              <FaqItem
                icon={<HelpCircle className="h-5 w-5 text-primary" />}
                question={t("faq5q")}
                answer={t("faq5a")}
              />
              <FaqItem
                icon={<HelpCircle className="h-5 w-5 text-primary" />}
                question={t("faq6q")}
                answer={t("faq6a")}
              />
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-gray-50 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Mail className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900 md:text-3xl">
              {t("contactTitle")}
            </h2>
            <p className="mt-4 text-gray-500">{t("contactDescription")}</p>
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-600">
                {t("contactEmailLabel")}
              </p>
              <a
                href={`mailto:${t("contactEmail")}`}
                className="mt-1 inline-block text-lg font-semibold text-primary hover:underline"
              >
                {t("contactEmail")}
              </a>
            </div>
            <p className="mt-4 text-sm text-gray-400">
              {t("contactResponseTime")}
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Link
              href="/draft/new"
              className="inline-block rounded-full bg-primary px-8 py-4 text-base font-semibold text-white shadow-sm hover:bg-primary-dark"
            >
              {tm("ctaButton")}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function FaqItem({
  icon,
  question,
  answer,
}: {
  icon: React.ReactNode;
  question: string;
  answer: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-1 shrink-0">{icon}</div>
      <div>
        <h3 className="font-semibold text-gray-900">{question}</h3>
        <p className="mt-2 leading-relaxed text-gray-500">{answer}</p>
      </div>
    </div>
  );
}
