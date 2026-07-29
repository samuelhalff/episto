import { and, eq, gt } from "drizzle-orm";

import type { Db } from "../../db/index.js";
import { schema } from "../../db/index.js";
import { generateResumeToken, hashResumeToken } from "../sessions/session.service.js";

/**
 * Withdraw every link that currently opens an order, and mint the generation
 * that replaces them.
 *
 * The download link is a bearer credential with the lifetime of the retention
 * window — weeks. Forwarded to the wrong address, or left in a mailbox that
 * later changes hands, it was until now impossible to take back: the signed
 * form carries no server-side state, and the opaque form is only one row. This
 * moves the access-token hash on, which is what both forms are checked against,
 * so the moment it returns every outstanding link is dead.
 *
 * The expiry is deliberately left where it was. Rotating is not the same as
 * revoking access to the order — the customer still owns it and still needs to
 * reach it; they are replacing the key, not changing the lock's schedule. The
 * caller is responsible for delivering the new link, which is why this returns
 * false rather than throwing when there was no live access to rotate: an order
 * whose access has already lapsed or been erased has nothing to replace.
 */
/**
 * Whether a replacement link can actually be delivered for this order.
 *
 * Checked before rotating, never after. The replacement is sent as the receipt
 * email, which needs both an address to send to and a stored receipt to attach;
 * without either, rotating would destroy the customer's only way in and hand
 * them a promise of a new link that never arrives. Refusing up front leaves
 * them with the link they have and a support address to write to, which is a
 * far better place to be stuck.
 */
export async function canDeliverReplacementLink(
  db: Db,
  payment: { id: string; sessionId: string },
): Promise<boolean> {
  const [[session], [receipt]] = await Promise.all([
    db
      .select({ email: schema.sessions.email })
      .from(schema.sessions)
      .where(eq(schema.sessions.id, payment.sessionId))
      .limit(1),
    db
      .select({ id: schema.receipts.id })
      .from(schema.receipts)
      .where(eq(schema.receipts.paymentAttemptId, payment.id))
      .limit(1),
  ]);

  return Boolean(session?.email && receipt);
}

/**
 * Rotate, but only from the generation the caller actually authenticated with.
 *
 * The compare-and-set on the hash is what makes this endpoint one-shot. Without
 * it, two requests carrying the same old link both pass resolution, both rotate,
 * and the second one invalidates the link the first is already composing an
 * email around — so the message that arrives last is the one that no longer
 * works. Requiring the hash to still be the one that opened the order means the
 * loser of that race rotates nothing and is told so, rather than half-succeeding.
 *
 * The expiry is checked here too, not merely required to be non-null: an order
 * whose access window has closed has nothing left to hand back, and minting it a
 * fresh credential would reopen it.
 */
export async function rotateOrderAccessToken(
  db: Db,
  paymentAttemptId: string,
  currentTokenHash: string,
): Promise<boolean> {
  const rotated = await db
    .update(schema.paymentAttempts)
    .set({ orderAccessTokenHash: hashResumeToken(generateResumeToken()) })
    .where(
      and(
        eq(schema.paymentAttempts.id, paymentAttemptId),
        eq(schema.paymentAttempts.orderAccessTokenHash, currentTokenHash),
        gt(schema.paymentAttempts.orderAccessTokenExpiresAt, new Date()),
      ),
    )
    .returning({ id: schema.paymentAttempts.id });

  return rotated.length > 0;
}
