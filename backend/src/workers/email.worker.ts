import type { Job, Worker } from "bullmq";
import { createWorker, QUEUE_NAMES, type SendEmailJob } from "../queue/index.js";
import { sendEmail, type TransactionalEmail } from "../modules/email/index.js";

/**
 * Email worker — processes transactional email jobs from the BullMQ queue.
 *
 * Each job contains: to, template, locale, and data.
 * Templates are looked up from a registry; locale determines i18n strings.
 *
 * Templates render locale-specific subject/text/html content and may attach
 * branded PDFs for customer records when a workflow requires it.
 */
export function startEmailWorker(): Worker<SendEmailJob> {
  return createWorker<SendEmailJob>(
    QUEUE_NAMES.SEND_EMAIL,
    async (job: Job<SendEmailJob>) => {
      const { to, template, locale, data } = job.data;

      const rendered = renderTemplate(template, locale, data);
      const attachments = await buildEmailAttachments(template, locale, data);

      const messageId = await sendEmail({
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        attachments,
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

interface EmailAttachmentPayload {
  filename: string;
  content: Buffer;
  contentType: string;
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

function formatIssuedAt(locale: string, value: string): string {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(resolveLocale(locale), {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Zurich",
  }).format(new Date(value));
}

// ---------------------------------------------------------------------------
// Locale string catalog
// ---------------------------------------------------------------------------

interface PaymentReceiptStrings {
  subject: string;
  greeting: string;
  orderLabel: string;
  issuedAtLabel: string;
  amountLabel: string;
  recipientLabel: string;
  deliveryLabel: string;
  attachmentLine: string;
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

const PAYMENT_RECEIPT_STRINGS: Record<SupportedLocale, PaymentReceiptStrings> = {
  "en-CH": {
    subject: "Payment Receipt",
    greeting: "Thank you. Your payment has been confirmed and your receipt PDF is attached.",
    orderLabel: "Order",
    issuedAtLabel: "Paid on",
    amountLabel: "Amount",
    recipientLabel: "Recipient",
    deliveryLabel: "Delivery",
    attachmentLine: "Keep the attached PDF for your accounting or support records.",
    statementLine: "Download your signed dispatch statement",
    statementRetention: "This secure statement link is retained for {days} days.",
    supportLabel: "Support",
    followUp: "We will email a separate dispatch update when postal processing moves forward.",
    viewStatusLabel: "Order status",
  },
  "de-CH": {
    subject: "Zahlungsbestätigung",
    greeting:
      "Vielen Dank. Ihre Zahlung wurde bestaetigt und Ihr Rechnungs-PDF ist angehaengt.",
    orderLabel: "Bestellung",
    issuedAtLabel: "Bezahlt am",
    amountLabel: "Betrag",
    recipientLabel: "Empfaenger",
    deliveryLabel: "Versandart",
    attachmentLine: "Bitte bewahren Sie das angehaengte PDF fuer Buchhaltung oder Support auf.",
    statementLine: "Signierten Versandnachweis herunterladen",
    statementRetention:
      "Dieser sichere Link zum Versandnachweis bleibt {days} Tage verfuegbar.",
    supportLabel: "Support",
    followUp:
      "Sobald der Poststatus weitergeht, erhalten Sie eine separate E-Mail-Aktualisierung.",
    viewStatusLabel: "Bestellstatus",
  },
  "fr-CH": {
    subject: "Confirmation de paiement",
    greeting:
      "Merci. Votre paiement est confirme et votre recu PDF est joint a cet e-mail.",
    orderLabel: "Commande",
    issuedAtLabel: "Paye le",
    amountLabel: "Montant",
    recipientLabel: "Destinataire",
    deliveryLabel: "Livraison",
    attachmentLine:
      "Conservez le PDF joint pour votre comptabilite ou pour toute demande d'assistance.",
    statementLine: "Telecharger votre justificatif d'envoi signe",
    statementRetention:
      "Ce lien securise vers le justificatif reste disponible pendant {days} jours.",
    supportLabel: "Support",
    followUp:
      "Vous recevrez un e-mail distinct lorsque le traitement postal avancera.",
    viewStatusLabel: "Statut de commande",
  },
  "it-CH": {
    subject: "Ricevuta di pagamento",
    greeting:
      "Grazie. Il pagamento e confermato e il PDF della ricevuta e allegato a questo messaggio.",
    orderLabel: "Ordine",
    issuedAtLabel: "Pagato il",
    amountLabel: "Importo",
    recipientLabel: "Destinatario",
    deliveryLabel: "Spedizione",
    attachmentLine:
      "Conservi il PDF allegato per contabilita interna o richieste al supporto.",
    statementLine: "Scarichi la sua attestazione di spedizione firmata",
    statementRetention:
      "Questo link sicuro all'attestazione resta disponibile per {days} giorni.",
    supportLabel: "Supporto",
    followUp:
      "Ricevera un'e-mail separata quando l'elaborazione postale fara un passo avanti.",
    viewStatusLabel: "Stato ordine",
  },
};

const DISPATCH_SUBMITTED_STRINGS: Record<SupportedLocale, DispatchSubmittedStrings> = {
  "en-CH": {
    subject: "Sendly – Your letter has been submitted",
    body: "Your letter has been submitted to Swiss Post for processing.",
    orderLabel: "Order",
    followUp: "You will receive another notification if there are updates.",
  },
  "de-CH": {
    subject: "Sendly – Ihr Brief wurde eingereicht",
    body: "Ihr Brief wurde zur Bearbeitung an die Schweizerische Post übergeben.",
    orderLabel: "Bestellung",
    followUp: "Bei Statusänderungen erhalten Sie eine weitere Benachrichtigung.",
  },
  "fr-CH": {
    subject: "Sendly – Votre lettre a été soumise",
    body: "Votre lettre a été soumise à La Poste Suisse pour traitement.",
    orderLabel: "Commande",
    followUp: "Vous serez notifié en cas de mise à jour.",
  },
  "it-CH": {
    subject: "Sendly – La sua lettera è stata inviata",
    body: "La sua lettera è stata trasmessa alla Posta Svizzera per la lavorazione.",
    orderLabel: "Ordine",
    followUp: "Riceverà un'ulteriore notifica in caso di aggiornamenti.",
  },
};

const DISPATCH_ACCEPTED_STRINGS: Record<SupportedLocale, DispatchAcceptedStrings> = {
  "en-CH": {
    subject: "Sendly – Your letter has been accepted by Swiss Post",
    body: "Swiss Post has confirmed acceptance of your letter.",
    orderLabel: "Order",
    providerReferenceLabel: "Provider reference",
    trackingNumberLabel: "Reference number",
    viewStatusLabel: "Track your letter",
  },
  "de-CH": {
    subject: "Sendly – Ihr Brief wurde von der Post akzeptiert",
    body: "Die Schweizerische Post hat den Eingang Ihres Briefes bestätigt.",
    orderLabel: "Bestellung",
    providerReferenceLabel: "Anbieterreferenz",
    trackingNumberLabel: "Referenznummer",
    viewStatusLabel: "Brief verfolgen",
  },
  "fr-CH": {
    subject: "Sendly – Votre lettre a été acceptée par La Poste",
    body: "La Poste Suisse a confirmé la réception de votre lettre.",
    orderLabel: "Commande",
    providerReferenceLabel: "Référence du prestataire",
    trackingNumberLabel: "Numéro de référence",
    viewStatusLabel: "Suivre votre lettre",
  },
  "it-CH": {
    subject: "Sendly – La sua lettera è stata accettata dalla Posta",
    body: "La Posta Svizzera ha confermato l'accettazione della sua lettera.",
    orderLabel: "Ordine",
    providerReferenceLabel: "Riferimento fornitore",
    trackingNumberLabel: "Numero di riferimento",
    viewStatusLabel: "Traccia la sua lettera",
  },
};

const RESUME_LINK_STRINGS: Record<SupportedLocale, ResumeLinkStrings> = {
  "en-CH": {
    subject: "Sendly – Continue your draft letter",
    body: "You started a letter on Sendly.",
    ctaLabel: "Continue your letter",
    expiry: "This link will expire after your session ends.",
  },
  "de-CH": {
    subject: "Sendly – Entwurfsbrief fortsetzen",
    body: "Sie haben einen Brief auf Sendly begonnen.",
    ctaLabel: "Brief fortsetzen",
    expiry: "Dieser Link verfällt nach Ende Ihrer Sitzung.",
  },
  "fr-CH": {
    subject: "Sendly – Continuez votre brouillon",
    body: "Vous avez commencé une lettre sur Sendly.",
    ctaLabel: "Continuer votre lettre",
    expiry: "Ce lien expirera à la fin de votre session.",
  },
  "it-CH": {
    subject: "Sendly – Continui la sua bozza",
    body: "Ha iniziato una lettera su Sendly.",
    ctaLabel: "Continui la lettera",
    expiry: "Questo link scadrà al termine della sua sessione.",
  },
};

const REFUND_CONFIRMED_STRINGS: Record<SupportedLocale, RefundConfirmedStrings> = {
  "en-CH": {
    subject: "Sendly – Refund Confirmed",
    body: "Your refund has been processed.",
    orderLabel: "Order",
    amountLabel: "Amount",
  },
  "de-CH": {
    subject: "Sendly – Rückerstattung bestätigt",
    body: "Ihre Rückerstattung wurde verarbeitet.",
    orderLabel: "Bestellung",
    amountLabel: "Betrag",
  },
  "fr-CH": {
    subject: "Sendly – Remboursement confirmé",
    body: "Votre remboursement a été traité.",
    orderLabel: "Commande",
    amountLabel: "Montant",
  },
  "it-CH": {
    subject: "Sendly – Rimborso confermato",
    body: "Il suo rimborso è stato elaborato.",
    orderLabel: "Ordine",
    amountLabel: "Importo",
  },
};

function replaceRetentionDays(template: string, days: number): string {
  return template.replace("{days}", String(days));
}

function toAttachmentFilename(brandName: string, orderRef: string): string {
  const slug = brandName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "receipt"}-${orderRef.toLowerCase()}-receipt.pdf`;
}

function readLineItems(data: Record<string, unknown>): Array<{
  label: string;
  amountCents: number;
}> {
  const raw = data.lineItems;
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const label =
      "label" in entry && typeof entry.label === "string" ? entry.label : null;
    const amountCents =
      "amountCents" in entry && typeof entry.amountCents === "number"
        ? entry.amountCents
        : null;

    if (!label || amountCents === null) {
      return [];
    }

    return [{ label, amountCents }];
  });
}

function readLegalEntity(data: Record<string, unknown>): {
  name: string;
  addressLines: string[];
  uidVat: string;
} | null {
  const raw = data.legalEntity;
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const name = "name" in raw && typeof raw.name === "string" ? raw.name : null;
  const uidVat =
    "uidVat" in raw && typeof raw.uidVat === "string" ? raw.uidVat : null;
  const addressLines =
    "addressLines" in raw && Array.isArray(raw.addressLines)
      ? raw.addressLines.filter((line): line is string => typeof line === "string")
      : [];

  if (!name || !uidVat || addressLines.length === 0) {
    return null;
  }

  return { name, addressLines, uidVat };
}

function readStripeReferences(
  data: Record<string, unknown>,
): Record<string, string | null> | null {
  const raw = data.stripeReferences;
  if (!raw || typeof raw !== "object") {
    return null;
  }

  return {
    paymentIntentId:
      "paymentIntentId" in raw && typeof raw.paymentIntentId === "string"
        ? raw.paymentIntentId
        : null,
    chargeId:
      "chargeId" in raw && typeof raw.chargeId === "string" ? raw.chargeId : null,
    receiptUrl:
      "receiptUrl" in raw && typeof raw.receiptUrl === "string"
        ? raw.receiptUrl
        : null,
    invoiceId:
      "invoiceId" in raw && typeof raw.invoiceId === "string" ? raw.invoiceId : null,
    invoicePdfUrl:
      "invoicePdfUrl" in raw && typeof raw.invoicePdfUrl === "string"
        ? raw.invoicePdfUrl
        : null,
  };
}

async function buildPaymentReceiptAttachment(
  locale: string,
  data: Record<string, unknown>,
): Promise<EmailAttachmentPayload | null> {
  const legalEntity = readLegalEntity(data);
  if (!legalEntity) {
    return null;
  }

  const brandName = readString(data, "brandName", "Sendly");
  const orderRef = readString(data, "orderRef");
  const issuedAtIso = readString(data, "issuedAt");
  const amountCents = readInteger(data, "amountCents", 0);
  const customerEmail = readString(data, "customerEmail");
  const senderName = readString(data, "senderName");
  const recipientName = readString(data, "recipientName");
  const supportEmail = readString(data, "supportEmail");
  const statementRetentionDays = readInteger(data, "statementRetentionDays", 10);
  const statusUrl = readString(data, "statusUrl");
  const lineItems = readLineItems(data);

  if (!orderRef || !issuedAtIso || !customerEmail || !statusUrl) {
    return null;
  }

  const [{ renderPdfBufferFromHtml }, { renderPaymentReceiptDocumentHtml }] =
    await Promise.all([
      import("../modules/rendering/render.service.js"),
      import("../modules/rendering/payment-receipt-document.js"),
    ]);

  const html = renderPaymentReceiptDocumentHtml({
    brandName,
    locale: resolveLocale(locale),
    orderRef,
    issuedAt: new Date(issuedAtIso),
    customerEmail,
    senderName,
    recipientName,
    deliveryType: readString(data, "deliveryType", "standard"),
    amountCents,
    currency: readString(data, "currency", "CHF"),
    lineItems,
    supportEmail,
    statementRetentionDays,
    statusUrl,
    legalEntity,
    stripeReferences: readStripeReferences(data),
  });

  const { pdfBuffer } = await renderPdfBufferFromHtml(html, {
    margins: {
      top: "0mm",
      right: "0mm",
      bottom: "0mm",
      left: "0mm",
    },
  });

  return {
    filename: toAttachmentFilename(brandName, orderRef),
    content: pdfBuffer,
    contentType: "application/pdf",
  };
}

async function buildEmailAttachments(
  template: string,
  locale: string,
  data: Record<string, unknown>,
): Promise<TransactionalEmail["attachments"] | undefined> {
  if (template !== "payment-receipt") {
    return undefined;
  }

  const attachment = await buildPaymentReceiptAttachment(locale, data);
  return attachment ? [attachment] : undefined;
}

// ---------------------------------------------------------------------------
// Template renderers
// ---------------------------------------------------------------------------

const TEMPLATES: Record<
  string,
  (locale: string, data: Record<string, unknown>) => RenderedEmail
> = {
  "payment-receipt": (locale, data) => {
    const s = PAYMENT_RECEIPT_STRINGS[resolveLocale(locale)];
    const brandName = readString(data, "brandName", "Sendly");
    const orderRef = readString(data, "orderRef");
    const amount = readString(data, "amount");
    const issuedAt = formatIssuedAt(locale, readString(data, "issuedAt"));
    const recipientName = readString(data, "recipientName");
    const supportEmail = readString(data, "supportEmail");
    const deliveryType = readString(data, "deliveryType", "standard");
    const statusUrl = readString(data, "statusUrl");
    const statementRetentionDays = readInteger(data, "statementRetentionDays", 10);
    const textLines = [
      s.greeting,
      `${s.orderLabel}: ${orderRef}${issuedAt ? ` | ${s.issuedAtLabel}: ${issuedAt}` : ""}`,
      `${s.amountLabel}: CHF ${amount} | ${s.deliveryLabel}: ${deliveryType}`,
      recipientName ? `${s.recipientLabel}: ${recipientName}` : null,
      s.attachmentLine,
      statusUrl ? `${s.statementLine}: ${statusUrl}` : null,
      statusUrl
        ? replaceRetentionDays(s.statementRetention, statementRetentionDays)
        : null,
      statusUrl ? `${s.viewStatusLabel}: ${statusUrl}` : null,
      supportEmail ? `${s.supportLabel}: ${supportEmail}` : null,
      s.followUp,
    ].filter((line): line is string => Boolean(line));

    return {
      subject: `${brandName} – ${s.subject} (${orderRef})`,
      text: textLines.join("\n"),
      html: [
        `<p>${escapeHtml(s.greeting)}</p>`,
        `<p><strong>${escapeHtml(orderRef)}</strong>${issuedAt ? ` · ${escapeHtml(s.issuedAtLabel)}: ${escapeHtml(issuedAt)}` : ""}</p>`,
        `<p>${escapeHtml(s.amountLabel)}: CHF ${escapeHtml(amount)} · ${escapeHtml(s.deliveryLabel)}: ${escapeHtml(deliveryType)}</p>`,
        recipientName
          ? `<p>${escapeHtml(s.recipientLabel)}: ${escapeHtml(recipientName)}</p>`
          : "",
        `<p>${escapeHtml(s.attachmentLine)}</p>`,
        statusUrl
          ? `<p><a href="${escapeHtml(statusUrl)}">${escapeHtml(s.statementLine)}</a><br>${escapeHtml(replaceRetentionDays(s.statementRetention, statementRetentionDays))}</p>`
          : "",
        statusUrl
          ? `<p><a href="${escapeHtml(statusUrl)}">${escapeHtml(s.viewStatusLabel)}</a></p>`
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
