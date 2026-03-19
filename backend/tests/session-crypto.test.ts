import { describe, it, expect } from "vitest";
import {
  generateResumeToken,
  hashResumeToken,
} from "../src/modules/sessions/session.service.js";

describe("generateResumeToken", () => {
  it("produces a 43-character base64url string (256-bit)", () => {
    const token = generateResumeToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("produces unique tokens on successive calls", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateResumeToken()));
    expect(tokens.size).toBe(20);
  });
});

describe("hashResumeToken", () => {
  it("returns a 64-character hex string (SHA-256)", () => {
    const hash = hashResumeToken("test-token");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic for the same input", () => {
    const a = hashResumeToken("same-input");
    const b = hashResumeToken("same-input");
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", () => {
    const a = hashResumeToken("token-a");
    const b = hashResumeToken("token-b");
    expect(a).not.toBe(b);
  });

  it("hash of generateResumeToken output is a valid hex string", () => {
    const token = generateResumeToken();
    const hash = hashResumeToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
