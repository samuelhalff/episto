import { eq } from "drizzle-orm";
import { buildOrderReference } from "@swiss-mail/shared";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { env } from "../../shared/config/index.js";
import { issueOrderAccessToken } from "../orders/order-access-token.js";

function resolvePersonName(
  value: { firstName?: string | null; lastName?: string | null; company?: string | null } | null,
): string {
  return (
    [value?.firstName, value?.lastName].filter(Boolean).join(" ").trim() ||
    value?.company?.trim() ||
    ""
  );
}

export async function buildDispatchEmailContext(
  db: Db,
  args: { draftId: string; paymentId: string },
) {
  const [[payment], [draft]] = await Promise.all([
    db
      .select()
      .from(schema.paymentAttempts)
      .where(eq(schema.paymentAttempts.id, args.paymentId))
      .limit(1),
    db
      .select()
      .from(schema.draftLetters)
      .where(eq(schema.draftLetters.id, args.draftId))
      .limit(1),
  ]);

  if (!payment || !draft || !payment.orderAccessTokenExpiresAt) {
    return null;
  }

  const [[sender], [recipient]] = await Promise.all([
    draft.senderProfileId
      ? db
          .select({
            firstName: schema.senderProfiles.firstName,
            lastName: schema.senderProfiles.lastName,
            company: schema.senderProfiles.company,
          })
          .from(schema.senderProfiles)
          .where(eq(schema.senderProfiles.id, draft.senderProfileId))
          .limit(1)
      : Promise.resolve([]),
    draft.recipientProfileId
      ? db
          .select({
            firstName: schema.recipientProfiles.firstName,
            lastName: schema.recipientProfiles.lastName,
            company: schema.recipientProfiles.company,
          })
          .from(schema.recipientProfiles)
          .where(eq(schema.recipientProfiles.id, draft.recipientProfileId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const [session] = await db
    .select({ email: schema.sessions.email, locale: schema.sessions.locale })
    .from(schema.sessions)
    .where(eq(schema.sessions.id, payment.sessionId))
    .limit(1);

  if (!session?.email) return null;

  const config = env();
  const fallbackOrigin = config.CORS_ORIGIN.split(",")[0]?.trim();
  const siteUrl = config.APP_PUBLIC_URL ?? fallbackOrigin;
  if (!siteUrl) {
    return null;
  }
  const token = await issueOrderAccessToken({
    paymentAttemptId: payment.id,
    expiresAt: payment.orderAccessTokenExpiresAt,
  });

  return {
    to: session.email,
    locale: session.locale ?? "en-CH",
    orderRef: buildOrderReference(args.draftId),
    statusUrl: `${siteUrl}/status/${token}`,
    downloadUrl: `${siteUrl}/api/v1/orders/${token}/pdf`,
    deliveryType: draft.deliveryType,
    senderName: resolvePersonName(sender ?? null),
    recipientName: resolvePersonName(recipient ?? null),
    statementRetentionDays: config.STATEMENT_RETENTION_DAYS,
    appPublicUrl: siteUrl,
    brandName: config.APP_DISPLAY_NAME,
    supportEmail: config.SUPPORT_EMAIL,
    legalEntityName: config.LEGAL_ENTITY_NAME,
    legalEntityAddress: `${config.LEGAL_ENTITY_ADDRESS_LINE_1}, ${config.LEGAL_ENTITY_ADDRESS_LINE_2}`,
    legalEntityCountry: config.LEGAL_ENTITY_COUNTRY,
    legalEntityUidVat: config.LEGAL_ENTITY_UID_VAT,
  };
}
