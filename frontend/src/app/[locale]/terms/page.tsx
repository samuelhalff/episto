import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Link } from "@/i18n/navigation";
import {
  LegalCallout,
  LegalExternalLink,
  LegalList,
  LegalMutedText,
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
              {t("termsLastUpdated")}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-zinc-950 dark:text-zinc-50 md:text-4xl">
              {t("termsTitle")}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
              Terms for using {LEGAL_SERVICE_NAME}, the letter-preparation and
              dispatch-submission service operated by {LEGAL_OPERATOR.companyName}.
            </p>
          </header>

          <LegalPageStack>
            <LegalCallout title="Important">
              <LegalList
                items={[
                  "Your contract is with West Bay SA, not with Swiss Post.",
                  "At least one day is required, at the earliest, before your PDF can be printed and handed over to Swiss Post delivery services.",
                  "Do not use the service if you need to meet a deadline that expires on the day your order is confirmed on the website.",
                  "Once Swiss Post has taken over, printing, transport, tracking, returns, and delivery are outside our control.",
                ]}
              />
            </LegalCallout>

            <LegalSection title="1. Operator and scope">
              <LegalParagraph>
                {LEGAL_SERVICE_NAME} is operated by {LEGAL_OPERATOR.companyName}. It helps
                you prepare a letter, generate the final PDF, and submit the order for
                physical dispatch in Switzerland.
              </LegalParagraph>
              <LegalParagraph>
                The service does not operate its own print works, transport chain, or
                delivery network. Your contract is with {LEGAL_OPERATOR.companyName}.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="2. Order flow and contract formation">
              <LegalParagraph>
                You review the content, confirm the order, accept these terms, and
                authorize payment. The final server-generated PDF is the version used for
                submission.
              </LegalParagraph>
              <LegalParagraph>
                We may refuse or stop processing before handover if the order is unlawful,
                technically defective, suspicious, or incompatible with provider
                requirements.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="3. Your responsibilities">
              <LegalList
                items={[
                  "You are responsible for the content of the letter, the sender identity used, and the accuracy of sender and recipient details.",
                  "You must have the authority to act for any person or company named as sender.",
                  "You may not use the service for unlawful, deceptive, abusive, or fraudulent communications.",
                  `${LEGAL_SERVICE_NAME} is not a law firm and does not provide legal advice, legal review, or deadline calculation.`,
                ]}
              />
            </LegalSection>

            <LegalSection title="4. Dispatch timing and deadlines">
              <LegalParagraph>
                Order confirmation on the website is not the same as physical handover to
                Swiss Post. At least one day is required, at the earliest, for the PDF to
                be printed and handed over to Swiss Post delivery services.
              </LegalParagraph>
              <LegalParagraph>
                The service does not help you meet a deadline that ends on the same day
                your order is confirmed. If your matter is time-sensitive, you must allow
                enough time for preparation, printing, handover, transport, and delivery.
              </LegalParagraph>
              <LegalParagraph>
                Any delivery indication shown by us is indicative only. We do not
                guarantee a delivery date, proof effect, or legal effect.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="5. Swiss Post and other providers">
              <LegalParagraph>
                After takeover, physical printing, enveloping, transport, tracking, return
                handling, and delivery are performed by Swiss Post / ePost and, where
                needed, their subcontractors.
              </LegalParagraph>
              <LegalParagraph>
                For matters outside our own operational control, the current Swiss Post
                terms and service descriptions apply. See{" "}
                <LegalExternalLink href={SWISS_POST_LINKS.gtc}>
                  Swiss Post GTC
                </LegalExternalLink>
                ,{" "}
                <LegalExternalLink href={SWISS_POST_LINKS.layout}>
                  letter layout guidance
                </LegalExternalLink>
                , and{" "}
                <LegalExternalLink href={SWISS_POST_LINKS.registered}>
                  registered mail information
                </LegalExternalLink>
                .
              </LegalParagraph>
              <LegalParagraph>
                We are not responsible for delay, non-delivery, or other postal incidents
                occurring after Swiss Post takes over, except to the extent mandatory law
                provides otherwise.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="6. Prices, payment, and refunds">
              <LegalParagraph>
                The price shown at checkout is the price for the relevant order. It covers
                the service, provider-side dispatch costs included in that order, and
                payment handling.
              </LegalParagraph>
              <LegalParagraph>
                If an order cannot be processed before handover because of our own fault,
                we may re-perform the service or refund the amount paid. There is no
                refund for a change of mind after handover, or for postal delay or
                delivery issues after handover.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="7. Liability">
              <LegalParagraph>
                To the extent permitted by Swiss law, our total liability arising out of
                or in connection with a specific order is limited to the amount charged
                for that order.
              </LegalParagraph>
              <LegalParagraph>
                We are not liable for indirect loss, lost profit, missed opportunities, or
                loss resulting from missed deadlines, except where liability cannot be
                limited under mandatory law.
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="8. Privacy">
              <LegalParagraph>
                We process personal data only as needed to operate the service,
                communicate with you, prevent abuse, handle payment, and submit the order
                for dispatch. See our{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  Privacy Policy
                </Link>
                .
              </LegalParagraph>
            </LegalSection>

            <LegalSection title="9. Governing law, jurisdiction, and language">
              <LegalParagraph>
                These Terms are governed by Swiss law. Mandatory Swiss consumer
                protections and mandatory places of jurisdiction remain reserved. Subject
                to that reservation, jurisdiction lies at the registered seat of{" "}
                {LEGAL_OPERATOR.companyName}.
              </LegalParagraph>
              <LegalParagraph>
                These Terms are drawn up in {LEGAL_REFERENCE_LANGUAGE}. Any translation is
                provided for convenience only and may contain inconsistencies. In case of
                inconsistency, the {LEGAL_REFERENCE_LANGUAGE} version prevails. The
                English version prevails.
              </LegalParagraph>
            </LegalSection>

            <LegalMutedText>
              Contact: {LEGAL_OPERATOR.companyName}, {LEGAL_OPERATOR.supportEmail}
            </LegalMutedText>
          </LegalPageStack>
        </article>
      </main>
      <Footer />
    </>
  );
}
