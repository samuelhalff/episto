import { eq } from "drizzle-orm";
import { PaymentBreakdownSchema } from "@swiss-mail/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { getQueue, QUEUE_NAMES, type SendEmailJob } from "../../queue/index.js";
import { env } from "../../shared/config/index.js";
import { getOrderIssuedAt } from "../orders/order-access-window.js";
import type { PaymentAttemptRow } from "./payment.service.js";

function resolvePersonName(value: {
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
} | null): string {
  if (!value) {
    return "";
  }

  return (
    [value.firstName, value.lastName].filter(Boolean).join(" ").trim() ||
    value.company?.trim() ||
    ""
  );
}

export async function enqueuePaymentReceiptEmail(
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

  if (!sessionRow?.email) {
    return;
  }

  const locale = sessionRow.locale ?? "en-CH";
  const orderRef = `SM-${payment.draftId.slice(0, 8).toUpperCase()}`;
  const config = env();
  const siteUrl = config.CORS_ORIGIN.split(",")[0]?.trim() ?? config.CORS_ORIGIN;
  const statusUrl = `${siteUrl}/${locale}/status/${rawOrderAccessToken}`;
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
  const breakdown = PaymentBreakdownSchema.safeParse(payment.breakdown);
  const issuedAt = getOrderIssuedAt(payment.orderAccessTokenExpiresAt) ?? payment.updatedAt;

  const job: SendEmailJob = {
    to: sessionRow.email,
    template: "payment-receipt",
    locale,
    data: {
      brandName: config.APP_DISPLAY_NAME,
      supportEmail: config.SUPPORT_EMAIL,
      statementRetentionDays: config.STATEMENT_RETENTION_DAYS,
      orderRef,
      issuedAt: issuedAt.toISOString(),
      amount: (payment.amountCents / 100).toFixed(2),
      amountCents: payment.amountCents,
      currency: payment.currency,
      deliveryType: draft?.deliveryType ?? "standard",
      statusUrl,
      customerEmail: sessionRow.email,
      senderName: resolvePersonName(senderProfile ?? null),
      recipientName: resolvePersonName(recipientProfile ?? null),
      lineItems: breakdown.success
        ? breakdown.data.lineItems.map((item) => ({
            label: item.label,
            amountCents: item.amountCents,
          }))
        : [],
      legalEntity: {
        name: config.LEGAL_ENTITY_NAME,
        addressLines: [
          config.LEGAL_ENTITY_ADDRESS_LINE_1,
          config.LEGAL_ENTITY_ADDRESS_LINE_2,
          config.LEGAL_ENTITY_COUNTRY,
        ].filter(Boolean),
        uidVat: config.LEGAL_ENTITY_UID_VAT,
      },
      stripeReferences: {
        paymentIntentId: payment.stripePaymentIntentId,
        chargeId: payment.stripeChargeId,
      },
    },
  };

  await getQueue(QUEUE_NAMES.SEND_EMAIL).add("payment-receipt", job);
}
