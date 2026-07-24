import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { sha256Hex } from "../src/modules/rendering/pdf-access.js";

describe("sha256Hex", () => {
  it("produces the known SHA-256 hex digest for a fixed input", () => {
    // Reference vector: SHA-256("abc").
    expect(sha256Hex(Buffer.from("abc"))).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("returns a stable 64-char lowercase hex string", () => {
    const bytes = Buffer.from("episto-justificatif");
    const digest = sha256Hex(bytes);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).toBe(sha256Hex(bytes));
  });

  it("accepts a Uint8Array and matches the Buffer digest", () => {
    const view = new Uint8Array([1, 2, 3, 4, 5]);
    const expected = createHash("sha256").update(Buffer.from(view)).digest("hex");
    expect(sha256Hex(view)).toBe(expected);
  });
});
