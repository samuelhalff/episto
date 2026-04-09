import type { Job, Worker } from "bullmq";
import { createWorker, QUEUE_NAMES, type SendEmailJob } from "../queue/index.js";
import { sendEmail } from "../modules/email/index.js";
import { renderTemplate } from "./email-templates.js";

// Re-export for consumers (tests, scripts)
export { renderTemplate } from "./email-templates.js";

/**
 * Email worker — processes transactional email jobs from the BullMQ queue.
 *
 * Each job contains: to, template, locale, and data.
 * Templates are looked up from a registry; locale determines i18n strings.
 *
 * Payment receipts are owned by Stripe — this worker only handles
 * service/dispatch and operational email templates.
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
