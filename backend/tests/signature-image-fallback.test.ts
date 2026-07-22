import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SnapshotData } from "@episto/shared";

const mocks = vi.hoisted(() => ({
  downloadObjectBuffer: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  schema: {
    fileAssets: {
      id: "file_assets.id",
      storageKey: "file_assets.storage_key",
      mimeType: "file_assets.mime_type",
      status: "file_assets.status",
    },
    draftLetters: {
      id: "draft_letters.id",
      signatureMode: "draft_letters.signature_mode",
      signatureAssetId: "draft_letters.signature_asset_id",
    },
  },
}));

vi.mock("../src/modules/files/adapters/s3.adapter.js", () => ({
  downloadObjectBuffer: mocks.downloadObjectBuffer,
}));

vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => mocks.logger,
}));

vi.mock("../src/db/index.js", () => ({ schema: mocks.schema }));

function makeSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  return chain;
}

function mockDb(...results: unknown[][]) {
  const remaining = [...results];
  return {
    select: vi.fn().mockImplementation(() => makeSelectChain(remaining.shift() ?? [])),
  };
}

function missingObjectError() {
  const err = new Error("The specified key does not exist.");
  (err as { name: string }).name = "NoSuchKey";
  return err;
}

const SNAPSHOT: SnapshotData = {
  signatureMode: "drawn",
  signatureAssetId: "snap-asset",
} as unknown as SnapshotData;

describe("loadSignatureImageAsset — missing-object fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the snapshot signature when its object exists", async () => {
    const { loadSignatureImageAsset } =
      await import("../src/modules/rendering/signature-image.js");
    mocks.downloadObjectBuffer.mockResolvedValueOnce({ buffer: Buffer.from("sig") });

    const db = mockDb([{ storageKey: "sig/snap", mimeType: "image/png" }]);
    const result = await loadSignatureImageAsset(db as never, SNAPSHOT, "draft-1");

    expect(result).toEqual({
      mimeType: "image/png",
      base64: Buffer.from("sig").toString("base64"),
    });
  });

  it("falls back to the draft's live signature when the snapshot object is gone", async () => {
    const { loadSignatureImageAsset } =
      await import("../src/modules/rendering/signature-image.js");
    mocks.downloadObjectBuffer
      .mockRejectedValueOnce(missingObjectError()) // snapshot object missing
      .mockResolvedValueOnce({ buffer: Buffer.from("live") }); // live object present

    const db = mockDb(
      [{ storageKey: "sig/snap", mimeType: "image/png" }], // snapshot asset row
      [{ signatureMode: "drawn", signatureAssetId: "live-asset" }], // draft row
      [{ id: "live-asset" }], // active live asset
      [{ storageKey: "sig/live", mimeType: "image/png" }], // live asset row
    );

    const result = await loadSignatureImageAsset(db as never, SNAPSHOT, "draft-1");

    expect(result).toEqual({
      mimeType: "image/png",
      base64: Buffer.from("live").toString("base64"),
    });
  });

  it("returns null when both snapshot and live objects are unavailable", async () => {
    const { loadSignatureImageAsset } =
      await import("../src/modules/rendering/signature-image.js");
    mocks.downloadObjectBuffer.mockRejectedValue(missingObjectError());

    const db = mockDb(
      [{ storageKey: "sig/snap", mimeType: "image/png" }],
      [{ signatureMode: "drawn", signatureAssetId: "live-asset" }],
      [{ id: "live-asset" }],
      [{ storageKey: "sig/live", mimeType: "image/png" }],
    );

    const result = await loadSignatureImageAsset(db as never, SNAPSHOT, "draft-1");
    expect(result).toBeNull();
  });

  it("does not fall back to a soft-deleted live signature", async () => {
    const { loadSignatureImageAsset } =
      await import("../src/modules/rendering/signature-image.js");
    mocks.downloadObjectBuffer.mockRejectedValueOnce(missingObjectError());

    const db = mockDb(
      [{ storageKey: "sig/snap", mimeType: "image/png" }],
      [{ signatureMode: "drawn", signatureAssetId: "live-asset" }],
      [], // no active asset — the live one is soft-deleted
    );

    const result = await loadSignatureImageAsset(db as never, SNAPSHOT, "draft-1");
    expect(result).toBeNull();
    // Only the snapshot download was attempted; no live download.
    expect(mocks.downloadObjectBuffer).toHaveBeenCalledTimes(1);
  });

  it("re-throws non-missing storage errors", async () => {
    const { loadSignatureImageAsset } =
      await import("../src/modules/rendering/signature-image.js");
    const boom = new Error("connection reset");
    mocks.downloadObjectBuffer.mockRejectedValueOnce(boom);

    const db = mockDb([{ storageKey: "sig/snap", mimeType: "image/png" }]);

    await expect(
      loadSignatureImageAsset(db as never, SNAPSHOT, "draft-1"),
    ).rejects.toThrow("connection reset");
  });

  it("returns null without a fallback when no draftId is supplied", async () => {
    const { loadSignatureImageAsset } =
      await import("../src/modules/rendering/signature-image.js");
    mocks.downloadObjectBuffer.mockRejectedValueOnce(missingObjectError());

    const db = mockDb([{ storageKey: "sig/snap", mimeType: "image/png" }]);

    const result = await loadSignatureImageAsset(db as never, SNAPSHOT);
    expect(result).toBeNull();
  });
});
