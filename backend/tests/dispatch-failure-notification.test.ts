import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
}));

vi.mock("../src/db/index.js", () => ({
  schema: {
    paymentAttempts: {
      id: "payment_id",
      sessionId: "session_id",
    },
    draftLetters: {
      sessionId: "session_id",
      id: "draft_id",
      senderProfileId: "sender_profile_id",
      recipientProfileId: "recipient_profile_id",
    },
    sessions: {
      id: "session_id",
      email: "email",
      locale: "locale",
    },
    senderProfiles: {
      id: "sender_id",
    },
    recipientProfiles: {
      id: "recipient_id",
    },
  },
}));

vi.mock("../src/queue/index.js", () => ({
  getQueue: () => ({
    add: mocks.add,
  }),
  QUEUE_NAMES: {
    SEND_EMAIL: "send-email",
  },
}));

vi.mock("../src/shared/config/index.js", () => ({
  isEnvLoaded: () => false,
  env: () => ({
    CORS_ORIGIN: "https://episto.ch",
    APP_PUBLIC_URL: undefined,
    STATEMENT_RETENTION_DAYS: 10,
    APP_DISPLAY_NAME: "Episto",
    SUPPORT_EMAIL: "contact@episto.ch",
    LEGAL_ENTITY_NAME: "West Bay SA",
    LEGAL_ENTITY_ADDRESS_LINE_1: "Test St 1",
    LEGAL_ENTITY_ADDRESS_LINE_2: "1234 City",
    LEGAL_ENTITY_COUNTRY: "Switzerland",
    LEGAL_ENTITY_UID_VAT: "CHE-107.892.984",
  }),
}));

vi.mock("../src/modules/orders/order-access-token.js", () => ({
  issueOrderAccessToken: vi.fn().mockReturnValue("mock-token"),
}));

function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  return chain;
}

describe("dispatch failure notification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("uses a BullMQ-safe job id for failed-dispatch emails", async () => {
    const db = {
      select: vi
        .fn()
        .mockImplementationOnce(() =>
          makeSelectChain([
            {
              id: "payment-1",
              sessionId: "session-1",
              draftId: "draft-1",
              state: "captured",
              amountCents: 625,
              currency: "CHF",
              orderAccessTokenExpiresAt: new Date("2026-07-10T12:00:00.000Z"),
              orderAccessTokenHash: "hash-1",
            },
          ]),
        )
        .mockImplementationOnce(() =>
          makeSelectChain([
            {
              id: "draft-1",
              deliveryType: "standard",
              senderProfileId: null,
              recipientProfileId: null,
            },
          ]),
        )
        .mockImplementationOnce(() =>
          makeSelectChain([{ email: "person@example.com", locale: "en-CH" }]),
        ),
      // The email choke point records the outbox row before enqueueing; a
      // returned row is what says "not a duplicate, go ahead".
      execute: vi.fn().mockResolvedValue({ rows: [{ id: "outbox-1" }] }),
    };

    const { enqueueDispatchFailedEmail } =
      await import("../src/modules/dispatch/dispatch-notifications.js");

    await enqueueDispatchFailedEmail(db as never, {
      dispatchAttemptId: "dispatch-1",
      draftId: "draft-1",
      paymentId: "payment-1",
      failureReason: "Invalid address format",
    });

    expect(mocks.add).toHaveBeenCalledWith(
      "dispatch-failed",
      expect.objectContaining({
        template: "dispatch-failed",
        data: expect.objectContaining({
          orderRef: expect.any(String),
          failureReason: "Invalid address format",
        }),
      }),
      { jobId: "dispatch-failed-dispatch-1" },
    );
  });

  it("includes failureReason in the email data", async () => {
    const db = {
      select: vi
        .fn()
        .mockImplementationOnce(() =>
          makeSelectChain([
            {
              id: "payment-1",
              sessionId: "session-1",
              draftId: "draft-1",
              state: "captured",
              amountCents: 625,
              currency: "CHF",
              orderAccessTokenExpiresAt: new Date("2026-07-10T12:00:00.000Z"),
              orderAccessTokenHash: "hash-1",
            },
          ]),
        )
        .mockImplementationOnce(() =>
          makeSelectChain([
            {
              id: "draft-1",
              deliveryType: "standard",
              senderProfileId: null,
              recipientProfileId: null,
            },
          ]),
        )
        .mockImplementationOnce(() =>
          makeSelectChain([{ email: "person@example.com", locale: "en-CH" }]),
        ),
      // The email choke point records the outbox row before enqueueing; a
      // returned row is what says "not a duplicate, go ahead".
      execute: vi.fn().mockResolvedValue({ rows: [{ id: "outbox-1" }] }),
    };

    const { enqueueDispatchFailedEmail } =
      await import("../src/modules/dispatch/dispatch-notifications.js");

    await enqueueDispatchFailedEmail(db as never, {
      dispatchAttemptId: "dispatch-2",
      draftId: "draft-1",
      paymentId: "payment-1",
      failureReason: "Provider rejected: address validation failed",
    });

    const failedJob = mocks.add.mock.calls[0]?.[1];
    expect(failedJob.data.failureReason).toBe(
      "Provider rejected: address validation failed",
    );
    expect(failedJob.template).toBe("dispatch-failed");
  });

  it("silently returns when email context cannot be built (no orderAccessTokenExpiresAt)", async () => {
    const db = {
      select: vi
        .fn()
        .mockImplementationOnce(() =>
          makeSelectChain([
            {
              id: "payment-1",
              sessionId: "session-1",
              draftId: "draft-1",
              state: "authorized",
              amountCents: 625,
              currency: "CHF",
              // Missing orderAccessTokenExpiresAt — context build should fail
              orderAccessTokenExpiresAt: null,
            },
          ]),
        )
        .mockImplementationOnce(() =>
          makeSelectChain([
            {
              id: "draft-1",
              deliveryType: "standard",
              senderProfileId: null,
              recipientProfileId: null,
            },
          ]),
        ),
    };

    const { enqueueDispatchFailedEmail } =
      await import("../src/modules/dispatch/dispatch-notifications.js");

    await enqueueDispatchFailedEmail(db as never, {
      dispatchAttemptId: "dispatch-3",
      draftId: "draft-1",
      paymentId: "payment-1",
      failureReason: "Some failure",
    });

    // No email should be enqueued — context returned null
    expect(mocks.add).not.toHaveBeenCalled();
  });
});
