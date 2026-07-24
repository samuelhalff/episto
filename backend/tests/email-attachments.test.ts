import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mocks.send };
  },
}));

vi.mock("../src/shared/config/index.js", () => ({
  env: () => ({
    RESEND_API_KEY: "re_test",
    APP_DISPLAY_NAME: "Episto",
    EMAIL_FROM: "contact@episto.ch",
    SUPPORT_EMAIL: "contact@episto.ch",
  }),
}));

describe("email attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mocks.send.mockResolvedValue({ data: { id: "msg-1" }, error: null });
  });

  it("threads attachments through to the Resend send call", async () => {
    const { sendEmail } = await import("../src/modules/email/resend.adapter.js");

    await sendEmail({
      to: "person@example.com",
      subject: "Your Episto receipt",
      html: "<p>hi</p>",
      text: "hi",
      attachments: [{ filename: "receipt-EP-R-000042.pdf", content: "YmFzZTY0" }],
    });

    expect(mocks.send).toHaveBeenCalledTimes(1);
    const payload = mocks.send.mock.calls[0]?.[0];
    expect(payload.attachments).toEqual([
      { filename: "receipt-EP-R-000042.pdf", content: "YmFzZTY0" },
    ]);
  });

  it("omits attachments when none are provided", async () => {
    const { sendEmail } = await import("../src/modules/email/resend.adapter.js");

    await sendEmail({
      to: "person@example.com",
      subject: "Hello",
      html: "<p>hi</p>",
      text: "hi",
    });

    const payload = mocks.send.mock.calls[0]?.[0];
    expect(payload).not.toHaveProperty("attachments");
  });
});
