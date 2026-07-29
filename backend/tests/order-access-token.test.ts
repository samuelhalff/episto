import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    ORDER_ACCESS_TOKEN_SECRET: "order-access-secret-at-least-32-chars",
  }),
}));

describe("signed order access tokens", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("issues a signed token that resolves the payment attempt id and expiry", async () => {
    const { issueOrderAccessToken, verifyOrderAccessToken } =
      await import("../src/modules/orders/order-access-token.js");

    const expiresAt = new Date("2026-07-10T12:00:00.000Z");
    const token = await issueOrderAccessToken({
      paymentAttemptId: "payment-1",
      expiresAt,
      tokenHash: "0123456789abcdef0123456789abcdef",
    });

    await expect(verifyOrderAccessToken(token)).resolves.toEqual({
      paymentAttemptId: "payment-1",
      expiresAt: "2026-07-10T12:00:00.000Z",
      // Not a prefix of the token hash: the claim is a separate one-way value,
      // so a link never carries the stored hash it was derived from.
      generation: "f7f00e45e1d8db2b1a2465b520aa0bc5",
    });
  });

  /**
   * The claim rides in a signed token, which is base64 and readable by anyone
   * holding the link. If it were the stored hash — or a slice of it — every link
   * would publish the credential material of the row it opens.
   */
  it("derives a generation that does not disclose the token hash", async () => {
    const { orderAccessGeneration } =
      await import("../src/modules/orders/order-access-token.js");

    const hash = "0123456789abcdef0123456789abcdef";
    const generation = orderAccessGeneration(hash);

    expect(hash.startsWith(generation)).toBe(false);
    expect(hash).not.toContain(generation);
    // 128 bits, so a later rotation colliding with a historical generation and
    // resurrecting a revoked link is not a number worth thinking about.
    expect(generation).toHaveLength(32);
  });

  it("rejects expired signed order tokens", async () => {
    const { issueOrderAccessToken, verifyOrderAccessToken } =
      await import("../src/modules/orders/order-access-token.js");

    const token = await issueOrderAccessToken({
      paymentAttemptId: "payment-expired",
      expiresAt: new Date("2026-04-11T11:59:59.000Z"),
      tokenHash: "0123456789abcdef0123456789abcdef",
    });

    await expect(verifyOrderAccessToken(token)).rejects.toThrow(/expired|JWT/i);
  });

  /**
   * A link minted before the generation claim existed can never be withdrawn,
   * because there is nothing in it to compare against the order's current
   * state. Accepting it "for compatibility" would leave exactly the class of
   * link that revocation is supposed to kill, so it is refused outright — the
   * customer asks for a new link by email instead.
   */
  it("refuses a signed token that carries no generation claim", async () => {
    const { SignJWT } = await import("jose");
    const { verifyOrderAccessToken } =
      await import("../src/modules/orders/order-access-token.js");

    const legacyToken = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("payment-legacy")
      .setAudience("order-access")
      .setIssuer("episto")
      .setExpirationTime(
        Math.floor(new Date("2026-07-10T12:00:00.000Z").getTime() / 1000),
      )
      .sign(new TextEncoder().encode("order-access-secret-at-least-32-chars"));

    await expect(verifyOrderAccessToken(legacyToken)).rejects.toThrow(/invalid/i);
  });
});
