import { afterEach, describe, expect, it } from "vitest";

import { transitionDraftStatus } from "../src/modules/drafting/draft.service.js";
import {
  createDraftLockHarness,
  statusOf,
  type DraftLockHarness,
} from "./helpers/draft-lock-harness.js";
import { integrationDatabaseUrl } from "./helpers/postgres-integration.js";

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

/**
 * The user story under test:
 *
 *   A customer taps "send to review", the request is slow, and they tap "back
 *   to editing" — or the app retries, or a second tab is open. Two requests are
 *   then in flight against the same letter, and each asks the same question:
 *   "is this move legal from where the draft is now?"
 *
 * The state machine is only worth anything if the state it is checked against
 * is still the state when the write lands. Read the status, decide, then write
 * on a different connection and both requests are told "yes" from the same
 * starting point: the draft ends up wherever the slower write happens to leave
 * it, including states nothing can reach legally. The customer-visible version
 * is a letter that reopens for editing after review has frozen and queued it
 * for rendering — they edit a letter whose PDF is already being made from a
 * snapshot they can no longer change, and the envelope that arrives is not the
 * one they were last looking at.
 */
describeIfIntegrationDb("draft row lock: concurrent status transitions", () => {
  let harness: DraftLockHarness | null = null;

  afterEach(async () => {
    if (harness) {
      await harness.close();
      harness = null;
    }
  });

  async function setup(): Promise<DraftLockHarness> {
    harness = await createDraftLockHarness();
    return harness;
  }

  function settle<T>(promise: Promise<T>): Promise<T | Error> {
    return promise.then(
      (value) => value,
      (error: unknown) => (error instanceof Error ? error : new Error(String(error))),
    );
  }

  /**
   * Both moves are legal from `fields_complete` and mutually exclusive
   * afterwards, which is what makes the double-write visible: if both commit,
   * the draft's own history contains a step (`reviewed` → `collecting`) the
   * state machine forbids.
   *
   * The interleaving is pinned by holding the draft row from a third
   * connection: both transitions are started and confirmed queued on that row
   * before either can proceed, so this is the real "same instant" case rather
   * than two requests that happened to run back to back.
   */
  it("two transitions racing on the same draft cannot both be granted", async () => {
    const h = await setup();
    const { db } = h;
    const fixture = await h.createFixture();

    const holder = await h.openConnection();
    const reviewer = await h.openConnection();
    const editor = await h.openConnection();

    await holder.client.query("BEGIN");
    await holder.client.query("SELECT id FROM draft_letters WHERE id = $1 FOR UPDATE", [
      fixture.draftId,
    ]);

    const toReviewed = settle(
      transitionDraftStatus(reviewer.db, fixture.draftId, fixture.sessionId, "reviewed"),
    );
    await h.waitUntilBlocked(reviewer);

    const toCollecting = settle(
      transitionDraftStatus(editor.db, fixture.draftId, fixture.sessionId, "collecting"),
    );
    await h.waitUntilBlocked(editor);

    // Neither has read a status yet — that read is the locked one now.
    expect(await statusOf(db, fixture.draftId)).toBe("fields_complete");

    await holder.client.query("COMMIT");

    const outcomes = [await toReviewed, await toCollecting];
    const errors = outcomes.filter((outcome) => outcome instanceof Error);

    expect(errors).toHaveLength(1);
    // The loser is refused for the right reason: it re-read the status the
    // winner committed, and found its move illegal from there.
    expect((errors[0] as Error).message).toMatch(/Invalid draft transition/);

    const winner = outcomes.find((outcome) => !(outcome instanceof Error));
    expect(winner).toBeDefined();
    expect(await statusOf(db, fixture.draftId)).toBe(
      (winner as { status: string }).status,
    );
  });

  /**
   * The same race with the same move twice — a double-submit or a retry landing
   * next to the original request.
   *
   * `reviewed` stamps `reviewed_at`, so letting both through would also move
   * that timestamp after the fact on a letter that is already frozen; the
   * receipt and the letter would then disagree about when the customer approved
   * it. Exactly one is allowed to make the move.
   */
  it("a double-submitted transition is applied once, not twice", async () => {
    const h = await setup();
    const { db } = h;
    const fixture = await h.createFixture();

    const holder = await h.openConnection();
    const first = await h.openConnection();
    const second = await h.openConnection();

    await holder.client.query("BEGIN");
    await holder.client.query("SELECT id FROM draft_letters WHERE id = $1 FOR UPDATE", [
      fixture.draftId,
    ]);

    const attempts = [first, second].map((connection) =>
      settle(
        transitionDraftStatus(
          connection.db,
          fixture.draftId,
          fixture.sessionId,
          "reviewed",
        ),
      ),
    );
    await h.waitUntilBlocked(first);
    await h.waitUntilBlocked(second);

    await holder.client.query("COMMIT");

    const outcomes = await Promise.all(attempts);
    expect(outcomes.filter((outcome) => outcome instanceof Error)).toHaveLength(1);
    expect(await statusOf(db, fixture.draftId)).toBe("reviewed");
  });
});
