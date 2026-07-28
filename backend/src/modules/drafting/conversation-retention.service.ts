import { sql } from "drizzle-orm";

import type { Db } from "../../db/index.js";

/**
 * Retention for the conversation itself.
 *
 * `conversation_messages.content` is the user's own account of their situation
 * — "my landlord kept the deposit", "my contract number is 4711" — which is at
 * least as sensitive as the letter it produces. Until now nothing collected it
 * on a schedule: admin erasure was the only path, so an abandoned draft kept
 * its conversation forever (docs/data-retention.md).
 *
 * Rows are deleted rather than blanked. Nulling `content` would mean making a
 * NOT NULL column nullable and would still leave `tool_calls`, which can carry
 * the same content in another shape.
 */

/**
 * A draft is only collected as a whole. Deleting half a conversation would
 * leave a history that reads as complete but is not — worse for anyone
 * reopening the draft than an empty one.
 */
export async function purgeExpiredConversations(
  db: Db,
  retentionDays: number,
  batchSize: number,
): Promise<number> {
  const result = await db.execute<{ id: string }>(sql`
    DELETE FROM conversation_messages
    WHERE draft_id IN (
      SELECT d.id
      FROM draft_letters d
      WHERE EXISTS (
          SELECT 1 FROM conversation_messages cm WHERE cm.draft_id = d.id
        )
        -- Never collect a draft that still has a letter waiting to go out:
        -- the conversation is the context a retry redrafts from. Only
        -- 'queued' counts as waiting — a rejected attempt also has a null
        -- submitted_at, and treating that as pending would retain the
        -- conversation forever.
        AND NOT EXISTS (
          SELECT 1 FROM dispatch_attempts pending
          WHERE pending.draft_id = d.id
            AND pending.state = 'queued'
            AND pending.submitted_at IS NULL
        )
        AND (
          -- Abandoned: nothing was ever sent, and either the session has
          -- expired or the draft has simply aged out.
          (
            NOT EXISTS (
              SELECT 1 FROM dispatch_attempts sent
              WHERE sent.draft_id = d.id AND sent.submitted_at IS NOT NULL
            )
            AND (
              d.created_at < NOW() - make_interval(days => ${retentionDays})
              OR EXISTS (
                SELECT 1 FROM sessions s
                WHERE s.id = d.session_id AND s.expires_at <= NOW()
              )
            )
          )
          -- Dispatched: measured from the LATEST submission. Measuring from
          -- any submission would let a first attempt from weeks ago retire
          -- the conversation behind a letter that went out yesterday.
          OR EXISTS (
            SELECT 1 FROM dispatch_attempts sent
            WHERE sent.draft_id = d.id
              AND sent.submitted_at IS NOT NULL
              AND sent.submitted_at < NOW() - make_interval(days => ${retentionDays})
              AND NOT EXISTS (
                SELECT 1 FROM dispatch_attempts newer
                WHERE newer.draft_id = d.id
                  AND newer.submitted_at IS NOT NULL
                  AND newer.submitted_at > sent.submitted_at
              )
          )
        )
      ORDER BY d.created_at, d.id
      LIMIT ${batchSize}
    )
    RETURNING id
  `);

  return result.rows.length;
}
