import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { env } from "../../shared/config/env.js";
import { providerOutageError } from "../../shared/errors/index.js";
import { sendEmail } from "../email/index.js";
import { getOptionalSession } from "../sessions/session.middleware.js";

const FeedbackInput = z.object({
  message: z.string().trim().min(10).max(4000),
  email: z.string().trim().max(200).email().optional(),
  page: z.string().max(300).optional(),
  // Honeypot: a hidden field real users never fill. Bots typically do.
  company: z.string().max(100).optional(),
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function feedbackRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/v1/feedback — user problem reports, emailed to SUPPORT_EMAIL.
  app.post(
    "/feedback",
    {
      // Cap the body well below the global limit — the schema fields are small.
      bodyLimit: 16 * 1024,
      config: {
        rateLimit: {
          max: 5,
          timeWindow: "10 minutes",
          keyGenerator: (req: FastifyRequest) => req.ip,
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const input = FeedbackInput.parse(request.body ?? {});

      // Honeypot tripped → accept silently so bots get no signal, but send nothing.
      if (input.company && input.company.trim().length > 0) {
        return reply.code(202).send({ ok: true });
      }

      const config = env();
      const session = await getOptionalSession(request).catch(() => null);
      const replyToEmail =
        input.email && input.email.length > 0 ? input.email : undefined;

      const metaLines = [
        `Page: ${input.page ?? "—"}`,
        `Reply-to: ${replyToEmail ?? "(not provided)"}`,
        `Session: ${session?.id ?? "—"}`,
        `Request ID: ${request.id}`,
        `Received: ${new Date().toISOString()}`,
      ];

      const text = `New feedback from episto.ch\n\n${input.message}\n\n---\n${metaLines.join("\n")}`;
      const html = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6;color:#18181b">
  <h2 style="margin:0 0 12px;font-size:16px">New feedback from episto.ch</h2>
  <p style="white-space:pre-wrap;margin:0 0 16px">${escapeHtml(input.message)}</p>
  <hr style="border:none;border-top:1px solid #e4e4e7;margin:16px 0" />
  <ul style="padding-left:16px;margin:0;color:#52525b;font-size:12px">
    ${metaLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("\n    ")}
  </ul>
</div>`;

      try {
        await sendEmail({
          to: config.SUPPORT_EMAIL,
          subject: replyToEmail
            ? `episto feedback from ${replyToEmail}`
            : "episto feedback",
          text,
          html,
          ...(replyToEmail ? { replyTo: replyToEmail } : {}),
        });
      } catch (error) {
        request.log.error({ err: error }, "feedback email delivery failed");
        throw providerOutageError("email", error);
      }

      return reply.code(202).send({ ok: true });
    },
  );
}
