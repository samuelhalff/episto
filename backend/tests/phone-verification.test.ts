import { describe, expect, it } from "vitest";

import {
  buildPhoneVerificationMessage,
  hashPhoneVerificationCode,
  normalizeSwissMobilePhone,
  verifyPhoneVerificationCode,
} from "../src/modules/phone-verification/phone-verification.service.js";

describe("phone verification", () => {
  it.each([
    ["079 123 45 67", "+41791234567"],
    ["+41 79 123 45 67", "+41791234567"],
    ["0041 79 123 45 67", "+41791234567"],
  ])("normalizes Swiss mobile phone input %s", (input, expected) => {
    expect(normalizeSwissMobilePhone(input)).toBe(expected);
  });

  it.each(["044 123 45 67", "+33123456789", "079 123", "hello"])(
    "rejects unsupported phone input %s",
    (input) => {
      expect(() => normalizeSwissMobilePhone(input)).toThrow();
    },
  );

  it("hashes verification codes without storing the raw code", () => {
    const hash = hashPhoneVerificationCode({
      verificationId: "verification-1",
      code: "123456",
      secret: "secret-at-least-32-characters-long",
    });

    expect(hash).not.toContain("123456");
    expect(
      verifyPhoneVerificationCode({
        verificationId: "verification-1",
        code: "123456",
        hash,
        secret: "secret-at-least-32-characters-long",
      }),
    ).toBe(true);
    expect(
      verifyPhoneVerificationCode({
        verificationId: "verification-1",
        code: "654321",
        hash,
        secret: "secret-at-least-32-characters-long",
      }),
    ).toBe(false);
  });

  it("keeps the SMS copy short enough for one GSM segment", () => {
    const message = buildPhoneVerificationMessage("123456");

    expect(message).toBe("Episto code: 123456. Expires in 10 minutes.");
    expect(message.length).toBeLessThanOrEqual(160);
  });
});
