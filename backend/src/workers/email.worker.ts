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

// ---------------------------------------------------------------------------
// Locale string catalog
// ---------------------------------------------------------------------------

interface PaymentReceiptStrings {
  subject: string;
  greeting: string;
  orderLabel: string;
  amountLabel: string;
  deliveryLabel: string;
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
    subject: "Swiss Mail – Payment Receipt",
    greeting: "Thank you for your order.",
    orderLabel: "Order",
    amountLabel: "Amount",
    deliveryLabel: "Delivery",
    followUp: "You will receive dispatch status updates by email.",
    viewStatusLabel: "Track your letter",
  },
  "de-CH": {
    subject: "Swiss Mail – Zahlungsbestätigung",
    greeting: "Vielen Dank für Ihre Bestellung.",
    orderLabel: "Bestellung",
    amountLabel: "Betrag",
    deliveryLabel: "Versandart",
    followUp: "Über den Versandstatus informieren wir Sie per E-Mail.",
    viewStatusLabel: "Brief verfolgen",
  },
  "fr-CH": {
    subject: "Swiss Mail – Confirmation de paiement",
    greeting: "Merci pour votre commande.",
    orderLabel: "Commande",
    amountLabel: "Montant",
    deliveryLabel: "Livraison",
    followUp: "Vous recevrez les mises à jour de statut par e-mail.",
    viewStatusLabel: "Suivre votre lettre",
  },
  "it-CH": {
    subject: "Swiss Mail – Ricevuta di pagamento",
    greeting: "Grazie per il suo ordine.",
    orderLabel: "Ordine",
    amountLabel: "Importo",
    deliveryLabel: "Spedizione",
    followUp: "Riceverà aggiornamenti sullo stato della spedizione via e-mail.",
    viewStatusLabel: "Traccia la sua lettera",
  },
};

const DISPATCH_SUBMITTED_STRINGS: Record<SupportedLocale, DispatchSubmittedStrings> = {
  "en-CH": {
    subject: "Swiss Mail – Your letter has been submitted",
    body: "Your letter has been submitted to Swiss Post for processing.",
    orderLabel: "Order",
    followUp: "You will receive another notification if there are updates.",
  },
  "de-CH": {
    subject: "Swiss Mail – Ihr Brief wurde eingereicht",
    body: "Ihr Brief wurde zur Bearbeitung an die Schweizerische Post übergeben.",
    orderLabel: "Bestellung",
    followUp: "Bei Statusänderungen erhalten Sie eine weitere Benachrichtigung.",
  },
  "fr-CH": {
    subject: "Swiss Mail – Votre lettre a été soumise",
    body: "Votre lettre a été soumise à La Poste Suisse pour traitement.",
    orderLabel: "Commande",
    followUp: "Vous serez notifié en cas de mise à jour.",
  },
  "it-CH": {
    subject: "Swiss Mail – La sua lettera è stata inviata",
    body: "La sua lettera è stata trasmessa alla Posta Svizzera per la lavorazione.",
    orderLabel: "Ordine",
    followUp: "Riceverà un'ulteriore notifica in caso di aggiornamenti.",
  },
};

const DISPATCH_ACCEPTED_STRINGS: Record<SupportedLocale, DispatchAcceptedStrings> = {
  "en-CH": {
    subject: "Swiss Mail – Your letter has been accepted by Swiss Post",
    body: "Swiss Post has confirmed acceptance of your letter.",
    orderLabel: "Order",
  },
  "de-CH": {
    subject: "Swiss Mail – Ihr Brief wurde von der Post akzeptiert",
    body: "Die Schweizerische Post hat den Eingang Ihres Briefes bestätigt.",
    orderLabel: "Bestellung",
  },
  "fr-CH": {
    subject: "Swiss Mail – Votre lettre a été acceptée par La Poste",
    body: "La Poste Suisse a confirmé la réception de votre lettre.",
    orderLabel: "Commande",
  },
  "it-CH": {
    subject: "Swiss Mail – La sua lettera è stata accettata dalla Posta",
    body: "La Posta Svizzera ha confermato l'accettazione della sua lettera.",
    orderLabel: "Ordine",
  },
};

const RESUME_LINK_STRINGS: Record<SupportedLocale, ResumeLinkStrings> = {
  "en-CH": {
    subject: "Swiss Mail – Continue your draft letter",
    body: "You started a letter on Swiss Mail.",
    ctaLabel: "Continue your letter",
    expiry: "This link will expire after your session ends.",
  },
  "de-CH": {
    subject: "Swiss Mail – Entwurfsbrief fortsetzen",
    body: "Sie haben einen Brief auf Swiss Mail begonnen.",
    ctaLabel: "Brief fortsetzen",
    expiry: "Dieser Link verfällt nach Ende Ihrer Sitzung.",
  },
  "fr-CH": {
    subject: "Swiss Mail – Continuez votre brouillon",
    body: "Vous avez commencé une lettre sur Swiss Mail.",
    ctaLabel: "Continuer votre lettre",
    expiry: "Ce lien expirera à la fin de votre session.",
  },
  "it-CH": {
    subject: "Swiss Mail – Continui la sua bozza",
    body: "Ha iniziato una lettera su Swiss Mail.",
    ctaLabel: "Continui la lettera",
    expiry: "Questo link scadrà al termine della sua sessione.",
  },
};

const REFUND_CONFIRMED_STRINGS: Record<SupportedLocale, RefundConfirmedStrings> = {
  "en-CH": {
    subject: "Swiss Mail – Refund Confirmed",
    body: "Your refund has been processed.",
    orderLabel: "Order",
    amountLabel: "Amount",
  },
  "de-CH": {
    subject: "Swiss Mail – Rückerstattung bestätigt",
    body: "Ihre Rückerstattung wurde verarbeitet.",
    orderLabel: "Bestellung",
    amountLabel: "Betrag",
  },
  "fr-CH": {
    subject: "Swiss Mail – Remboursement confirmé",
    body: "Votre remboursement a été traité.",
    orderLabel: "Commande",
    amountLabel: "Montant",
  },
  "it-CH": {
    subject: "Swiss Mail – Rimborso confermato",
    body: "Il suo rimborso è stato elaborato.",
    orderLabel: "Ordine",
    amountLabel: "Importo",
  },
};

// ---------------------------------------------------------------------------
// Template renderers
// ---------------------------------------------------------------------------

const TEMPLATES: Record<
  string,
  (locale: string, data: Record<string, unknown>) => RenderedEmail
> = {
  "payment-receipt": (locale, data) => {
    const s = PAYMENT_RECEIPT_STRINGS[resolveLocale(locale)];
    const orderRef = String(data.orderRef ?? "");
    const amount = String(data.amount ?? "");
    const deliveryType = String(data.deliveryType ?? "Standard");
    const statusUrl = typeof data.statusUrl === "string" ? data.statusUrl : null;
    const textLines = [
      s.greeting,
      `${s.orderLabel}: ${orderRef}`,
      `${s.amountLabel}: CHF ${amount}`,
      `${s.deliveryLabel}: ${deliveryType}`,
      "",
      s.followUp,
    ];
    if (statusUrl) textLines.push("", `${s.viewStatusLabel}: ${statusUrl}`);
    return {
      subject: `${s.subject} (${orderRef})`,
      text: textLines.join("\n"),
      html: [
        `<p>${s.greeting} <strong>${orderRef}</strong>.</p>`,
        `<p>${s.amountLabel}: CHF ${amount}</p>`,
        `<p>${s.followUp}</p>`,
        statusUrl
          ? `<p><a href="${statusUrl}">${s.viewStatusLabel}</a></p>`
          : "",
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
    return {
      subject: s.subject,
      text: [s.body, `${s.orderLabel}: ${orderRef}`].join("\n"),
      html: `<p>${s.body}</p><p>${s.orderLabel}: <strong>${orderRef}</strong></p>`,
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
