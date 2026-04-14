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
    <LegalPageLayout>
      <LegalPageHeader
        title={t("imprintTitle")}
        notice={
          !isEnglishReference ? (
            <LegalReferenceNotice>
              English reference version. Reviewed translations are not yet published.
            </LegalReferenceNotice>
          ) : undefined
        }
      />

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
    </LegalPageLayout>
  );
}
