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
    APP_DISPLAY_NAME: "Sendly",
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
          filename: "sendly-receipt.pdf",
          content: Buffer.from("pdf-bytes"),
          contentType: "application/pdf",
        },
      ],
    });

    expect(messageId).toBe("email_123");
    expect(mocks.resendCtor).toHaveBeenCalledWith("re_test_123");
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Sendly <contact@houle.ai>",
        replyTo: "contact@houle.ai",
        attachments: [
          expect.objectContaining({
            filename: "sendly-receipt.pdf",
            contentType: "application/pdf",
          }),
        ],
      }),
    );
  });
});
