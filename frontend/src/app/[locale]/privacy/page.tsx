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
    <LegalPageLayout>
      <LegalPageHeader
        title={t("privacyTitle")}
        description={
          <>
            How {LEGAL_OPERATOR.companyName} processes personal data when you use{" "}
            {LEGAL_SERVICE_NAME}.
          </>
        }
        eyebrow={
          <MarketingMeta
            as="p"
            className="text-[11px] font-semibold uppercase tracking-widest"
          >
            {t("privacyLastUpdated")}
          </MarketingMeta>
        }
        notice={
          !isEnglishReference ? (
            <LegalReferenceNotice>
              English reference version. Reviewed translations are not yet published. If
              future translations differ from this text, the English version prevails.
            </LegalReferenceNotice>
          ) : undefined
        }
      />

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
            processing, address lookup where used, and postal dispatch. Where necessary
            for the service, relevant data is shared with Swiss Post / ePost and other
            production or delivery subcontractors.
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

        <LegalSection title="Analytics (Google Analytics)">
          <LegalParagraph>
            We use Google Analytics 4 to understand how the site is used and to improve
            it. It loads only after you grant analytics consent in the privacy banner. If
            you decline, no analytics cookies are set and no data is sent to Google. You
            can revoke consent at any time by clearing this site&rsquo;s data in your
            browser.
          </LegalParagraph>
          <LegalParagraph>
            When enabled, Google Analytics sets cookies and processes usage data (such as
            pages viewed, approximate location, and device and browser information) on our
            behalf. The provider is Google; see{" "}
            <LegalExternalLink href="https://policies.google.com/privacy">
              Google&rsquo;s privacy policy
            </LegalExternalLink>
            .
          </LegalParagraph>
        </LegalSection>

        <LegalSection title="Retention">
          <LegalParagraph>
            We retain data only for as long as needed for service delivery, support, abuse
            prevention, dispute handling, and legal retention duties. Payment and
            accounting data may be retained longer where required by law.
          </LegalParagraph>
        </LegalSection>

        <LegalSection title="Your rights">
          <LegalParagraph>
            Subject to applicable Swiss data-protection law, you may request access,
            correction, deletion, restriction where applicable, and information about the
            main processing of your personal data.
          </LegalParagraph>
        </LegalSection>

        <LegalSection title={t("addressAssistTitle")}>
          <LegalParagraph>{t("addressAssistBody")}</LegalParagraph>
        </LegalSection>

        <LegalSection title="Reference language">
          <LegalParagraph>
            This policy is maintained in {LEGAL_REFERENCE_LANGUAGE}. Any translation is
            provided for convenience only. If a translation differs, the{" "}
            {LEGAL_REFERENCE_LANGUAGE} version prevails.
          </LegalParagraph>
        </LegalSection>
      </LegalPageStack>
    </LegalPageLayout>
  );
}
