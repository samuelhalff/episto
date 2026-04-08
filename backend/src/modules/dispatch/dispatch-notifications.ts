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
  const siteUrl = env().CORS_ORIGIN.split(",")[0]?.trim() ?? env().CORS_ORIGIN;
  const statusUrl = args.rawOrderAccessToken
    ? `${siteUrl}/${locale}/status/${args.rawOrderAccessToken}`
    : null;

  const job: SendEmailJob = {
    to: session.email,
    template: "dispatch-accepted",
    locale,
    data: {
      orderRef,
      providerReference: args.providerReference,
      trackingNumber: args.trackingNumber,
      ...(statusUrl ? { statusUrl } : {}),
    },
  };

  await getQueue(QUEUE_NAMES.SEND_EMAIL).add("dispatch-accepted", job, {
    jobId: `dispatch-accepted-${args.dispatchAttemptId}`,
  });
}
