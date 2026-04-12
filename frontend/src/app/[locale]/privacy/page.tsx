import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import {
  LegalExternalLink,
  LegalList,
  LegalPageStack,
  LegalParagraph,
  LegalReferenceNotice,
  LegalSection,
} from "@/components/marketing/LegalContent";
import {
  LEGAL_OPERATOR,
  LEGAL_REFERENCE_LANGUAGE,
  LEGAL_SERVICE_NAME,
  SWISS_POST_LINKS,
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
  const isEnglishReference = locale === "en-CH";

  return (
    <>
      <Header />
      <main id="main-content" className="px-4 pb-16 pt-16 sm:px-6 md:pt-24">
        <article className="mx-auto max-w-3xl">
          <header className="mb-10">
            {!isEnglishReference ? (
              <LegalReferenceNotice>
                English reference version. Reviewed translations are not yet published. If
                future translations differ from this text, the English version prevails.
              </LegalReferenceNotice>
            ) : null}
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {t("privacyLastUpdated")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 md:text-4xl">
              {t("privacyTitle")}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              How {LEGAL_OPERATOR.companyName} processes personal data when you use{" "}
              {LEGAL_SERVICE_NAME}.
            </p>
          </header>

          <LegalPageStack>
            <LegalSection title="Controller">
              <LegalParagraph>
                The controller for this service is {LEGAL_OPERATOR.companyName},{" "}
                {LEGAL_OPERATOR.addressLines.join(", ")}. Contact:{" "}
                {LEGAL_OPERATOR.supportEmail}.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="Categories of data">
              <LegalList
                items={[
                  "draft and letter content, including sender, recipient, and attachment data",
                  "contact data you provide, especially your email address",
                  "payment and transaction data needed for checkout, fraud prevention, and accounting",
                  "technical and security data such as session, device, IP, and event logs",
                ]}
              />
            </LegalSection>

            <LegalSection title="Purposes">
              <LegalList
                items={[
                  "operate the drafting and review flow",
                  "generate the final PDF and prepare dispatch metadata",
                  "submit the order for postal dispatch and communicate status updates",
                  "process payment, provide support, prevent abuse, and comply with legal obligations",
                ]}
              />
            </LegalSection>

            <LegalSection title="Service providers and recipients">
              <LegalParagraph>
                We use specialized providers for hosting, storage, email delivery, payment
                processing, address lookup where used, and postal dispatch. Where
                necessary for the service, relevant data is shared with Swiss Post / ePost
                and other production or delivery subcontractors.
              </LegalParagraph>
              <LegalParagraph>
                Once data enters Swiss Post systems for dispatch, Swiss Post's own privacy
                information also applies. See{" "}
                <LegalExternalLink href={SWISS_POST_LINKS.privacy}>
                  Swiss Post data protection and disclaimer information
                </LegalExternalLink>
                .
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="Retention">
              <LegalParagraph>
                We retain data only for as long as needed for service delivery, support,
                abuse prevention, dispute handling, and legal retention duties. Payment
                and accounting data may be retained longer where required by law.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="Your rights">
              <LegalParagraph>
                Subject to applicable Swiss data-protection law, you may request access,
                correction, deletion, restriction where applicable, and information about
                the main processing of your personal data.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title={t("addressAssistTitle")}>
              <LegalParagraph>{t("addressAssistBody")}</LegalParagraph>
            </LegalSection>

            <LegalSection title="Reference language">
              <LegalParagraph>
                This policy is maintained in {LEGAL_REFERENCE_LANGUAGE}. Any translation
                is provided for convenience only. If a translation differs, the{" "}
                {LEGAL_REFERENCE_LANGUAGE} version prevails.
              </LegalParagraph>
            </LegalSection>
          </LegalPageStack>
        </article>
      </main>
      <Footer />
    </>
  );
}
