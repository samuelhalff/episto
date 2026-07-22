import Fastify from "fastify";
import { ZodError } from "zod";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "../src/shared/errors/index.js";

const { mockSendEmail, mockGetOptionalSession } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
  mockGetOptionalSession: vi.fn(),
}));

vi.mock("../src/modules/email/index.js", () => ({ sendEmail: mockSendEmail }));
vi.mock("../src/modules/sessions/session.middleware.js", () => ({
  getOptionalSession: mockGetOptionalSession,
}));
vi.mock("../src/shared/config/env.js", () => ({
  env: () => ({ SUPPORT_EMAIL: "support@test.ch", EMAIL_FROM: "contact@test.ch" }),
}));

import { feedbackRoutes } from "../src/modules/feedback/feedback.routes.js";

interface SentEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

describe("feedback routes", () => {
  beforeEach(() => {
    mockSendEmail.mockReset().mockResolvedValue("email-id");
    mockGetOptionalSession.mockReset().mockResolvedValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function buildTestApp() {
    const app = Fastify();
    app.setErrorHandler((error, request, reply) => {
      if (error instanceof AppError) {
        reply.status(error.statusCode).send(error.toResponse(request.id));
        return;
      }
      if (error instanceof ZodError) {
        reply.status(400).send({ error: { code: "VALIDATION_ERROR" } });
        return;
      }
      throw error;
    });
    await app.register(feedbackRoutes);
    return app;
  }

  function firstEmail(): SentEmail {
    return mockSendEmail.mock.calls[0]?.[0] as SentEmail;
  }

  it("emails support and sets reply-to when an email is provided", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/feedback",
      payload: {
        message: "The checkout button does nothing when I click it.",
        email: "user@example.com",
        page: "/de-CH/draft/abc/checkout",
      },
    });

    expect(res.statusCode).toBe(202);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const email = firstEmail();
    expect(email.to).toBe("support@test.ch");
    expect(email.replyTo).toBe("user@example.com");
    expect(email.subject).toContain("user@example.com");
    expect(email.text).toContain("The checkout button does nothing");
    expect(email.text).toContain("/de-CH/draft/abc/checkout");
    await app.close();
  });

  it("sends without a reply-to when no email is given", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/feedback",
      payload: { message: "Something on the pricing page looks broken." },
    });

    expect(res.statusCode).toBe(202);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    expect(firstEmail().replyTo).toBeUndefined();
    await app.close();
  });

  it("silently drops honeypot submissions without emailing", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/feedback",
      payload: { message: "Buy cheap watches now, limited offer!", company: "spam-bot" },
    });

    expect(res.statusCode).toBe(202);
    expect(mockSendEmail).not.toHaveBeenCalled();
    await app.close();
  });

  it("rejects messages that are too short", async () => {
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/feedback",
      payload: { message: "hi" },
    });

    expect(res.statusCode).toBe(400);
    expect(mockSendEmail).not.toHaveBeenCalled();
    await app.close();
  });

  it("surfaces a server error when email delivery fails", async () => {
    mockSendEmail.mockRejectedValueOnce(new Error("resend unavailable"));
    const app = await buildTestApp();
    const res = await app.inject({
      method: "POST",
      url: "/feedback",
      payload: { message: "My letter never arrived and I need help." },
    });

    expect(res.statusCode).toBeGreaterThanOrEqual(500);
    await app.close();
  });
});
