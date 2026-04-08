import { describe, expect, it, vi } from "vitest";

import { getStoredMatrixQuote } from "../src/modules/dispatch/dispatch-rate-matrix.service.js";
import type { DispatchPricingInput } from "../src/modules/dispatch/dispatch-pricing-input.service.js";

const baseInput: DispatchPricingInput = {
  postage: "REGISTERED",
  numberOfPage: 2,
  attachmentMode: "none",
  shippingCountry: "CH",
  envelopeSize: "C5",
  windowLocation: "LEFT",
  duplex: false,
};

describe("getStoredMatrixQuote", () => {
  function makeDb(options: {
    versionRows: Array<{ id: string; verifiedAt: Date | null; expiresAt: Date | null }>;
    entryRows: Array<{ versionId: string; providerQuotedCents: number }>;
  }) {
    const versionChain: Record<string, unknown> = {};
    versionChain.from = vi.fn(() => versionChain);
    versionChain.where = vi.fn(() => versionChain);
    versionChain.orderBy = vi.fn(() => versionChain);
    versionChain.limit = vi.fn().mockResolvedValue(options.versionRows);

    const entryChain: Record<string, unknown> = {};
    entryChain.from = vi.fn(() => entryChain);
    entryChain.where = vi.fn(() => entryChain);
    entryChain.limit = vi.fn().mockResolvedValue(options.entryRows);

    return {
      select: vi
        .fn()
        .mockImplementationOnce(() => versionChain)
        .mockImplementationOnce(() => entryChain),
    };
  }

  it("returns the active stored quote and marks it fresh when it has not expired", async () => {
    const verifiedAt = new Date("2026-04-08T06:05:00.000Z");
    const expiresAt = new Date("2026-04-09T06:05:00.000Z");
    const db = makeDb({
      versionRows: [{ id: "v1", verifiedAt, expiresAt }],
      entryRows: [{ versionId: "v1", providerQuotedCents: 578 }],
    });

    const result = await getStoredMatrixQuote(
      db as never,
      baseInput,
      new Date("2026-04-08T12:00:00.000Z"),
    );

    expect(result).toEqual({
      versionId: "v1",
      providerQuotedCents: 578,
      quotedAt: verifiedAt,
      expiresAt,
      freshness: "fresh",
    });
  });

  it("returns the last active stored quote even when it is stale", async () => {
    const verifiedAt = new Date("2026-04-08T06:05:00.000Z");
    const expiresAt = new Date("2026-04-09T06:05:00.000Z");
    const db = makeDb({
      versionRows: [{ id: "v1", verifiedAt, expiresAt }],
      entryRows: [{ versionId: "v1", providerQuotedCents: 578 }],
    });

    const result = await getStoredMatrixQuote(
      db as never,
      baseInput,
      new Date("2026-04-10T12:00:00.000Z"),
    );

    expect(result).toEqual({
      versionId: "v1",
      providerQuotedCents: 578,
      quotedAt: verifiedAt,
      expiresAt,
      freshness: "stale",
    });
  });

  it("returns null when there is no active matrix version", async () => {
    const db = makeDb({
      versionRows: [],
      entryRows: [],
    });

    const result = await getStoredMatrixQuote(db as never, baseInput, new Date());
    expect(result).toBeNull();
  });
});
