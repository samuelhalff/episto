import { eq } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { getQueue, QUEUE_NAMES, type SendEmailJob } from "../../queue/index.js";
import { env } from "../../shared/config/index.js";
import type { PaymentAttemptRow } from "./payment.service.js";

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
      .select({ deliveryType: schema.draftLetters.deliveryType })
      .from(schema.draftLetters)
      .where(eq(schema.draftLetters.id, payment.draftId))
      .limit(1),
  ]);

  if (!sessionRow?.email) {
    return;
  }

  const locale = sessionRow.locale ?? "en-CH";
  const orderRef = `SM-${payment.draftId.slice(0, 8).toUpperCase()}`;
  const siteUrl = env().CORS_ORIGIN.split(",")[0]?.trim() ?? env().CORS_ORIGIN;
  const statusUrl = `${siteUrl}/${locale}/status/${rawOrderAccessToken}`;

  const job: SendEmailJob = {
    to: sessionRow.email,
    template: "payment-receipt",
    locale,
    data: {
      orderRef,
      amount: (payment.amountCents / 100).toFixed(2),
      deliveryType: draft?.deliveryType ?? "standard",
      statusUrl,
    },
  };

  await getQueue(QUEUE_NAMES.SEND_EMAIL).add("payment-receipt", job);
}
