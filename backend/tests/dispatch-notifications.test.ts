import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
}));

vi.mock("../src/db/index.js", () => ({
  schema: {
    draftLetters: {
      sessionId: "session_id",
      id: "draft_id",
    },
    sessions: {
      id: "session_id",
      email: "email",
      locale: "locale",
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
  }),
}));

function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  return chain;
}

describe("dispatch notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses a BullMQ-safe job id for accepted-dispatch emails", async () => {
    const db = {
      select: vi
        .fn()
        .mockImplementationOnce(() =>
          makeSelectChain([{ sessionId: "session-1" }]),
        )
        .mockImplementationOnce(() =>
          makeSelectChain([
            {
              email: "person@example.com",
              locale: "en-CH",
            },
          ]),
        ),
    };

    const { enqueueDispatchAcceptedEmail } = await import(
      "../src/modules/dispatch/dispatch-notifications.js"
    );

    await enqueueDispatchAcceptedEmail(db as never, {
      dispatchAttemptId: "dispatch-1",
      draftId: "draft-1",
      providerReference: "provider-ref-1",
      trackingNumber: "98.40.541881.00002354",
      rawOrderAccessToken: "token-1",
    });

    expect(mocks.add).toHaveBeenCalledWith(
      "dispatch-accepted",
      expect.any(Object),
      {
        jobId: "dispatch-accepted-dispatch-1",
      },
    );
  });
});
