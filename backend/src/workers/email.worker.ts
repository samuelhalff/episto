import type { Job, Worker } from "bullmq";
import { createWorker, QUEUE_NAMES, type SendEmailJob } from "../queue/index.js";
import { sendEmail } from "../modules/email/index.js";

/**
 * Email worker — processes transactional email jobs from the BullMQ queue.
 *
 * Each job contains: to, template, locale, and data.
 * Templates are looked up from a registry; locale determines i18n strings.
 *
 * For now, templates render minimal plain-text + HTML wrappers.
 * Full HTML email templates will be built when design is ready.
 */
export function startEmailWorker(): Worker<SendEmailJob> {
  return createWorker<SendEmailJob>(
    QUEUE_NAMES.SEND_EMAIL,
    async (job: Job<SendEmailJob>) => {
      const { to, template, locale, data } = job.data;

      const rendered = renderTemplate(template, locale, data);

      const messageId = await sendEmail({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      job.log(`Email sent: ${messageId} (template=${template}, locale=${locale})`);
    },
    { concurrency: 5 },
  );
}

// ---------------------------------------------------------------------------
// Template registry (minimal stubs — design needed for full HTML templates)
// ---------------------------------------------------------------------------

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const TEMPLATES: Record<
  string,
  (locale: string, data: Record<string, unknown>) => RenderedEmail
> = {
  "payment-receipt": (_locale, data) => ({
    subject: `Swiss Mail – Payment Receipt (${String(data.orderRef ?? "")})`,
    text: [
      "Thank you for your order.",
      `Order: ${String(data.orderRef ?? "")}`,
      `Amount: CHF ${String(data.amount ?? "")}`,
      `Delivery: ${String(data.deliveryType ?? "Standard")}`,
      "",
      "You will receive dispatch status updates separately.",
    ].join("\n"),
    html: `<p>Thank you for your order <strong>${String(data.orderRef ?? "")}</strong>.</p>
<p>Amount: CHF ${String(data.amount ?? "")}</p>
<p>You will receive dispatch status updates separately.</p>`,
  }),

  "dispatch-submitted": (_locale, data) => ({
    subject: "Swiss Mail – Your letter has been submitted",
    text: [
      "Your letter has been submitted to Swiss Post for processing.",
      `Order: ${String(data.orderRef ?? "")}`,
      "",
      "You will receive another notification if there are updates.",
    ].join("\n"),
    html: `<p>Your letter has been submitted to Swiss Post for processing.</p>
<p>Order: <strong>${String(data.orderRef ?? "")}</strong></p>`,
  }),

  "dispatch-accepted": (_locale, data) => ({
    subject: "Swiss Mail – Your letter has been accepted by Swiss Post",
    text: [
      "Swiss Post has confirmed acceptance of your letter.",
      `Order: ${String(data.orderRef ?? "")}`,
    ].join("\n"),
    html: `<p>Swiss Post has confirmed acceptance of your letter.</p>
<p>Order: <strong>${String(data.orderRef ?? "")}</strong></p>`,
  }),

  "resume-link": (_locale, data) => ({
    subject: "Swiss Mail – Continue your draft letter",
    text: [
      "You started a letter on Swiss Mail.",
      `Continue here: ${String(data.resumeUrl ?? "")}`,
      "",
      "This link will expire after your session ends.",
    ].join("\n"),
    html: `<p>You started a letter on Swiss Mail.</p>
<p><a href="${String(data.resumeUrl ?? "")}">Continue your letter</a></p>`,
  }),

  "refund-confirmed": (_locale, data) => ({
    subject: "Swiss Mail – Refund Confirmed",
    text: [
      "Your refund has been processed.",
      `Order: ${String(data.orderRef ?? "")}`,
      `Amount: CHF ${String(data.amount ?? "")}`,
    ].join("\n"),
    html: `<p>Your refund of CHF ${String(data.amount ?? "")} for order <strong>${String(data.orderRef ?? "")}</strong> has been processed.</p>`,
  }),
};

function renderTemplate(
  template: string,
  locale: string,
  data: Record<string, unknown>,
): RenderedEmail {
  const renderer = TEMPLATES[template];
  if (!renderer) {
    throw new Error(`Unknown email template: ${template}`);
  }
  return renderer(locale, data);
}
