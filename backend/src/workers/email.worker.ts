import type { Job, Worker } from "bullmq";
import { createWorker, QUEUE_NAMES, type SendEmailJob } from "../queue/index.js";
import { sendEmail, type TransactionalEmail } from "../modules/email/index.js";
import { BRAND_NAME } from "../shared/brand.js";

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

// ---------------------------------------------------------------------------
// Template registry (minimal stubs — design needed for full HTML templates)
// ---------------------------------------------------------------------------

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}


function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readString(
  data: Record<string, unknown>,
  key: string,
  fallback = "",
): string {
  const value = data[key];
  return typeof value === "string" ? value : fallback;
}

function readInteger(
  data: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = data[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Locale string catalog
// ---------------------------------------------------------------------------

interface DispatchConfirmationStrings {
  subject: string;
  greeting: string;
  orderLabel: string;
  recipientLabel: string;
  deliveryLabel: string;
  statementLine: string;
  statementRetention: string;
  supportLabel: string;
  followUp: string;
  viewStatusLabel: string;
}

interface DispatchSubmittedStrings {
  subject: string;
  body: string;
  orderLabel: string;
  followUp: string;
}

interface DispatchAcceptedStrings {
  subject: string;
  body: string;
  orderLabel: string;
  providerReferenceLabel: string;
  trackingNumberLabel: string;
  viewStatusLabel: string;
}

interface ResumeLinkStrings {
  subject: string;
  body: string;
  ctaLabel: string;
  expiry: string;
}

interface RefundConfirmedStrings {
  subject: string;
  body: string;
  orderLabel: string;
  amountLabel: string;
}

type SupportedLocale = "de-CH" | "fr-CH" | "it-CH" | "en-CH";

const DEFAULT_LOCALE: SupportedLocale = "en-CH";

function resolveLocale(locale: string): SupportedLocale {
  const supported: SupportedLocale[] = ["de-CH", "fr-CH", "it-CH", "en-CH"];
  return (supported.includes(locale as SupportedLocale) ? locale : DEFAULT_LOCALE) as SupportedLocale;
}

const DISPATCH_CONFIRMATION_STRINGS: Record<SupportedLocale, DispatchConfirmationStrings> = {
  "en-CH": {
    subject: "Order Confirmed",
    greeting: "Your order has been received and dispatch is being prepared.",
    orderLabel: "Order",
    recipientLabel: "Recipient",
    deliveryLabel: "Delivery",
    statementLine: "View your dispatch statement",
    statementRetention: "This secure link is available for {days} days.",
    supportLabel: "Support",
    followUp: "You will receive a separate update when postal processing moves forward.",
    viewStatusLabel: "Order status",
  },
  "de-CH": {
    subject: "Bestellung bestätigt",
    greeting: "Ihre Bestellung wurde entgegengenommen und der Versand wird vorbereitet.",
    orderLabel: "Bestellung",
    recipientLabel: "Empfaenger",
    deliveryLabel: "Versandart",
    statementLine: "Versandnachweis ansehen",
    statementRetention:
      "Dieser sichere Link bleibt {days} Tage verfuegbar.",
    supportLabel: "Support",
    followUp:
      "Sobald der Poststatus weitergeht, erhalten Sie eine separate Benachrichtigung.",
    viewStatusLabel: "Bestellstatus",
  },
  "fr-CH": {
    subject: "Commande confirmée",
    greeting: "Votre commande a été reçue et l'envoi est en préparation.",
    orderLabel: "Commande",
    recipientLabel: "Destinataire",
    deliveryLabel: "Mode d'envoi",
    statementLine: "Consulter le justificatif d'envoi",
    statementRetention:
      "Ce lien sécurisé reste disponible pendant {days} jours.",
    supportLabel: "Support",
    followUp:
      "Vous recevrez une notification distincte lorsque le traitement postal avancera.",
    viewStatusLabel: "Statut de commande",
  },
  "it-CH": {
    subject: "Ordine confermato",
    greeting: "Il suo ordine è stato ricevuto e la spedizione è in preparazione.",
    orderLabel: "Ordine",
    recipientLabel: "Destinatario",
    deliveryLabel: "Tipo di invio",
    statementLine: "Consulti l'attestazione di spedizione",
    statementRetention:
      "Questo link sicuro resta disponibile per {days} giorni.",
    supportLabel: "Supporto",
    followUp:
      "Riceverà una notifica separata quando l'elaborazione postale farà un passo avanti.",
    viewStatusLabel: "Stato ordine",
  },
};

const DISPATCH_SUBMITTED_STRINGS: Record<SupportedLocale, DispatchSubmittedStrings> = {
  "en-CH": {
    subject: `${BRAND_NAME} – Your letter has been submitted`,
    body: "Your letter has been submitted to Swiss Post for processing.",
    orderLabel: "Order",
    followUp: "You will receive another notification if there are updates.",
  },
  "de-CH": {
    subject: `${BRAND_NAME} – Ihr Brief wurde eingereicht`,
    body: "Ihr Brief wurde zur Bearbeitung an die Schweizerische Post übergeben.",
    orderLabel: "Bestellung",
    followUp: "Bei Statusänderungen erhalten Sie eine weitere Benachrichtigung.",
  },
  "fr-CH": {
    subject: `${BRAND_NAME} – Votre lettre a été soumise`,
    body: "Votre lettre a été soumise à La Poste Suisse pour traitement.",
    orderLabel: "Commande",
    followUp: "Vous serez notifié en cas de mise à jour.",
  },
  "it-CH": {
    subject: `${BRAND_NAME} – La sua lettera è stata inviata`,
    body: "La sua lettera è stata trasmessa alla Posta Svizzera per la lavorazione.",
    orderLabel: "Ordine",
    followUp: "Riceverà un'ulteriore notifica in caso di aggiornamenti.",
  },
};

const DISPATCH_ACCEPTED_STRINGS: Record<SupportedLocale, DispatchAcceptedStrings> = {
  "en-CH": {
    subject: `${BRAND_NAME} – Your letter has been accepted by Swiss Post`,
    body: "Swiss Post has confirmed acceptance of your letter.",
    orderLabel: "Order",
    providerReferenceLabel: "Provider reference",
    trackingNumberLabel: "Reference number",
    viewStatusLabel: "Track your letter",
  },
  "de-CH": {
    subject: `${BRAND_NAME} – Ihr Brief wurde von der Post akzeptiert`,
    body: "Die Schweizerische Post hat den Eingang Ihres Briefes bestätigt.",
    orderLabel: "Bestellung",
    providerReferenceLabel: "Anbieterreferenz",
    trackingNumberLabel: "Referenznummer",
    viewStatusLabel: "Brief verfolgen",
  },
  "fr-CH": {
    subject: `${BRAND_NAME} – Votre lettre a été acceptée par La Poste`,
    body: "La Poste Suisse a confirmé la réception de votre lettre.",
    orderLabel: "Commande",
    providerReferenceLabel: "Référence du prestataire",
    trackingNumberLabel: "Numéro de référence",
    viewStatusLabel: "Suivre votre lettre",
  },
  "it-CH": {
    subject: `${BRAND_NAME} – La sua lettera è stata accettata dalla Posta`,
    body: "La Posta Svizzera ha confermato l'accettazione della sua lettera.",
    orderLabel: "Ordine",
    providerReferenceLabel: "Riferimento fornitore",
    trackingNumberLabel: "Numero di riferimento",
    viewStatusLabel: "Traccia la sua lettera",
  },
};

const RESUME_LINK_STRINGS: Record<SupportedLocale, ResumeLinkStrings> = {
  "en-CH": {
    subject: `${BRAND_NAME} – Continue your draft letter`,
    body: `You started a letter on ${BRAND_NAME}.`,
    ctaLabel: "Continue your letter",
    expiry: "This link will expire after your session ends.",
  },
  "de-CH": {
    subject: `${BRAND_NAME} – Entwurfsbrief fortsetzen`,
    body: `Sie haben einen Brief auf ${BRAND_NAME} begonnen.`,
    ctaLabel: "Brief fortsetzen",
    expiry: "Dieser Link verfällt nach Ende Ihrer Sitzung.",
  },
  "fr-CH": {
    subject: `${BRAND_NAME} – Continuez votre brouillon`,
    body: `Vous avez commencé une lettre sur ${BRAND_NAME}.`,
    ctaLabel: "Continuer votre lettre",
    expiry: "Ce lien expirera à la fin de votre session.",
  },
  "it-CH": {
    subject: `${BRAND_NAME} – Continui la sua bozza`,
    body: `Ha iniziato una lettera su ${BRAND_NAME}.`,
    ctaLabel: "Continui la lettera",
    expiry: "Questo link scadrà al termine della sua sessione.",
  },
};

const REFUND_CONFIRMED_STRINGS: Record<SupportedLocale, RefundConfirmedStrings> = {
  "en-CH": {
    subject: `${BRAND_NAME} – Refund Confirmed`,
    body: "Your refund has been processed.",
    orderLabel: "Order",
    amountLabel: "Amount",
  },
  "de-CH": {
    subject: `${BRAND_NAME} – Rückerstattung bestätigt`,
    body: "Ihre Rückerstattung wurde verarbeitet.",
    orderLabel: "Bestellung",
    amountLabel: "Betrag",
  },
  "fr-CH": {
    subject: `${BRAND_NAME} – Remboursement confirmé`,
    body: "Votre remboursement a été traité.",
    orderLabel: "Commande",
    amountLabel: "Montant",
  },
  "it-CH": {
    subject: `${BRAND_NAME} – Rimborso confermato`,
    body: "Il suo rimborso è stato elaborato.",
    orderLabel: "Ordine",
    amountLabel: "Importo",
  },
};

function replaceRetentionDays(template: string, days: number): string {
  return template.replace("{days}", String(days));
}

// ---------------------------------------------------------------------------
// Template renderers
// ---------------------------------------------------------------------------

const TEMPLATES: Record<
  string,
  (locale: string, data: Record<string, unknown>) => RenderedEmail
> = {
  "dispatch-confirmation": (locale, data) => {
    const s = DISPATCH_CONFIRMATION_STRINGS[resolveLocale(locale)];
    const brandName = readString(data, "brandName", BRAND_NAME);
    const orderRef = readString(data, "orderRef");
    const recipientName = readString(data, "recipientName");
    const supportEmail = readString(data, "supportEmail");
    const deliveryType = readString(data, "deliveryType", "standard");
    const statusUrl = readString(data, "statusUrl");
    const statementRetentionDays = readInteger(data, "statementRetentionDays", 10);
    const textLines = [
      s.greeting,
      `${s.orderLabel}: ${orderRef}`,
      recipientName ? `${s.recipientLabel}: ${recipientName}` : null,
      `${s.deliveryLabel}: ${deliveryType}`,
      statusUrl ? `${s.statementLine}: ${statusUrl}` : null,
      statusUrl
        ? replaceRetentionDays(s.statementRetention, statementRetentionDays)
        : null,
      supportEmail ? `${s.supportLabel}: ${supportEmail}` : null,
      s.followUp,
    ].filter((line): line is string => Boolean(line));

    return {
      subject: `${brandName} – ${s.subject} (${orderRef})`,
      text: textLines.join("\n"),
      html: [
        `<p>${escapeHtml(s.greeting)}</p>`,
        `<p><strong>${escapeHtml(orderRef)}</strong></p>`,
        recipientName
          ? `<p>${escapeHtml(s.recipientLabel)}: ${escapeHtml(recipientName)}</p>`
          : "",
        `<p>${escapeHtml(s.deliveryLabel)}: ${escapeHtml(deliveryType)}</p>`,
        statusUrl
          ? `<p><a href="${escapeHtml(statusUrl)}">${escapeHtml(s.statementLine)}</a><br>${escapeHtml(replaceRetentionDays(s.statementRetention, statementRetentionDays))}</p>`
          : "",
        supportEmail
          ? `<p>${escapeHtml(s.supportLabel)}: <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a></p>`
          : "",
        `<p>${escapeHtml(s.followUp)}</p>`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
  },

  "dispatch-submitted": (locale, data) => {
    const s = DISPATCH_SUBMITTED_STRINGS[resolveLocale(locale)];
    const orderRef = String(data.orderRef ?? "");
    return {
      subject: s.subject,
      text: [s.body, `${s.orderLabel}: ${orderRef}`, "", s.followUp].join("\n"),
      html: `<p>${s.body}</p><p>${s.orderLabel}: <strong>${orderRef}</strong></p>`,
    };
  },

  "dispatch-accepted": (locale, data) => {
    const s = DISPATCH_ACCEPTED_STRINGS[resolveLocale(locale)];
    const orderRef = String(data.orderRef ?? "");
    const providerReference =
      typeof data.providerReference === "string" ? data.providerReference : "";
    const trackingNumber =
      typeof data.trackingNumber === "string" ? data.trackingNumber : "";
    const statusUrl = typeof data.statusUrl === "string" ? data.statusUrl : null;
    const textLines = [s.body, `${s.orderLabel}: ${orderRef}`];

    if (providerReference) {
      textLines.push(`${s.providerReferenceLabel}: ${providerReference}`);
    }
    if (trackingNumber) {
      textLines.push(`${s.trackingNumberLabel}: ${trackingNumber}`);
    }
    if (statusUrl) {
      textLines.push("", `${s.viewStatusLabel}: ${statusUrl}`);
    }

    return {
      subject: s.subject,
      text: textLines.join("\n"),
      html: [
        `<p>${s.body}</p>`,
        `<p>${s.orderLabel}: <strong>${orderRef}</strong></p>`,
        providerReference
          ? `<p>${s.providerReferenceLabel}: <strong>${providerReference}</strong></p>`
          : "",
        trackingNumber
          ? `<p>${s.trackingNumberLabel}: <strong>${trackingNumber}</strong></p>`
          : "",
        statusUrl ? `<p><a href="${statusUrl}">${s.viewStatusLabel}</a></p>` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  },

  "resume-link": (locale, data) => {
    const s = RESUME_LINK_STRINGS[resolveLocale(locale)];
    const resumeUrl = String(data.resumeUrl ?? "");
    return {
      subject: s.subject,
      text: [s.body, resumeUrl, "", s.expiry].join("\n"),
      html: `<p>${s.body}</p><p><a href="${resumeUrl}">${s.ctaLabel}</a></p>`,
    };
  },

  "refund-confirmed": (locale, data) => {
    const s = REFUND_CONFIRMED_STRINGS[resolveLocale(locale)];
    const orderRef = String(data.orderRef ?? "");
    const amount = String(data.amount ?? "");
    return {
      subject: s.subject,
      text: [s.body, `${s.orderLabel}: ${orderRef}`, `${s.amountLabel}: CHF ${amount}`].join("\n"),
      html: `<p>${s.body}</p><p>${s.amountLabel}: CHF ${amount} – ${s.orderLabel}: <strong>${orderRef}</strong></p>`,
    };
  },
};

export function renderTemplate(
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
