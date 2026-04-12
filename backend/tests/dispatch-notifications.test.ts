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
  env: () => ({
    CORS_ORIGIN: "https://swissmail.ch",
    APP_PUBLIC_URL: undefined,
    STATEMENT_RETENTION_DAYS: 10,
    APP_DISPLAY_NAME: "Swiss Mail",
    SUPPORT_EMAIL: "support@swissmail.ch",
    LEGAL_ENTITY_NAME: "West Bay SA",
    LEGAL_ENTITY_ADDRESS_LINE_1: "Test St 1",
    LEGAL_ENTITY_ADDRESS_LINE_2: "1234 City",
    LEGAL_ENTITY_COUNTRY: "Switzerland",
    LEGAL_ENTITY_UID_VAT: "CHE-107.892.984",
  }),
}));

vi.mock("../src/modules/orders/order-access-token.js", () => ({
  issueOrderAccessToken: vi.fn().mockResolvedValue("mock-token"),
}));

function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  return chain;
}

function makePaymentSelectChain() {
  return makeSelectChain([
    {
      id: "payment-1",
      sessionId: "session-1",
      orderAccessTokenExpiresAt: new Date("2026-07-10T12:00:00.000Z"),
    },
  ]);
}

function makeDraftSelectChain() {
  return makeSelectChain([
    {
      id: "draft-1",
      deliveryType: "standard",
      senderProfileId: null,
      recipientProfileId: null,
    },
  ]);
}

function makeSessionSelectChain() {
  return makeSelectChain([{ email: "person@example.com", locale: "en-CH" }]);
}

describe("dispatch notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("uses a BullMQ-safe job id for submitted-dispatch emails", async () => {
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
    };

    const { enqueueDispatchSubmittedEmail } =
      await import("../src/modules/dispatch/dispatch-notifications.js");

    await enqueueDispatchSubmittedEmail(db as never, {
      dispatchAttemptId: "dispatch-1",
      draftId: "draft-1",
      paymentId: "payment-1",
    });

    const submittedJob = mocks.add.mock.calls[0]?.[1];

    expect(mocks.add).toHaveBeenCalledWith(
      "dispatch-submitted",
      expect.objectContaining({
        template: "dispatch-submitted",
        data: expect.objectContaining({
          orderRef: expect.any(String),
        }),
      }),
      { jobId: "dispatch-submitted-dispatch-1" },
    );
    expect(submittedJob?.data).not.toHaveProperty("statusUrl");
  });

  it("uses a BullMQ-safe job id for accepted-dispatch emails", async () => {
    const db = {
      select: vi
        .fn()
        .mockImplementationOnce(makePaymentSelectChain)
        .mockImplementationOnce(makeDraftSelectChain)
        .mockImplementationOnce(makeSessionSelectChain),
    };

    const { enqueueDispatchAcceptedEmail } =
      await import("../src/modules/dispatch/dispatch-notifications.js");

    await enqueueDispatchAcceptedEmail(db as never, {
      dispatchAttemptId: "dispatch-1",
      draftId: "draft-1",
      paymentId: "payment-1",
      providerReference: "provider-ref-1",
      trackingNumber: "98.40.541881.00002354",
    });

    const acceptedJob = mocks.add.mock.calls[0]?.[1];

    expect(mocks.add).toHaveBeenCalledWith("dispatch-accepted", expect.any(Object), {
      jobId: "dispatch-accepted-dispatch-1",
    });
    expect(acceptedJob?.data).not.toHaveProperty("statusUrl");
  });
});
