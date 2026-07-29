/**
 * The durable half of transactional email, against a real Postgres.
 *
 * The whole point of the outbox is a row that survives things BullMQ does not,
 * so the assertions here are about rows: what is written before the job, what
 * the worker writes back, and what the sweep does with a row whose job Redis
 * has lost. The unique key, the status transitions and the stall arithmetic are
 * the parts that could be wrong, so none of them are mocked.
 *
 * Only the edges are faked: the queue (Redis), the email provider, and the
 * template registry.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sql } from "drizzle-orm";

import type * as ResendAdapterModule from "../src/modules/email/resend.adapter.js";

import {
  createIntegrationDb,
  integrationDatabaseUrl,
} from "./helpers/postgres-integration.js";

type IntegrationDb = Awaited<ReturnType<typeof createIntegrationDb>>["db"];

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
  send: vi.fn(),
  errors: [] as Array<[Record<string, unknown>, string]>,
  infos: [] as Array<[Record<string, unknown>, string]>,
  db: { current: null as unknown },
}));

vi.mock("../src/queue/index.js", () => ({
  getQueue: () => ({ add: mocks.add }),
  QUEUE_NAMES: { SEND_EMAIL: "send-email" },
}));

vi.mock("../src/db/index.js", () => ({
  getDb: () => mocks.db.current,
}));

// Only the network call is faked. The permanent/retryable classification is the
// real one, because "which errors stop the retry budget" is exactly what these
// tests are checking.
vi.mock("../src/modules/email/index.js", async () => {
  const adapter = await vi.importActual<typeof ResendAdapterModule>(
    "../src/modules/email/resend.adapter.js",
  );
  return {
    sendEmail: mocks.send,
    isPermanentEmailError: adapter.isPermanentEmailError,
    EmailProviderError: adapter.EmailProviderError,
  };
});

vi.mock("../src/workers/email-templates.js", () => ({
  renderTemplate: () => ({ subject: "Subject", html: "<p>hi</p>", text: "hi" }),
}));

vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => ({
    info: (context: Record<string, unknown>, message: string) => {
      mocks.infos.push([context, message]);
    },
    warn: () => {},
    error: (context: Record<string, unknown>, message: string) => {
      mocks.errors.push([context, message]);
    },
  }),
}));

const {
  enqueueTransactionalEmail,
  sweepStalledEmailOutbox,
  OUTBOX_STALL_HOURS,
  OUTBOX_MAX_ATTEMPTS,
} = await import("../src/modules/email/email-outbox.js");
const { EmailProviderError } = await import("../src/modules/email/resend.adapter.js");
const { processSendEmailJob } = await import("../src/workers/email.worker.js");

const describeIfIntegrationDb = integrationDatabaseUrl ? describe : describe.skip;

interface OutboxRow {
  id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  provider_message_id: string | null;
  reference: string | null;
  sent_at: string | null;
  last_attempted_at: string | null;
  payload: unknown;
}

describeIfIntegrationDb("transactional email outbox", () => {
  let cleanup: (() => Promise<void>) | null = null;
  let db: IntegrationDb;

  const job = {
    to: "customer@example.test",
    template: "dispatch-accepted",
    locale: "de-CH",
    data: { orderRef: "EP-000042" },
  };

  beforeEach(async () => {
    mocks.add.mockReset();
    mocks.send.mockReset();
    mocks.errors.length = 0;
    mocks.infos.length = 0;
    const ctx = await createIntegrationDb();
    cleanup = ctx.cleanup;
    db = ctx.db;
    mocks.db.current = db;
  });

  afterEach(async () => {
    if (cleanup) {
      await cleanup();
      cleanup = null;
    }
  });

  async function rows(): Promise<OutboxRow[]> {
    const result = await db.execute<OutboxRow>(sql`
      SELECT id, status, attempts, last_error, provider_message_id, reference,
             sent_at, last_attempted_at, payload
      FROM email_outbox
      ORDER BY created_at
    `);
    return result.rows;
  }

  function fakeJob(data: Record<string, unknown>, attemptsMade: number, attempts = 10) {
    return {
      data,
      attemptsMade,
      opts: { attempts },
      log: vi.fn(),
    } as never;
  }

  it("records the email before the job, and carries the row id into the job", async () => {
    expect(await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job })).toBe(true);

    const [row] = await rows();
    expect(row?.status).toBe("pending");
    expect(row?.attempts).toBe(0);
    // Derived from the payload so an operator holding a failed row can find the
    // order behind it.
    expect(row?.reference).toBe("EP-000042");

    expect(mocks.add).toHaveBeenCalledTimes(1);
    const [name, enqueued, opts] = mocks.add.mock.calls[0] as [
      string,
      { outboxId: string; to: string },
      { jobId: string },
    ];
    expect(name).toBe("dispatch-accepted");
    expect(enqueued.outboxId).toBe(row?.id);
    expect(opts.jobId).toBe("k-1");
  });

  it("refuses a second promise of an email that already went out", async () => {
    await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job });
    await db.execute(sql`UPDATE email_outbox SET status = 'sent', sent_at = NOW()`);
    mocks.add.mockClear();

    expect(await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job })).toBe(false);

    expect(await rows()).toHaveLength(1);
    // Re-adding the job here is the double send the table exists to prevent.
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("refuses a second promise of a failed email, leaving it for a human", async () => {
    await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job });
    await db.execute(sql`UPDATE email_outbox SET status = 'failed'`);
    mocks.add.mockClear();

    expect(await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job })).toBe(false);

    expect((await rows())[0]?.status).toBe("failed");
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("re-enqueues the job when the conflicting row is still pending", async () => {
    // The row was written and the process died before the enqueue. `DO NOTHING`
    // alone would answer "already promised" and leave the email stranded until
    // the sweep ran hours later.
    await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job }).catch(() => {});
    const [row] = await rows();
    mocks.add.mockClear();

    expect(await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job })).toBe(false);

    expect(await rows()).toHaveLength(1);
    expect(mocks.add).toHaveBeenCalledTimes(1);
    const [, enqueued, opts] = mocks.add.mock.calls[0] as [
      string,
      { outboxId: string },
      { jobId: string },
    ];
    // The existing row id and the original job id — so a job that does still
    // exist in Redis is not doubled.
    expect(enqueued.outboxId).toBe(row?.id);
    expect(opts.jobId).toBe("k-1");
  });

  it("does not disturb a row another worker is sending right now", async () => {
    await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job });
    await db.execute(sql`UPDATE email_outbox SET status = 'sending'`);
    mocks.add.mockClear();

    expect(await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job })).toBe(false);

    expect((await rows())[0]?.status).toBe("sending");
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("leaves the row pending when the enqueue fails, so the sweep can find it", async () => {
    mocks.add.mockRejectedValueOnce(new Error("redis down"));

    await expect(
      enqueueTransactionalEmail(db, { dedupeKey: "k-1", job }),
    ).rejects.toThrow("redis down");

    const [row] = await rows();
    expect(row?.status).toBe("pending");
  });

  it("marks the row sent, with the provider message id support will quote", async () => {
    await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job });
    const [before] = await rows();
    mocks.send.mockResolvedValueOnce("resend-msg-1");

    await processSendEmailJob(fakeJob({ ...job, outboxId: before?.id }, 0));

    const [after] = await rows();
    expect(after?.status).toBe("sent");
    expect(after?.provider_message_id).toBe("resend-msg-1");
    expect(after?.sent_at).not.toBeNull();
    expect(after?.attempts).toBe(1);
  });

  it("drops the payload once sent, keeping the row as a dedupe tombstone", async () => {
    await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job });
    const [before] = await rows();
    expect(before?.payload).not.toBeNull();
    mocks.send.mockResolvedValueOnce("resend-msg-1");

    await processSendEmailJob(fakeJob({ ...job, outboxId: before?.id }, 0));

    const [after] = await rows();
    // The recipient's address, the body of their mail and any receipt PDF are
    // gone; the promise that the email was sent is not.
    expect(after?.payload).toBeNull();
    expect(after?.provider_message_id).toBe("resend-msg-1");

    const keys = await db.execute<{ dedupe_key: string }>(
      sql`SELECT dedupe_key FROM email_outbox`,
    );
    expect(keys.rows[0]?.dedupe_key).toBe("k-1");
  });

  it("hands the dedupe key to the provider as an idempotency key", async () => {
    await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job });
    const [before] = await rows();
    mocks.send.mockResolvedValueOnce("resend-msg-1");

    await processSendEmailJob(fakeJob({ ...job, outboxId: before?.id }, 0));

    expect(mocks.send.mock.calls[0]?.[0]).toMatchObject({ idempotencyKey: "k-1" });
  });

  it("sends nothing when a redelivered job lands on a row already sent", async () => {
    await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job });
    const [before] = await rows();
    mocks.send.mockResolvedValueOnce("resend-msg-1");
    await processSendEmailJob(fakeJob({ ...job, outboxId: before?.id }, 0));
    mocks.send.mockReset();

    // BullMQ is at-least-once: the same job runs again after a lost lock or a
    // crash between the send and the job completing.
    await processSendEmailJob(fakeJob({ ...job, outboxId: before?.id }, 0));

    expect(mocks.send).not.toHaveBeenCalled();
    const [after] = await rows();
    expect(after?.status).toBe("sent");
    expect(after?.attempts).toBe(1);
    expect(after?.provider_message_id).toBe("resend-msg-1");
  });

  it("sends nothing when another worker already holds the claim", async () => {
    await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job });
    const [before] = await rows();
    await db.execute(sql`UPDATE email_outbox SET status = 'sending'`);

    await processSendEmailJob(fakeJob({ ...job, outboxId: before?.id }, 0));

    expect(mocks.send).not.toHaveBeenCalled();
    expect((await rows())[0]?.attempts).toBe(0);
  });

  it("sends nothing when the row has already been given up on", async () => {
    await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job });
    const [before] = await rows();
    await db.execute(sql`UPDATE email_outbox SET status = 'failed'`);

    await processSendEmailJob(fakeJob({ ...job, outboxId: before?.id }, 0));

    expect(mocks.send).not.toHaveBeenCalled();
    expect((await rows())[0]?.status).toBe("failed");
  });

  it("fails the row on the first attempt when the provider says never", async () => {
    await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job });
    const [before] = await rows();
    mocks.send.mockRejectedValueOnce(
      new EmailProviderError("Resend API error: validation_error — bad recipient", {
        permanent: true,
        providerCode: "validation_error",
      }),
    );

    await expect(
      // Nine retries still available; a payload Resend will never accept must
      // not spend them.
      processSendEmailJob(fakeJob({ ...job, outboxId: before?.id }, 0, 10)),
    ).rejects.toThrow("validation_error");

    const [after] = await rows();
    expect(after?.status).toBe("failed");
    expect(after?.attempts).toBe(1);
    expect(after?.last_error).toContain("validation_error");

    expect(mocks.errors).toHaveLength(1);
    expect(mocks.errors[0]?.[0]).toMatchObject({
      recipient: "customer@example.test",
      reference: "EP-000042",
      permanent: true,
    });
  });

  it("keeps retrying a provider error that might clear", async () => {
    await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job });
    const [before] = await rows();
    mocks.send.mockRejectedValueOnce(
      new EmailProviderError("Resend API error: rate_limit_exceeded — slow down", {
        permanent: false,
        providerCode: "rate_limit_exceeded",
      }),
    );

    await expect(
      processSendEmailJob(fakeJob({ ...job, outboxId: before?.id }, 0, 10)),
    ).rejects.toThrow("rate_limit_exceeded");

    const [after] = await rows();
    expect(after?.status).toBe("pending");
    expect(mocks.errors).toHaveLength(0);
  });

  it("keeps the row pending while retries remain, counting the attempts", async () => {
    await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job });
    const [before] = await rows();
    mocks.send.mockRejectedValueOnce(new Error("provider 503"));

    await expect(
      processSendEmailJob(fakeJob({ ...job, outboxId: before?.id }, 0)),
    ).rejects.toThrow("provider 503");

    const [after] = await rows();
    expect(after?.status).toBe("pending");
    expect(after?.attempts).toBe(1);
    expect(after?.last_error).toBe("provider 503");
    // Nothing is owed a human yet — the queue is still going to try again.
    expect(mocks.errors).toHaveLength(0);
  });

  it("fails the row loudly on the last attempt, naming the customer and the order", async () => {
    await enqueueTransactionalEmail(db, { dedupeKey: "k-1", job });
    const [before] = await rows();
    mocks.send.mockRejectedValueOnce(new Error("provider 503"));

    await expect(
      processSendEmailJob(fakeJob({ ...job, outboxId: before?.id }, 9, 10)),
    ).rejects.toThrow("provider 503");

    const [after] = await rows();
    expect(after?.status).toBe("failed");
    expect(after?.last_error).toBe("provider 503");

    expect(mocks.errors).toHaveLength(1);
    const [context] = mocks.errors[0] ?? [];
    expect(context).toMatchObject({
      recipient: "customer@example.test",
      template: "dispatch-accepted",
      reference: "EP-000042",
      err: "provider 503",
    });
  });

  async function seedPending(dedupeKey: string, ageHours: number): Promise<string> {
    const inserted = await db.execute<{ id: string }>(sql`
      INSERT INTO email_outbox (dedupe_key, recipient, template, locale, reference,
                                payload, created_at)
      VALUES (${dedupeKey}, ${job.to}, ${job.template}, ${job.locale}, 'EP-000042',
              ${JSON.stringify(job)}::jsonb,
              NOW() - make_interval(hours => ${ageHours}))
      RETURNING id
    `);
    const row = inserted.rows[0];
    if (!row) throw new Error("failed to seed outbox row");
    return row.id;
  }

  it("re-enqueues a row whose job Redis lost, under its original job id", async () => {
    const stalledId = await seedPending("k-stalled", OUTBOX_STALL_HOURS + 1);

    expect(await sweepStalledEmailOutbox(db)).toBe(1);

    const [, enqueued, opts] = mocks.add.mock.calls[0] as [
      string,
      { outboxId: string; template: string },
      { jobId: string },
    ];
    expect(enqueued.outboxId).toBe(stalledId);
    // The original key, so a job that does still exist in Redis is not doubled.
    expect(opts.jobId).toBe("k-stalled");
  });

  it("leaves a row alone while its retries are still running", async () => {
    await seedPending("k-fresh", OUTBOX_STALL_HOURS - 1);

    expect(await sweepStalledEmailOutbox(db)).toBe(0);
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("claims the row, so the next sweep does not send it a second time", async () => {
    await seedPending("k-stalled", OUTBOX_STALL_HOURS + 1);

    expect(await sweepStalledEmailOutbox(db)).toBe(1);
    mocks.add.mockClear();

    expect(await sweepStalledEmailOutbox(db)).toBe(0);
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("never re-enqueues an email that was already sent", async () => {
    await seedPending("k-sent", OUTBOX_STALL_HOURS + 1);
    await db.execute(
      sql`UPDATE email_outbox SET status = 'sent', sent_at = NOW(), payload = NULL`,
    );

    expect(await sweepStalledEmailOutbox(db)).toBe(0);
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("recovers a row whose worker died holding the claim", async () => {
    const stuckId = await seedPending("k-stuck", OUTBOX_STALL_HOURS + 1);
    await db.execute(sql`UPDATE email_outbox SET status = 'sending'`);

    expect(await sweepStalledEmailOutbox(db)).toBe(1);

    const [after] = await rows();
    // Back to pending, because that is the only status the worker will claim.
    expect(after?.status).toBe("pending");
    const [, enqueued] = mocks.add.mock.calls[0] as [string, { outboxId: string }];
    expect(enqueued.outboxId).toBe(stuckId);
  });

  it("gives up on a row that has burned the durable attempt budget", async () => {
    // A swept re-enqueue is a fresh BullMQ job, so `attemptsMade` restarts at
    // zero. Without a cumulative cap this row is retried forever and nobody is
    // ever told the customer did not get their email.
    await seedPending("k-doomed", OUTBOX_STALL_HOURS + 1);
    await db.execute(
      sql`UPDATE email_outbox SET attempts = ${OUTBOX_MAX_ATTEMPTS}, last_error = 'mailbox gone'`,
    );

    expect(await sweepStalledEmailOutbox(db)).toBe(0);
    expect(mocks.add).not.toHaveBeenCalled();

    const [after] = await rows();
    expect(after?.status).toBe("failed");
    expect(after?.last_error).toBe("mailbox gone");

    expect(mocks.errors).toHaveLength(1);
    expect(mocks.errors[0]?.[0]).toMatchObject({
      recipient: "customer@example.test",
      reference: "EP-000042",
      attempts: OUTBOX_MAX_ATTEMPTS,
    });
  });

  it("still re-drives a row one attempt short of the cap", async () => {
    await seedPending("k-nearly", OUTBOX_STALL_HOURS + 1);
    await db.execute(sql`UPDATE email_outbox SET attempts = ${OUTBOX_MAX_ATTEMPTS - 1}`);

    expect(await sweepStalledEmailOutbox(db)).toBe(1);
    expect((await rows())[0]?.status).toBe("pending");
  });

  it("skips a row whose payload has been pruned", async () => {
    await seedPending("k-pruned", OUTBOX_STALL_HOURS + 1);
    // Belt-and-braces: status already excludes sent rows, but a null payload
    // must never be turned into an unsendable job.
    await db.execute(sql`UPDATE email_outbox SET payload = NULL`);

    expect(await sweepStalledEmailOutbox(db)).toBe(0);
    expect(mocks.add).not.toHaveBeenCalled();
  });
});
