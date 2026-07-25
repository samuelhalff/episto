import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  LegalExternalLink,
  LegalList,
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
import { MarketingMeta } from "@/components/marketing/typography";
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

  return (
    <LegalPageLayout>
      <LegalPageHeader
        title={t("privacyTitle")}
        description={t("privacy.pageDescription", {
          serviceName: LEGAL_SERVICE_NAME,
          companyName: LEGAL_OPERATOR.companyName,
        })}
        eyebrow={
          <MarketingMeta as="p" className="text-[11px] font-semibold tracking-normal">
            {t("privacyLastUpdated")}
          </MarketingMeta>
        }
        notice={
          <LegalReferenceNotice>
            {t("privacy.referenceNotice", {
              referenceLanguage: LEGAL_REFERENCE_LANGUAGE,
            })}
          </LegalReferenceNotice>
        }
      />

      <LegalPageStack>
        <LegalSection title={t("privacy.controllerTitle")}>
          <LegalParagraph>
            {t("privacy.controllerBody", {
              companyName: LEGAL_OPERATOR.companyName,
              address: LEGAL_OPERATOR.addressLines.join(", "),
              supportEmail: LEGAL_OPERATOR.supportEmail,
            })}
          </LegalParagraph>
        </LegalSection>

        <LegalSection title={t("privacy.categoriesTitle")}>
          <LegalList
            items={[
              t("privacy.categoriesItem1"),
              t("privacy.categoriesItem2"),
              t("privacy.categoriesItem3"),
              t("privacy.categoriesItem4"),
            ]}
          />
        </LegalSection>

        <LegalSection title={t("privacy.purposesTitle")}>
          <LegalList
            items={[
              t("privacy.purposesItem1"),
              t("privacy.purposesItem2"),
              t("privacy.purposesItem3"),
              t("privacy.purposesItem4"),
            ]}
          />
        </LegalSection>

        <LegalSection title={t("privacy.providersTitle")}>
          <LegalParagraph>{t("privacy.providersBody1")}</LegalParagraph>
          <LegalParagraph>
            {renderRichText(t, "privacy.providersBody2", {
              swissPostPrivacyLink: (chunks: ReactNode) => (
                <LegalExternalLink href={SWISS_POST_LINKS.privacy}>
                  {chunks}
                </LegalExternalLink>
              ),
            })}
          </LegalParagraph>
        </LegalSection>

        <LegalSection title={t("privacy.analyticsTitle")}>
          <LegalParagraph>{t("privacy.analyticsBody1")}</LegalParagraph>
          <LegalParagraph>
            {renderRichText(t, "privacy.analyticsBody2", {
              googlePrivacyLink: (chunks: ReactNode) => (
                <LegalExternalLink href="https://policies.google.com/privacy">
                  {chunks}
                </LegalExternalLink>
              ),
            })}
          </LegalParagraph>
        </LegalSection>

        <LegalSection title={t("privacy.retentionTitle")}>
          <LegalParagraph>{t("privacy.retentionBody")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("privacy.rightsTitle")}>
          <LegalParagraph>{t("privacy.rightsBody")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("addressAssistTitle")}>
          <LegalParagraph>{t("addressAssistBody")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("privacy.referenceLanguageTitle")}>
          <LegalParagraph>
            {t("privacy.referenceLanguageBody", {
              referenceLanguage: LEGAL_REFERENCE_LANGUAGE,
            })}
          </LegalParagraph>
        </LegalSection>
      </LegalPageStack>
    </LegalPageLayout>
  );
}
