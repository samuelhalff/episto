import { eq } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { getQueue, QUEUE_NAMES, type SendEmailJob } from "../../queue/index.js";
import { env } from "../../shared/config/index.js";

export async function enqueueDispatchAcceptedEmail(
  db: Db,
  args: {
    dispatchAttemptId: string;
    draftId: string;
    providerReference: string | null;
    trackingNumber: string | null;
    rawOrderAccessToken: string | null;
  },
): Promise<void> {
  const [draft] = await db
    .select({
      sessionId: schema.draftLetters.sessionId,
    })
    .from(schema.draftLetters)
    .where(eq(schema.draftLetters.id, args.draftId))
    .limit(1);

  if (!draft) {
    return;
  }

  const [session] = await db
    .select({
      email: schema.sessions.email,
      locale: schema.sessions.locale,
    })
    .from(schema.sessions)
    .where(eq(schema.sessions.id, draft.sessionId))
    .limit(1);

  if (!session?.email) {
    return;
  }

  const locale = session.locale ?? "en-CH";
  const orderRef = `SM-${args.draftId.slice(0, 8).toUpperCase()}`;
  const config = env();
  const siteUrl = config.APP_PUBLIC_URL
    ?? config.CORS_ORIGIN.split(",")[0]?.trim()
    ?? config.CORS_ORIGIN;
  const downloadUrl = args.rawOrderAccessToken
    ? `${siteUrl}/api/v1/orders/${args.rawOrderAccessToken}/pdf`
    : null;

  const job: SendEmailJob = {
    to: session.email,
    template: "dispatch-accepted",
    locale,
    data: {
      orderRef,
      providerReference: args.providerReference,
      trackingNumber: args.trackingNumber,
      ...(downloadUrl ? { downloadUrl } : {}),
      statementRetentionDays: config.STATEMENT_RETENTION_DAYS,
      appPublicUrl: siteUrl,
      brandName: config.APP_DISPLAY_NAME,
      supportEmail: config.SUPPORT_EMAIL,
      legalEntityName: config.LEGAL_ENTITY_NAME,
      legalEntityAddress: `${config.LEGAL_ENTITY_ADDRESS_LINE_1}, ${config.LEGAL_ENTITY_ADDRESS_LINE_2}`,
      legalEntityCountry: config.LEGAL_ENTITY_COUNTRY,
      legalEntityUidVat: config.LEGAL_ENTITY_UID_VAT,
    },
  };

  await getQueue(QUEUE_NAMES.SEND_EMAIL).add("dispatch-accepted", job, {
    jobId: `dispatch-accepted-${args.dispatchAttemptId}`,
  });
}
