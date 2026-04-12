import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import {
  LegalDefinitionList,
  LegalPageStack,
  LegalParagraph,
  LegalReferenceNotice,
  LegalSection,
} from "@/components/marketing/LegalContent";
import {
  LEGAL_OPERATOR,
  LEGAL_SERVICE_NAME,
  LEGAL_WEBSITE_HOST,
} from "@/lib/legal-config";
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
    pathname: "/imprint",
    title: t("imprint.title"),
    description: t("imprint.description"),
  });
}

export default async function ImprintPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  const isEnglishReference = locale === "en-CH";

  return (
    <>
      <Header />
      <main id="main-content" className="px-4 pb-16 pt-16 sm:px-6 md:pt-24">
        <article className="mx-auto max-w-3xl">
          <header className="mb-10">
            {!isEnglishReference ? (
              <LegalReferenceNotice>
                English reference version. Reviewed translations are not yet published.
              </LegalReferenceNotice>
            ) : null}
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 md:text-4xl">
              {t("imprintTitle")}
            </h1>
          </header>

          <LegalPageStack>
            <LegalSection title="Service">
              <LegalParagraph>
                {LEGAL_SERVICE_NAME} is operated by {LEGAL_OPERATOR.companyName}.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="Operator details">
              <LegalDefinitionList
                items={[
                  { label: "Operator", value: LEGAL_OPERATOR.companyName },
                  {
                    label: "Address",
                    value: (
                      <span className="whitespace-pre-line">
                        {LEGAL_OPERATOR.addressLines.join("\n")}
                      </span>
                    ),
                  },
                  {
                    label: "Support email",
                    value: (
                      <a
                        href={`mailto:${LEGAL_OPERATOR.supportEmail}`}
                        className="font-medium text-primary underline underline-offset-4"
                      >
                        {LEGAL_OPERATOR.supportEmail}
                      </a>
                    ),
                  },
                  { label: "Website", value: LEGAL_WEBSITE_HOST },
                  { label: "UID / VAT", value: LEGAL_OPERATOR.uidVat },
                ]}
              />
            </LegalSection>
          </LegalPageStack>
        </article>
      </main>
      <Footer />
    </>
  );
}
