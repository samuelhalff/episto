import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("../src/db/index.js", () => ({
  schema: {
    signatureEvents: {
      id: "id",
      eventKey: "event_key",
    },
  },
}));

describe("signature callback idempotency", () => {
  beforeEach(() => {
    mocks.db.select.mockReset();
    mocks.db.insert.mockReset();
  });

  it("stores a signature event once and returns false for duplicate callbacks", async () => {
    const { recordSignatureEvent } =
      await import("../src/modules/signing/signature-session.service.js");

    mocks.db.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    });
    mocks.db.insert.mockReturnValueOnce({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const first = await recordSignatureEvent(mocks.db as never, {
      signatureSessionId: "signature-session-1",
      draftId: "draft-1",
      eventSource: "webhook",
      eventType: "signature_completed",
      eventKey: "event-1",
    });

    mocks.db.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ id: "event-row-1" }]),
        })),
      })),
    });

    const second = await recordSignatureEvent(mocks.db as never, {
      signatureSessionId: "signature-session-1",
      draftId: "draft-1",
      eventSource: "webhook",
      eventType: "signature_completed",
      eventKey: "event-1",
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(mocks.db.insert).toHaveBeenCalledTimes(1);
  });
});
