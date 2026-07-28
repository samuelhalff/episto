import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  LegalEyebrow,
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
        eyebrow={<LegalEyebrow>{t("informationalEyebrow")}</LegalEyebrow>}
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
              t("callout.printedSignature"),
              t("callout.legalForm"),
            ]}
          />
        </LegalCallout>

        <LegalSection title={t("sections.tiers.title")}>
          <LegalParagraph>{t("sections.tiers.intro")}</LegalParagraph>
          <LegalList
            items={[
              <span key="typed">
                <strong>{t("sections.tiers.typedName")}</strong> —{" "}
                {t("sections.tiers.typedBody")}
              </span>,
              <span key="drawn">
                <strong>{t("sections.tiers.drawnName")}</strong> —{" "}
                {t("sections.tiers.drawnBody")}
              </span>,
            ]}
          />
        </LegalSection>

        <LegalSection title={t("sections.whenRequired.title")}>
          <LegalParagraph>{t("sections.whenRequired.intro")}</LegalParagraph>
          <LegalMutedText>{t("sections.whenRequired.disclaimer")}</LegalMutedText>
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
