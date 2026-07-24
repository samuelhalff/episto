import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import {
  LegalDefinitionList,
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

  return (
    <LegalPageLayout>
      <LegalPageHeader
        title={t("imprintTitle")}
        notice={
          <LegalReferenceNotice>
            {t("imprint.referenceNotice", {
              referenceLanguage: LEGAL_REFERENCE_LANGUAGE,
            })}
          </LegalReferenceNotice>
        }
      />

      <LegalPageStack>
        <LegalSection title={t("imprint.serviceTitle")}>
          <LegalParagraph>
            {t("imprint.serviceBody", {
              serviceName: LEGAL_SERVICE_NAME,
              companyName: LEGAL_OPERATOR.companyName,
            })}
          </LegalParagraph>
        </LegalSection>

        <LegalSection title={t("imprint.operatorDetailsTitle")}>
          <LegalDefinitionList
            items={[
              { label: t("imprint.operatorLabel"), value: LEGAL_OPERATOR.companyName },
              {
                label: t("imprint.addressLabel"),
                value: (
                  <span className="whitespace-pre-line">
                    {LEGAL_OPERATOR.addressLines.join("\n")}
                  </span>
                ),
              },
              {
                label: t("imprint.supportEmailLabel"),
                value: (
                  <a
                    href={`mailto:${LEGAL_OPERATOR.supportEmail}`}
                    className="font-medium text-amber-700 underline underline-offset-4 dark:text-amber-300"
                  >
                    {LEGAL_OPERATOR.supportEmail}
                  </a>
                ),
              },
              { label: t("imprint.websiteLabel"), value: LEGAL_WEBSITE_HOST },
              { label: t("imprint.uidVatLabel"), value: LEGAL_OPERATOR.uidVat },
            ]}
          />
        </LegalSection>
      </LegalPageStack>
    </LegalPageLayout>
  );
}
