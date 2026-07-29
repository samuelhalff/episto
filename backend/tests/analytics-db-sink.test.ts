import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Which events reach `product_events`.
//
// `recordEvent` never throws and the sink swallows its own failures, so an event
// that is emitted but not on the persisted list disappears in complete silence.
// That is how the whole funnel came to end at `checkout_started`: `payment_captured`
// was emitted from both the Stripe webhook and the free-order path, and written
// nowhere. Nothing failed. The dashboard simply showed every order as abandoned.
//
// These tests assert on the insert, not on the constant, so the coupling that
// actually matters — emitted event to stored row — is what is under test.
// ---------------------------------------------------------------------------

const execute = vi.fn().mockResolvedValue(undefined);
const values = vi.fn(() => ({ execute }));
const insert = vi.fn(() => ({ values }));

vi.mock("../src/db/index.js", () => ({
  getDb: () => ({ insert }),
  schema: { productEvents: "product_events" },
}));

describe("DbSink", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function record(event: Record<string, unknown>): Promise<void> {
    const { DbSink } = await import("../src/modules/analytics/db-sink.js");
    new DbSink().record(event as never);
  }

  /**
   * The milestones a funnel is read from. Every one of these has to survive the
   * trip to the database or the report that uses it is quietly wrong rather than
   * visibly broken.
   */
  const funnelEvents = [
    "draft_entry_started",
    "step_completed",
    "checkout_started",
    "payment_captured",
    "payment_failed",
  ];

  it.each(funnelEvents)("persists %s", async (event) => {
    await record({ event, draftId: "draft-1" });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: event, draftId: "draft-1" }),
    );
  });

  it("persists the order-link revocation, which is an audit trail rather than a funnel step", async () => {
    await record({ event: "order_links_revoked", draftId: "draft-1" });

    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "order_links_revoked" }),
    );
  });

  /**
   * The list is an allowlist on purpose: high-volume diagnostic events would
   * otherwise fill the table. Losing that would be a slow, expensive mistake, so
   * it is worth one test.
   */
  it("ignores events that are not on the persisted list", async () => {
    await record({ event: "order_status_viewed", draftId: "draft-1" });

    expect(insert).not.toHaveBeenCalled();
  });

  it("does not let a database failure escape into the caller", async () => {
    execute.mockRejectedValueOnce(new Error("connection refused"));

    await expect(record({ event: "payment_captured" })).resolves.toBeUndefined();
  });
});
