import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  LegalEyebrow,
  LegalCallout,
  LegalExternalLink,
  LegalLink,
  LegalList,
  LegalMutedText,
  LegalPageStack,
  LegalParagraph,
  LegalReferenceNotice,
  LegalSection,
} from "@/components/marketing/LegalContent";
import { LegalPageHeader, LegalPageLayout } from "@/components/marketing/LegalPageLayout";
import {
  LEGAL_OPERATOR,
  LEGAL_REFERENCE_LANGUAGE,
  LEGAL_SERVICE_NAME,
  SWISS_POST_LINKS,
} from "@/lib/legal-config";
import { buildMarketingMetadata } from "@/lib/marketing-seo";
import { renderRichText } from "@/lib/next-intl-rich";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "/terms",
    title: t("terms.title"),
    description: t("terms.description"),
  });
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <LegalPageLayout>
      <LegalPageHeader
        title={t("termsTitle")}
        description={t("terms.pageDescription", {
          serviceName: LEGAL_SERVICE_NAME,
          companyName: LEGAL_OPERATOR.companyName,
        })}
        eyebrow={<LegalEyebrow>{t("termsLastUpdated")}</LegalEyebrow>}
        notice={
          <LegalReferenceNotice>
            {t("terms.referenceNotice", {
              referenceLanguage: LEGAL_REFERENCE_LANGUAGE,
            })}
          </LegalReferenceNotice>
        }
      />

      <LegalPageStack>
        <LegalCallout title={t("terms.importantTitle")}>
          <LegalList
            items={[
              t("terms.importantItem1", {
                companyName: LEGAL_OPERATOR.companyName,
              }),
              t("terms.importantItem2"),
              t("terms.importantItem3"),
              t("terms.importantItem4"),
            ]}
          />
        </LegalCallout>

        <LegalSection title={t("terms.section1Title")}>
          <LegalParagraph>
            {t("terms.section1Body1", {
              serviceName: LEGAL_SERVICE_NAME,
              companyName: LEGAL_OPERATOR.companyName,
            })}
          </LegalParagraph>
          <LegalParagraph>
            {t("terms.section1Body2", {
              companyName: LEGAL_OPERATOR.companyName,
            })}
          </LegalParagraph>
        </LegalSection>

        <LegalSection title={t("terms.section2Title")}>
          <LegalParagraph>{t("terms.section2Body1")}</LegalParagraph>
          <LegalParagraph>{t("terms.section2Body2")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("terms.section3Title")}>
          <LegalList
            items={[
              t("terms.section3Item1"),
              t("terms.section3Item2"),
              t("terms.section3Item3"),
              t("terms.section3Item4", {
                serviceName: LEGAL_SERVICE_NAME,
              }),
            ]}
          />
        </LegalSection>

        <LegalSection title={t("terms.section4Title")}>
          <LegalParagraph>{t("terms.section4Body1")}</LegalParagraph>
          <LegalParagraph>{t("terms.section4Body2")}</LegalParagraph>
          <LegalParagraph>{t("terms.section4Body3")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("terms.section5Title")}>
          <LegalParagraph>{t("terms.section5Body1")}</LegalParagraph>
          <LegalParagraph>
            {renderRichText(t, "terms.section5Body2", {
              swissPostGtcLink: (chunks: ReactNode) => (
                <LegalExternalLink href={SWISS_POST_LINKS.gtc}>
                  {chunks}
                </LegalExternalLink>
              ),
              letterLayoutLink: (chunks: ReactNode) => (
                <LegalExternalLink href={SWISS_POST_LINKS.layout}>
                  {chunks}
                </LegalExternalLink>
              ),
              registeredMailLink: (chunks: ReactNode) => (
                <LegalExternalLink href={SWISS_POST_LINKS.registered}>
                  {chunks}
                </LegalExternalLink>
              ),
            })}
          </LegalParagraph>
          <LegalParagraph>{t("terms.section5Body3")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("terms.section6Title")}>
          <LegalParagraph>{t("terms.section6Body1")}</LegalParagraph>
          <LegalParagraph>{t("terms.section6Body2")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("terms.section7Title")}>
          <LegalParagraph>{t("terms.section7Body1")}</LegalParagraph>
          <LegalParagraph>{t("terms.section7Body2")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("terms.section8Title")}>
          <LegalParagraph>
            {renderRichText(t, "terms.section8Body1", {
              privacyPolicyLink: (chunks: ReactNode) => (
                <LegalLink href="/privacy">{chunks}</LegalLink>
              ),
            })}
          </LegalParagraph>
        </LegalSection>

        <LegalSection title={t("terms.section9Title")}>
          <LegalParagraph>
            {t("terms.section9Body1", {
              companyName: LEGAL_OPERATOR.companyName,
            })}
          </LegalParagraph>
          <LegalParagraph>
            {t("terms.section9Body2", {
              referenceLanguage: LEGAL_REFERENCE_LANGUAGE,
            })}
          </LegalParagraph>
        </LegalSection>

        <LegalMutedText>
          {t("terms.contactLine", {
            companyName: LEGAL_OPERATOR.companyName,
            supportEmail: LEGAL_OPERATOR.supportEmail,
          })}
        </LegalMutedText>
      </LegalPageStack>
    </LegalPageLayout>
  );
}
