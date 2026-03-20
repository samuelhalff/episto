import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "../../../i18n/navigation.js";
import { Header } from "../../../components/marketing/Header.js";
import { Footer } from "../../../components/marketing/Footer.js";
import { Button } from "../../../components/ui/button.js";
import { Card, CardContent } from "../../../components/ui/card.js";
import { Badge } from "../../../components/ui/badge.js";
import { PenLine, FileSearch, Send, ArrowRight } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "marketing" });
  return {
    title: t("metaTitle", { defaultValue: "How It Works — Swiss Mail" }),
    description: t("metaDescription", { defaultValue: "Three simple steps to send a formal letter via Swiss Post. AI-assisted drafting, review, and dispatch." }),
  };
}

export default function HowItWorksPage() {
  const tm = useTranslations("marketing");
  const t = useTranslations("howItWorks");

  return (
    <>
      <Header />
      <main id="main-content">
        {/* Heading */}
        <section className="relative px-6 pb-16 pt-20 md:pt-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-20 dark:opacity-10"
          />
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-4">
              {t("badge", { defaultValue: "Step by step" })}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
          </div>
        </section>

        {/* Steps */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-3xl space-y-6">
            <DetailStep
              icon={<PenLine className="h-6 w-6" />}
              number="01"
              title={tm("step1Title")}
              description={t("step1Detail")}
            />
            <DetailStep
              icon={<FileSearch className="h-6 w-6" />}
              number="02"
              title={tm("step2Title")}
              description={t("step2Detail")}
            />
            <DetailStep
              icon={<Send className="h-6 w-6" />}
              number="03"
              title={tm("step3Title")}
              description={t("step3Detail")}
            />
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border bg-muted/30 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
              {t("faqTitle")}
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              <FaqCard question={t("faq1q")} answer={t("faq1a")} />
              <FaqCard question={t("faq2q")} answer={t("faq2a")} />
              <FaqCard question={t("faq3q")} answer={t("faq3a")} />
              <FaqCard question={t("faq4q")} answer={t("faq4a")} />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Button asChild size="xl">
              <Link href="/draft/new">
                {t("cta")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
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
    <Card className="group overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="flex gap-6 p-6 md:p-8">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {number}
            </span>
          </div>
          <h3 className="mt-1 text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold text-foreground">{question}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{answer}</p>
      </CardContent>
    </Card>
  );
}
