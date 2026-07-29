import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  resendCtor: vi.fn(),
}));

vi.mock("resend", () => {
  class Resend {
    constructor(apiKey: string) {
      mocks.resendCtor(apiKey);
    }

    emails = {
      send: mocks.send,
    };
  }

  return { Resend };
});

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    RESEND_API_KEY: "re_test_123",
    EMAIL_FROM: "contact@houle.ai",
    APP_DISPLAY_NAME: "Episto",
    SUPPORT_EMAIL: "contact@houle.ai",
  }),
}));

describe("resend adapter", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("formats the sender with the app display name and forwards attachments", async () => {
    mocks.send.mockResolvedValue({
      data: { id: "email_123" },
      error: null,
    });

    const { sendEmail } = await import("../src/modules/email/resend.adapter.js");
    const messageId = await sendEmail({
      to: "samuelhalff@gmail.com",
      subject: "Payment receipt",
      html: "<p>Receipt</p>",
      text: "Receipt",
      attachments: [
        {
          filename: "episto-receipt.pdf",
          content: Buffer.from("pdf-bytes"),
          contentType: "application/pdf",
        },
      ],
    });

    expect(messageId).toBe("email_123");
    expect(mocks.resendCtor).toHaveBeenCalledWith("re_test_123");
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Episto <contact@houle.ai>",
        replyTo: "contact@houle.ai",
        attachments: [
          expect.objectContaining({
            filename: "episto-receipt.pdf",
            contentType: "application/pdf",
          }),
        ],
      }),
      {},
    );
  });

  const baseEmail = {
    to: "customer@example.test",
    subject: "Subject",
    html: "<p>hi</p>",
    text: "hi",
  };

  it("passes the dedupe key to Resend as an idempotency key", async () => {
    mocks.send.mockResolvedValue({ data: { id: "email_123" }, error: null });

    const { sendEmail } = await import("../src/modules/email/resend.adapter.js");
    await sendEmail({ ...baseEmail, idempotencyKey: "dispatch-accepted-abc" });

    expect(mocks.send.mock.calls[0]?.[1]).toEqual({
      idempotencyKey: "dispatch-accepted-abc",
    });
  });

  it("drops an over-long key rather than losing the email to it", async () => {
    mocks.send.mockResolvedValue({ data: { id: "email_123" }, error: null });

    const { sendEmail } = await import("../src/modules/email/resend.adapter.js");
    await sendEmail({ ...baseEmail, idempotencyKey: "x".repeat(257) });

    // Resend answers an over-long key with `invalid_idempotency_key`, which we
    // classify as permanent — the email would be failed over bookkeeping.
    expect(mocks.send.mock.calls[0]?.[1]).toEqual({});
  });

  it.each([
    ["validation_error", true],
    ["invalid_parameter", true],
    ["invalid_from_address", true],
    ["not_found", true],
    ["missing_required_field", true],
    ["invalid_idempotent_request", true],
    // Credentials. The provider is certainly refusing us, but it is refusing the
    // key, not the email — and a typo in `RESEND_API_KEY` during a rotation
    // would otherwise permanently fail every receipt and order link in flight
    // over the minutes it takes anyone to notice. Those are the two messages a
    // customer has no other way to obtain. Retrying costs wasted attempts and
    // delivers everything once the key is fixed.
    ["missing_api_key", false],
    ["invalid_api_Key", false],
    ["rate_limit_exceeded", false],
    ["internal_server_error", false],
    ["application_error", false],
    ["concurrent_idempotent_requests", false],
    ["some_code_resend_adds_in_2027", false],
  ])("classifies %s as permanent=%s", async (name, permanent) => {
    mocks.send.mockResolvedValue({ data: null, error: { name, message: "nope" } });

    const { sendEmail, isPermanentEmailError } =
      await import("../src/modules/email/resend.adapter.js");

    const err = await sendEmail(baseEmail).catch((caught: unknown) => caught);
    expect(isPermanentEmailError(err)).toBe(permanent);
    expect((err as Error).message).toContain(String(name));
  });

  it("treats a transport failure as retryable", async () => {
    mocks.send.mockRejectedValue(new Error("ECONNRESET"));

    const { sendEmail, isPermanentEmailError } =
      await import("../src/modules/email/resend.adapter.js");

    const err = await sendEmail(baseEmail).catch((caught: unknown) => caught);
    expect(isPermanentEmailError(err)).toBe(false);
  });
});
