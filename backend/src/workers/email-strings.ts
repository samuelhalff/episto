/**
 * Locale string catalogs for all transactional email templates.
 */

import { BRAND_NAME } from "../shared/brand.js";

export type SupportedLocale = "de-CH" | "fr-CH" | "it-CH" | "en-CH";

export const DEFAULT_LOCALE: SupportedLocale = "en-CH";

export function resolveLocale(locale: string): SupportedLocale {
  const supported: SupportedLocale[] = ["de-CH", "fr-CH", "it-CH", "en-CH"];
  return (
    supported.includes(locale as SupportedLocale) ? locale : DEFAULT_LOCALE
  ) as SupportedLocale;
}

// ---------------------------------------------------------------------------
// dispatch-submitted
// ---------------------------------------------------------------------------

export interface DispatchSubmittedStrings {
  subject: string;
  heading: string;
  body: string;
  orderLabel: string;
  deliveryTypeLabel: string;
  senderLabel: string;
  recipientLabel: string;
  downloadLabel: string;
  retentionNotice: string;
  followUp: string;
  supportLine: string;
}

export const DISPATCH_SUBMITTED_STRINGS: Record<
  SupportedLocale,
  DispatchSubmittedStrings
> = {
  "en-CH": {
    subject: `${BRAND_NAME} – Your letter has been submitted`,
    heading: "Letter submitted",
    body: "Your letter has been submitted to Swiss Post for processing.",
    orderLabel: "Order",
    deliveryTypeLabel: "Delivery type",
    senderLabel: "Sender",
    recipientLabel: "Recipient",
    downloadLabel: "Download letter (PDF)",
    retentionNotice: "Your letter PDF is available for download for {days} days.",
    followUp: "",
    supportLine: "Questions? Contact us at",
  },
  "de-CH": {
    subject: `${BRAND_NAME} – Ihr Brief wurde eingereicht`,
    heading: "Brief eingereicht",
    body: "Ihr Brief wurde zur Bearbeitung an die Schweizerische Post übergeben.",
    orderLabel: "Bestellung",
    deliveryTypeLabel: "Versandart",
    senderLabel: "Absender",
    recipientLabel: "Empfänger",
    downloadLabel: "Brief als PDF herunterladen",
    retentionNotice: "Ihr Brief als PDF steht {days} Tage lang zum Download bereit.",
    followUp: "",
    supportLine: "Fragen? Kontaktieren Sie uns unter",
  },
  "fr-CH": {
    subject: `${BRAND_NAME} – Votre lettre a été soumise`,
    heading: "Lettre soumise",
    body: "Votre lettre a été soumise à La Poste Suisse pour traitement.",
    orderLabel: "Commande",
    deliveryTypeLabel: "Mode d'envoi",
    senderLabel: "Expéditeur",
    recipientLabel: "Destinataire",
    downloadLabel: "Télécharger la lettre (PDF)",
    retentionNotice:
      "Votre lettre au format PDF est disponible au téléchargement pendant {days} jours.",
    followUp: "",
    supportLine: "Des questions ? Contactez-nous à",
  },
  "it-CH": {
    subject: `${BRAND_NAME} – La sua lettera è stata inviata`,
    heading: "Lettera inviata",
    body: "La sua lettera è stata trasmessa alla Posta Svizzera per la lavorazione.",
    orderLabel: "Ordine",
    deliveryTypeLabel: "Tipo di invio",
    senderLabel: "Mittente",
    recipientLabel: "Destinatario",
    downloadLabel: "Scarica la lettera (PDF)",
    retentionNotice:
      "Il PDF della sua lettera è disponibile per il download per {days} giorni.",
    followUp: "",
    supportLine: "Domande? Ci contatti all'indirizzo",
  },
};

// ---------------------------------------------------------------------------
// dispatch-accepted
// ---------------------------------------------------------------------------

export interface DispatchAcceptedStrings {
  subject: string;
  heading: string;
  body: string;
  orderLabel: string;
  deliveryTypeLabel: string;
  senderLabel: string;
  recipientLabel: string;
  referenceLabel: string;
  trackingLabel: string;
  trackOnPostLabel: string;
  downloadLabel: string;
  retentionNotice: string;
  supportLine: string;
}

export const DISPATCH_ACCEPTED_STRINGS: Record<SupportedLocale, DispatchAcceptedStrings> =
  {
    "en-CH": {
      subject: `${BRAND_NAME} – Your letter has been accepted by Swiss Post`,
      heading: "Letter accepted by Swiss Post",
      body: "Swiss Post has confirmed acceptance of your letter for processing and delivery.",
      orderLabel: "Order",
      deliveryTypeLabel: "Delivery type",
      senderLabel: "Sender",
      recipientLabel: "Recipient",
      referenceLabel: "Reference",
      trackingLabel: "Tracking number",
      trackOnPostLabel: "Track on Swiss Post",
      downloadLabel: "Download letter (PDF)",
      retentionNotice: "Your letter PDF is available for download for {days} days.",
      supportLine: "Questions? Contact us at",
    },
    "de-CH": {
      subject: `${BRAND_NAME} – Ihr Brief wurde von der Post akzeptiert`,
      heading: "Brief von der Post akzeptiert",
      body: "Die Schweizerische Post hat den Eingang Ihres Briefes zur Verarbeitung und Zustellung bestätigt.",
      orderLabel: "Bestellung",
      deliveryTypeLabel: "Versandart",
      senderLabel: "Absender",
      recipientLabel: "Empfänger",
      referenceLabel: "Referenz",
      trackingLabel: "Sendungsnummer",
      trackOnPostLabel: "Bei der Post verfolgen",
      downloadLabel: "Brief als PDF herunterladen",
      retentionNotice: "Ihr Brief als PDF steht {days} Tage lang zum Download bereit.",
      supportLine: "Fragen? Kontaktieren Sie uns unter",
    },
    "fr-CH": {
      subject: `${BRAND_NAME} – Votre lettre a été acceptée par La Poste`,
      heading: "Lettre acceptée par La Poste",
      body: "La Poste Suisse a confirmé la réception de votre lettre pour traitement et livraison.",
      orderLabel: "Commande",
      deliveryTypeLabel: "Mode d'envoi",
      senderLabel: "Expéditeur",
      recipientLabel: "Destinataire",
      referenceLabel: "Référence",
      trackingLabel: "Numéro de suivi",
      trackOnPostLabel: "Suivre sur La Poste",
      downloadLabel: "Télécharger la lettre (PDF)",
      retentionNotice:
        "Votre lettre au format PDF est disponible au téléchargement pendant {days} jours.",
      supportLine: "Des questions ? Contactez-nous à",
    },
    "it-CH": {
      subject: `${BRAND_NAME} – La sua lettera è stata accettata dalla Posta`,
      heading: "Lettera accettata dalla Posta",
      body: "La Posta Svizzera ha confermato l'accettazione della sua lettera per la lavorazione e la consegna.",
      orderLabel: "Ordine",
      deliveryTypeLabel: "Tipo di invio",
      senderLabel: "Mittente",
      recipientLabel: "Destinatario",
      referenceLabel: "Riferimento",
      trackingLabel: "Numero di tracciamento",
      trackOnPostLabel: "Traccia su La Posta",
      downloadLabel: "Scarica la lettera (PDF)",
      retentionNotice:
        "Il PDF della sua lettera è disponibile per il download per {days} giorni.",
      supportLine: "Domande? Ci contatti all'indirizzo",
    },
  };

// ---------------------------------------------------------------------------
// resume-link
// ---------------------------------------------------------------------------

export interface ResumeLinkStrings {
  subject: string;
  body: string;
  ctaLabel: string;
  expiry: string;
}

export const RESUME_LINK_STRINGS: Record<SupportedLocale, ResumeLinkStrings> = {
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

// ---------------------------------------------------------------------------
// refund-confirmed
// ---------------------------------------------------------------------------

export interface RefundConfirmedStrings {
  subject: string;
  heading: string;
  body: string;
  orderLabel: string;
  amountLabel: string;
  supportLine: string;
}

export const REFUND_CONFIRMED_STRINGS: Record<SupportedLocale, RefundConfirmedStrings> = {
  "en-CH": {
    subject: `${BRAND_NAME} – Refund Confirmed`,
    heading: "Refund confirmed",
    body: "Your refund has been processed and will appear in your account within a few business days.",
    orderLabel: "Order",
    amountLabel: "Refund amount",
    supportLine: "Questions? Contact us at",
  },
  "de-CH": {
    subject: `${BRAND_NAME} – Rückerstattung bestätigt`,
    heading: "Rückerstattung bestätigt",
    body: "Ihre Rückerstattung wurde verarbeitet und wird innerhalb weniger Werktage auf Ihrem Konto erscheinen.",
    orderLabel: "Bestellung",
    amountLabel: "Erstattungsbetrag",
    supportLine: "Fragen? Kontaktieren Sie uns unter",
  },
  "fr-CH": {
    subject: `${BRAND_NAME} – Remboursement confirmé`,
    heading: "Remboursement confirmé",
    body: "Votre remboursement a été traité et apparaîtra sur votre compte dans quelques jours ouvrables.",
    orderLabel: "Commande",
    amountLabel: "Montant remboursé",
    supportLine: "Des questions ? Contactez-nous à",
  },
  "it-CH": {
    subject: `${BRAND_NAME} – Rimborso confermato`,
    heading: "Rimborso confermato",
    body: "Il suo rimborso è stato elaborato e apparirà sul suo conto entro alcuni giorni lavorativi.",
    orderLabel: "Ordine",
    amountLabel: "Importo rimborsato",
    supportLine: "Domande? Ci contatti all'indirizzo",
  },
};

// ---------------------------------------------------------------------------
// payment-receipt
// ---------------------------------------------------------------------------

export interface PaymentReceiptStrings {
  subject: string;
  heading: string;
  body: string;
  orderLabel: string;
  totalLabel: string;
  vatNote: string;
  downloadLabel: string;
  downloadCta: string;
  retentionNotice: string;
  attachmentNote: string;
  supportLine: string;
}

export const PAYMENT_RECEIPT_STRINGS: Record<SupportedLocale, PaymentReceiptStrings> = {
  "en-CH": {
    subject: `Your ${BRAND_NAME} receipt`,
    heading: "Payment confirmed",
    body: "Thank you for your order. Your payment has been received and your letter is being processed.",
    orderLabel: "Order",
    totalLabel: "Total",
    vatNote: "incl. 8.1% VAT",
    downloadLabel: "View or download your letter",
    downloadCta: "View your letter",
    retentionNotice: "This secure link is available for {days} days.",
    attachmentNote: "Your receipt is attached to this email as a PDF.",
    supportLine: "Questions? Contact us at",
  },
  "de-CH": {
    subject: `Ihr ${BRAND_NAME}-Beleg`,
    heading: "Zahlung bestätigt",
    body: "Vielen Dank für Ihre Bestellung. Ihre Zahlung ist eingegangen und Ihr Brief wird bearbeitet.",
    orderLabel: "Bestellung",
    totalLabel: "Total",
    vatNote: "inkl. 8.1% MWST",
    downloadLabel: "Brief ansehen oder herunterladen",
    downloadCta: "Brief ansehen",
    retentionNotice: "Dieser sichere Link ist {days} Tage lang verfügbar.",
    attachmentNote: "Ihr Beleg ist dieser E-Mail als PDF beigefügt.",
    supportLine: "Fragen? Kontaktieren Sie uns unter",
  },
  "fr-CH": {
    subject: `Votre reçu ${BRAND_NAME}`,
    heading: "Paiement confirmé",
    body: "Merci pour votre commande. Votre paiement a été reçu et votre lettre est en cours de traitement.",
    orderLabel: "Commande",
    totalLabel: "Total",
    vatNote: "TVA 8.1% incluse",
    downloadLabel: "Consulter ou télécharger votre lettre",
    downloadCta: "Consulter votre lettre",
    retentionNotice: "Ce lien sécurisé est disponible pendant {days} jours.",
    attachmentNote: "Votre reçu est joint à cet e-mail au format PDF.",
    supportLine: "Des questions ? Contactez-nous à",
  },
  "it-CH": {
    subject: `La sua ricevuta ${BRAND_NAME}`,
    heading: "Pagamento confermato",
    body: "Grazie per il suo ordine. Il suo pagamento è stato ricevuto e la sua lettera è in lavorazione.",
    orderLabel: "Ordine",
    totalLabel: "Totale",
    vatNote: "IVA 8.1% inclusa",
    downloadLabel: "Visualizzi o scarichi la sua lettera",
    downloadCta: "Visualizzi la lettera",
    retentionNotice: "Questo link sicuro è disponibile per {days} giorni.",
    attachmentNote: "La sua ricevuta è allegata a questa e-mail in formato PDF.",
    supportLine: "Domande? Ci contatti all'indirizzo",
  },
};
