import { eq } from "drizzle-orm";
import { buildOrderReference } from "@swiss-mail/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { getQueue, QUEUE_NAMES, type SendEmailJob } from "../../queue/index.js";
import { env } from "../../shared/config/index.js";
import type { PaymentAttemptRow } from "../payments/payment.service.js";

function resolvePersonName(
  value: {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
  } | null,
): string {
  if (!value) return "";
  return (
    [value.firstName, value.lastName].filter(Boolean).join(" ").trim() ||
    value.company?.trim() ||
    ""
  );
}

/**
 * Enqueue dispatch confirmation email — sent once when payment is captured.
 *
 * This is a service email confirming that the order has been received and
 * dispatch is in progress.  It contains a link to the dispatch statement
 * (valid for STATEMENT_RETENTION_DAYS).
 *
 * Payment receipt responsibility belongs to Stripe — this email must NOT
 * include receipt wording, attached PDFs, or payment breakdowns.
 */
export async function enqueueDispatchConfirmationEmail(
  db: Db,
  payment: PaymentAttemptRow,
  rawOrderAccessToken: string,
): Promise<void> {
  const [[sessionRow], [draft]] = await Promise.all([
    db
      .select({
        email: schema.sessions.email,
        locale: schema.sessions.locale,
      })
      .from(schema.sessions)
      .where(eq(schema.sessions.id, payment.sessionId))
      .limit(1),
    db
      .select({
        deliveryType: schema.draftLetters.deliveryType,
        senderProfileId: schema.draftLetters.senderProfileId,
        recipientProfileId: schema.draftLetters.recipientProfileId,
      })
      .from(schema.draftLetters)
      .where(eq(schema.draftLetters.id, payment.draftId))
      .limit(1),
  ]);

  if (!sessionRow?.email) return;

  const locale = sessionRow.locale ?? "en-CH";
  const orderRef = buildOrderReference(payment.draftId);
  const config = env();
  const siteUrl =
    config.APP_PUBLIC_URL ??
    config.CORS_ORIGIN.split(",")[0]?.trim() ??
    config.CORS_ORIGIN;
  const downloadUrl = `${siteUrl}/api/v1/orders/${rawOrderAccessToken}/pdf`;

  const senderProfilePromise = draft?.senderProfileId
    ? db
        .select({
          firstName: schema.senderProfiles.firstName,
          lastName: schema.senderProfiles.lastName,
          company: schema.senderProfiles.company,
        })
        .from(schema.senderProfiles)
        .where(eq(schema.senderProfiles.id, draft.senderProfileId))
        .limit(1)
    : Promise.resolve([]);
  const recipientProfilePromise = draft?.recipientProfileId
    ? db
        .select({
          firstName: schema.recipientProfiles.firstName,
          lastName: schema.recipientProfiles.lastName,
          company: schema.recipientProfiles.company,
        })
        .from(schema.recipientProfiles)
        .where(eq(schema.recipientProfiles.id, draft.recipientProfileId))
        .limit(1)
    : Promise.resolve([]);
  const [[senderProfile], [recipientProfile]] = await Promise.all([
    senderProfilePromise,
    recipientProfilePromise,
  ]);

  const job: SendEmailJob = {
    to: sessionRow.email,
    template: "dispatch-confirmation",
    locale,
    data: {
      brandName: config.APP_DISPLAY_NAME,
      supportEmail: config.SUPPORT_EMAIL,
      statementRetentionDays: config.STATEMENT_RETENTION_DAYS,
      orderRef,
      deliveryType: draft?.deliveryType ?? "standard",
      downloadUrl,
      senderName: resolvePersonName(senderProfile ?? null),
      recipientName: resolvePersonName(recipientProfile ?? null),
      amountCents: payment.amountCents,
      currency: payment.currency,
      appPublicUrl: siteUrl,
      legalEntityName: config.LEGAL_ENTITY_NAME,
      legalEntityAddress: `${config.LEGAL_ENTITY_ADDRESS_LINE_1}, ${config.LEGAL_ENTITY_ADDRESS_LINE_2}`,
      legalEntityCountry: config.LEGAL_ENTITY_COUNTRY,
      legalEntityUidVat: config.LEGAL_ENTITY_UID_VAT,
    },
  };

  await getQueue(QUEUE_NAMES.SEND_EMAIL).add("dispatch-confirmation", job, {
    jobId: `dispatch-confirmation-${payment.id}`,
  });
}
