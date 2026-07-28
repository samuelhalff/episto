import { createHash, createHmac, randomBytes } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";

import { schema, type Db } from "../../db/index.js";
import { env, isEnvLoaded } from "../../shared/config/index.js";
import { AppError } from "../../shared/errors/index.js";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * The personal data that never lived in the draft.
 *
 * Erasure used to stop at the letter: subject, body, profiles, files,
 * conversation. Everything a support agent would actually use to find the
 * person again sat one table over — the session's own email, phone and IP, the
 * verification rows holding the same phone, the analytics trail keyed by
 * session id, and the phone copied onto the payment at checkout. A request to
 * be forgotten that leaves those behind has not been honoured.
 */

/**
 * A payment that is neither settled nor dead, or a letter that may still be
 * posted. Erasing underneath either one is how a user ends up charged for a
 * letter nobody can reconstruct, or refunded for one Swiss Post delivered.
 */
const IN_FLIGHT_PAYMENT_STATES = ["pending", "authorized", "refund_pending"];

/** Money actually moved. These drafts are accounting records and are kept. */
const SETTLED_PAID_STATES = ["captured", "refunded", "partially_refunded"];
/**
 * The letter left the building. Kept as proof of what was sent, to whom.
 *
 * `reconciled` belongs here: it is only ever reached from `submitted`, so the
 * history proves the provider took the letter. Leaving it out meant erasure
 * would clear the snapshot, the profiles and the enclosures of a letter that
 * had actually been posted — precisely the record we may later have to produce.
 */
const SENT_DISPATCH_STATES = ["submitted", "accepted", "reconciled"];

/**
 * How long an `unknown` dispatch blocks an erasure.
 *
 * `unknown` means we do not know whether Swiss Post has the letter. While
 * reconciliation still has a chance of answering — the liveness sweep re-drives
 * it every ten minutes — erasure waits. After that it has to stop waiting: an
 * attempt that never obtained a `provider_reference` can be reconciled neither
 * automatically nor by hand, so blocking on it would make erasure permanently
 * impossible for that session. Past the window the letter is treated as sent,
 * which is the conservative reading of "we cannot prove it was not".
 */
const UNKNOWN_DISPATCH_GRACE_HOURS = 24;

/**
 * Erasure waits for the order to finish; it does not race it.
 *
 * The wait is bounded — a payment intent expires, and the dispatch liveness
 * sweep resolves a stuck attempt within ten minutes — so refusing here costs
 * the operator a retry, not the user their right: FADP and GDPR both measure
 * erasure in weeks. The alternative, scrubbing while a worker holds the draft
 * in memory, decides nothing safely.
 */
export async function assertNothingInFlight(tx: Tx, draftIds: string[]): Promise<void> {
  if (draftIds.length === 0) return;

  const [payment] = await tx
    .select({ id: schema.paymentAttempts.id })
    .from(schema.paymentAttempts)
    .where(
      and(
        inArray(schema.paymentAttempts.draftId, draftIds),
        inArray(schema.paymentAttempts.state, IN_FLIGHT_PAYMENT_STATES as never[]),
      ),
    )
    .limit(1);

  const [dispatch] = await tx
    .select({ id: schema.dispatchAttempts.id })
    .from(schema.dispatchAttempts)
    .where(
      and(
        inArray(schema.dispatchAttempts.draftId, draftIds),
        sql`(
          ${schema.dispatchAttempts.state} = 'queued'
          OR (
            ${schema.dispatchAttempts.state} = 'unknown'
            AND ${schema.dispatchAttempts.updatedAt} >
                NOW() - make_interval(hours => ${UNKNOWN_DISPATCH_GRACE_HOURS})
          )
        )`,
      ),
    )
    .limit(1);

  if (!payment && !dispatch) return;

  throw new AppError({
    family: "validation_error",
    statusCode: 409,
    code: "ERASURE_BLOCKED_IN_FLIGHT",
    message: payment
      ? "Session has a payment still in flight; erase once it settles."
      : "Session has a letter that may still be posted; erase once dispatch resolves.",
    userMessage:
      "This order is still being processed. The erasure will complete once it finishes.",
    userAction: null,
  });
}

/**
 * Which drafts have to be kept.
 *
 * The first version asked the *latest* payment row per draft. That is the wrong
 * question: a user who pays, gets refunded, and retries with a card that fails
 * leaves a `failed` row on top of a `refunded` one, and the draft behind a real
 * charge would have been scrubbed. Any settled payment or any letter that left
 * is enough — hence a set built from every matching row, not the newest.
 */
export async function findRetainedDraftIds(
  tx: Tx,
  draftIds: string[],
): Promise<Set<string>> {
  if (draftIds.length === 0) return new Set();

  const paid = await tx
    .selectDistinct({ draftId: schema.paymentAttempts.draftId })
    .from(schema.paymentAttempts)
    .where(
      and(
        inArray(schema.paymentAttempts.draftId, draftIds),
        inArray(schema.paymentAttempts.state, SETTLED_PAID_STATES as never[]),
      ),
    );

  // An `unknown` attempt that has outlived the grace window above no longer
  // blocks the erasure — so it has to be retained instead. Scrubbing it would
  // destroy the only copy of a letter that may well be in the post.
  const sent = await tx
    .selectDistinct({ draftId: schema.dispatchAttempts.draftId })
    .from(schema.dispatchAttempts)
    .where(
      and(
        inArray(schema.dispatchAttempts.draftId, draftIds),
        inArray(schema.dispatchAttempts.state, [
          ...SENT_DISPATCH_STATES,
          "unknown",
        ] as never[]),
      ),
    );

  return new Set([...paid, ...sent].map((row) => row.draftId));
}

/**
 * Domain-separated so the audit digest cannot be replayed against any other
 * use of this secret, and so rotating the order-token secret is visible as a
 * key version rather than as silently mismatched digests.
 */
const ERASURE_DIGEST_LABEL = "episto.erasure-audit.v1";
export const ERASURE_KEY_VERSION = 1;

/**
 * Read straight from the environment when the validated config has not been
 * loaded. Erasure has to work in a migration script or an integration test that
 * never boots the app, and the label above already isolates this use from the
 * token signing the value is otherwise used for. An unset secret is fatal: a
 * guessable digest is a re-identification key.
 */
function erasureDigestSecret(): string {
  const secret = isEnvLoaded()
    ? env().ORDER_ACCESS_TOKEN_SECRET
    : process.env.ORDER_ACCESS_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ORDER_ACCESS_TOKEN_SECRET must be set (32+ chars) to record an erasure audit",
    );
  }
  return secret;
}

export function erasureSubjectDigest(sessionId: string): string {
  return createHmac("sha256", erasureDigestSecret())
    .update(`${ERASURE_DIGEST_LABEL}:${sessionId}`)
    .digest("hex");
}

/**
 * `resume_token_hash` is NOT NULL and unique, so it cannot simply be cleared.
 * It is replaced with the hash of a token nobody holds, which is what actually
 * kills the magic-resume link: `session.service.ts` hashes the presented token
 * and looks for a match.
 */
function unreachableResumeTokenHash(): string {
  return createHash("sha256").update(randomBytes(32)).digest("hex");
}

/**
 * Scrub every identifier attached to the session itself.
 *
 * Runs for paid sessions too. None of these fields is an accounting record —
 * the invoice, the amount, the VAT and the Stripe ids all live on
 * `payment_attempts` and `receipts` and are untouched. What goes is the ability
 * to contact or re-identify the person from our own database.
 */
export async function scrubSessionIdentifiers(
  tx: Tx,
  sessionId: string,
  draftIds: string[],
): Promise<void> {
  const now = new Date();

  await tx
    .update(schema.sessions)
    .set({
      email: null,
      phoneE164: null,
      ipAddress: null,
      phoneVerifiedAt: null,
      resumeTokenHash: unreachableResumeTokenHash(),
      resumeTokenExpiresAt: now,
      expiresAt: now,
      updatedAt: now,
    })
    .where(eq(schema.sessions.id, sessionId));

  // The phone lives here in clear text, once per send. `code_hash` is NOT NULL,
  // so it is overwritten rather than cleared — a hash of nothing anyone holds
  // is as good as absent, and it keeps the row's shape for the rate limiter.
  await tx
    .update(schema.phoneVerifications)
    .set({
      phoneE164: "[erased]",
      codeHash: unreachableResumeTokenHash(),
      providerMessageId: null,
      ipAddress: null,
      userAgent: null,
      updatedAt: now,
    })
    .where(eq(schema.phoneVerifications.sessionId, sessionId));

  // Copied verification data, not an accounting field: the amount, the VAT and
  // the Stripe references stay. The order-access token is revoked at the same
  // time, because a link that still opens the retained order would hand the
  // erased identity straight back.
  await tx
    .update(schema.paymentAttempts)
    .set({
      verifiedPhoneE164: null,
      orderAccessTokenHash: null,
      orderAccessTokenExpiresAt: null,
      updatedAt: now,
    })
    .where(eq(schema.paymentAttempts.sessionId, sessionId));

  // Behavioural analytics. There is no legitimate interest in keeping a
  // per-session funnel for someone who asked to be forgotten, and the rows are
  // worthless in aggregate once the session id is gone anyway.
  await tx
    .delete(schema.productEvents)
    .where(eq(schema.productEvents.sessionId, sessionId));
  if (draftIds.length > 0) {
    await tx
      .delete(schema.productEvents)
      .where(inArray(schema.productEvents.draftId, draftIds));
  }

  // Support events are the operational audit trail and are kept — but their
  // `details` blob is free text written by hand and by error paths, so it is
  // exactly where a phone number or an address ends up. The event type, the
  // actor and the timestamp are the audit; the payload is not.
  await tx
    .update(schema.supportEvents)
    .set({ details: sql`jsonb_build_object('redacted', true)` })
    .where(eq(schema.supportEvents.sessionId, sessionId));
  if (draftIds.length > 0) {
    await tx
      .update(schema.supportEvents)
      .set({ details: sql`jsonb_build_object('redacted', true)` })
      .where(inArray(schema.supportEvents.draftId, draftIds));
  }
}

/**
 * Free-text columns on rows that survive the erasure.
 *
 * Runs over *every* draft in the session, retained or not. Scrubbing only the
 * retained ones was the obvious mistake: an erasable draft's `file_assets` row
 * outlives the objects it points at — the cleanup worker retires the object and
 * leaves the row — so its `original_filename`, frequently the user's own name,
 * survived an erasure that reported success. `payment_attempts` rows for failed
 * checkouts are never deleted either, and their `failure_reason` is prose.
 */
export async function scrubFreeText(tx: Tx, draftIds: string[]): Promise<void> {
  if (draftIds.length === 0) return;

  await tx
    .update(schema.fileAssets)
    .set({ originalFilename: null })
    .where(inArray(schema.fileAssets.draftId, draftIds));

  await tx
    .update(schema.paymentAttempts)
    .set({ failureReason: null, refundReason: null })
    .where(inArray(schema.paymentAttempts.draftId, draftIds));
}
