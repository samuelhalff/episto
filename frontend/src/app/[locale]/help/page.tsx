import { useTranslations } from "next-intl";
import { Link } from "../../../i18n/navigation.js";
import { Header } from "../../../components/marketing/Header.js";
import { Footer } from "../../../components/marketing/Footer.js";
import { Button } from "../../../components/ui/button.js";
import { Card, CardContent } from "../../../components/ui/card.js";
import { Badge } from "../../../components/ui/badge.js";
import { HelpCircle, Mail, ArrowRight, MessageCircle } from "lucide-react";

export default function HelpPage() {
  const t = useTranslations("help");
  const tm = useTranslations("marketing");

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
              <MessageCircle className="mr-1.5 h-3 w-3" />
              {t("badge", { defaultValue: "Support" })}
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl lg:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">{t("subtitle")}</p>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 pb-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">
              {t("faqTitle")}
            </h2>
            <div className="mt-12 space-y-4">
              <FaqCard question={t("faq1q")} answer={t("faq1a")} />
              <FaqCard question={t("faq2q")} answer={t("faq2a")} />
              <FaqCard question={t("faq3q")} answer={t("faq3a")} />
              <FaqCard question={t("faq4q")} answer={t("faq4a")} />
              <FaqCard question={t("faq5q")} answer={t("faq5a")} />
              <FaqCard question={t("faq6q")} answer={t("faq6a")} />
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="border-t border-border bg-muted/30 px-6 py-20 md:py-28">
          <div className="mx-auto max-w-lg text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              {t("contactTitle")}
            </h2>
            <p className="mt-4 text-muted-foreground">{t("contactDescription")}</p>
            <div className="mt-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("contactEmailLabel")}
              </p>
              <a
                href={`mailto:${t("contactEmail")}`}
                className="mt-1 inline-block text-lg font-semibold text-primary transition-colors hover:text-primary/80"
              >
                {t("contactEmail")}
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {t("contactResponseTime")}
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-20 md:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <Button asChild size="xl">
              <Link href="/draft/new">
                {tm("ctaButton")}
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

function FaqCard({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <HelpCircle className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{question}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{answer}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
