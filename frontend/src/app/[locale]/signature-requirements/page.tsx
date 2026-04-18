import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  LegalCallout,
  LegalList,
  LegalMutedText,
  LegalPageStack,
  LegalParagraph,
  LegalReferenceNotice,
  LegalSection,
} from "@/components/marketing/LegalContent";
import { LegalPageHeader, LegalPageLayout } from "@/components/marketing/LegalPageLayout";
import { LEGAL_SERVICE_NAME } from "@/lib/legal-config";
import { buildMarketingMetadata } from "@/lib/marketing-seo";
import { MarketingMeta } from "@/components/marketing/typography";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });

  return buildMarketingMetadata({
    locale,
    pathname: "/signature-requirements",
    title: t("signatureRequirements.title"),
    description: t("signatureRequirements.description"),
  });
}

export default async function SignatureRequirementsPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "signatureRequirements" });
  const isEnglishReference = locale === "en-CH";

  return (
    <LegalPageLayout>
      <LegalPageHeader
        title={t("pageTitle")}
        description={t("pageIntro", { service: LEGAL_SERVICE_NAME })}
        eyebrow={
          <MarketingMeta
            as="p"
            className="text-[11px] font-semibold uppercase tracking-widest"
          >
            {t("informationalEyebrow")}
          </MarketingMeta>
        }
        notice={
          !isEnglishReference ? (
            <LegalReferenceNotice>{t("translationNotice")}</LegalReferenceNotice>
          ) : undefined
        }
      />

      <LegalPageStack>
        <LegalCallout title={t("readThisFirst")}>
          <LegalList
            items={[
              t("callout.notLegalAdvice"),
              t("callout.electronicVsPaper"),
              t("callout.mostLettersDontNeed"),
            ]}
          />
        </LegalCallout>

        <LegalSection title={t("sections.tiers.title")}>
          <LegalParagraph>{t("sections.tiers.intro")}</LegalParagraph>
          <LegalList
            items={[
              <span key="visual">
                <strong>{t("sections.tiers.visualName")}</strong> —{" "}
                {t("sections.tiers.visualBody")}
              </span>,
              <span key="advanced">
                <strong>{t("sections.tiers.advancedName")}</strong> —{" "}
                {t("sections.tiers.advancedBody")}
              </span>,
              <span key="qualified">
                <strong>{t("sections.tiers.qualifiedName")}</strong> —{" "}
                {t("sections.tiers.qualifiedBody")}
              </span>,
            ]}
          />
        </LegalSection>

        <LegalSection title={t("sections.whenRequired.title")}>
          <LegalParagraph>{t("sections.whenRequired.intro")}</LegalParagraph>
          <LegalList
            items={[
              t("sections.whenRequired.caseGuaranty"),
              t("sections.whenRequired.caseConsumerCredit"),
              t("sections.whenRequired.caseLease"),
              t("sections.whenRequired.caseEmployment"),
              t("sections.whenRequired.caseOther"),
            ]}
          />
          <LegalMutedText>{t("sections.whenRequired.disclaimer")}</LegalMutedText>
        </LegalSection>

        <LegalSection title={t("sections.paperCopy.title")}>
          <LegalParagraph>{t("sections.paperCopy.paragraphOne")}</LegalParagraph>
          <LegalParagraph>{t("sections.paperCopy.paragraphTwo")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("sections.identification.title")}>
          <LegalParagraph>{t("sections.identification.intro")}</LegalParagraph>
          <LegalList
            items={[
              t("sections.identification.pointFirstTime"),
              t("sections.identification.pointReuse"),
              t("sections.identification.pointRevocation"),
              t("sections.identification.pointPrivacy"),
            ]}
          />
        </LegalSection>

        <LegalSection title={t("sections.crossBorder.title")}>
          <LegalParagraph>{t("sections.crossBorder.body")}</LegalParagraph>
        </LegalSection>

        <LegalSection title={t("sections.contact.title")}>
          <LegalParagraph>
            {t("sections.contact.body", { service: LEGAL_SERVICE_NAME })}
          </LegalParagraph>
        </LegalSection>
      </LegalPageStack>
    </LegalPageLayout>
  );
}
