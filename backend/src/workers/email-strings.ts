/**
 * Locale string catalogs for all transactional email templates.
 */

import { BRAND_NAME } from "../shared/brand.js";

export type SupportedLocale = "de-CH" | "fr-CH" | "it-CH" | "en-CH";

export const DEFAULT_LOCALE: SupportedLocale = "en-CH";

export function resolveLocale(locale: string): SupportedLocale {
  const supported: SupportedLocale[] = ["de-CH", "fr-CH", "it-CH", "en-CH"];
  return (supported.includes(locale as SupportedLocale) ? locale : DEFAULT_LOCALE) as SupportedLocale;
}

// ---------------------------------------------------------------------------
// dispatch-confirmation
// ---------------------------------------------------------------------------

export interface DispatchConfirmationStrings {
  subject: string;
  heading: string;
  greeting: string;
  orderLabel: string;
  recipientLabel: string;
  deliveryLabel: string;
  totalLabel: string;
  trackOnPostLabel: string;
  downloadLabel: string;
  retentionNotice: string;
  nextStepsHeading: string;
  nextStep1: string;
  nextStep2: string;
  nextStep3: string;
  supportLine: string;
}

export const DISPATCH_CONFIRMATION_STRINGS: Record<SupportedLocale, DispatchConfirmationStrings> = {
  "en-CH": {
    subject: "Order Confirmed",
    heading: "Order confirmed",
    greeting: "Your letter is being prepared for dispatch via Swiss Post.",
    orderLabel: "Order",
    recipientLabel: "Recipient",
    deliveryLabel: "Service",
    totalLabel: "Total",
    trackOnPostLabel: "Track on Swiss Post",
    downloadLabel: "Download Confirmation",
    retentionNotice: "Your confirmation document is available for download for {days} days.",
    nextStepsHeading: "What happens next",
    nextStep1: "Your letter is submitted to Swiss Post for printing and dispatch.",
    nextStep2: "You will receive an email when Swiss Post confirms acceptance.",
    nextStep3: "Track delivery on the Swiss Post website once a tracking number is assigned.",
    supportLine: "Questions? Contact us at",
  },
  "de-CH": {
    subject: "Bestellung bestätigt",
    heading: "Bestellung bestätigt",
    greeting: "Ihr Brief wird für den Versand via Schweizerische Post vorbereitet.",
    orderLabel: "Bestellung",
    recipientLabel: "Empfänger",
    deliveryLabel: "Versandart",
    totalLabel: "Total",
    trackOnPostLabel: "Bei der Post verfolgen",
    downloadLabel: "Bestätigung herunterladen",
    retentionNotice: "Ihr Bestätigungsdokument steht {days} Tage zum Download bereit.",
    nextStepsHeading: "Nächste Schritte",
    nextStep1: "Ihr Brief wird der Schweizerischen Post zum Druck und Versand übergeben.",
    nextStep2: "Sie erhalten eine E-Mail, sobald die Schweizerische Post die Annahme bestätigt.",
    nextStep3: "Verfolgen Sie die Zustellung auf der Webseite der Schweizerischen Post, sobald eine Sendungsnummer vorliegt.",
    supportLine: "Fragen? Kontaktieren Sie uns unter",
  },
  "fr-CH": {
    subject: "Commande confirmée",
    heading: "Commande confirmée",
    greeting: "Votre lettre est en préparation pour l'envoi via La Poste Suisse.",
    orderLabel: "Commande",
    recipientLabel: "Destinataire",
    deliveryLabel: "Service",
    totalLabel: "Total",
    trackOnPostLabel: "Suivre sur La Poste",
    downloadLabel: "Télécharger la confirmation",
    retentionNotice: "Votre document de confirmation est disponible au téléchargement pendant {days} jours.",
    nextStepsHeading: "Prochaines étapes",
    nextStep1: "Votre lettre est transmise à La Poste Suisse pour impression et envoi.",
    nextStep2: "Vous recevrez un e-mail lorsque La Poste Suisse confirmera la réception.",
    nextStep3: "Suivez la livraison sur le site de La Poste Suisse dès qu'un numéro de suivi sera attribué.",
    supportLine: "Des questions ? Contactez-nous à",
  },
  "it-CH": {
    subject: "Ordine confermato",
    heading: "Ordine confermato",
    greeting: "La sua lettera è in preparazione per la spedizione tramite la Posta Svizzera.",
    orderLabel: "Ordine",
    recipientLabel: "Destinatario",
    deliveryLabel: "Servizio",
    totalLabel: "Totale",
    trackOnPostLabel: "Traccia su La Posta",
    downloadLabel: "Scarica la conferma",
    retentionNotice: "Il documento di conferma è disponibile per il download per {days} giorni.",
    nextStepsHeading: "Prossimi passi",
    nextStep1: "La sua lettera viene trasmessa alla Posta Svizzera per la stampa e la spedizione.",
    nextStep2: "Riceverà un'e-mail quando la Posta Svizzera confermerà l'accettazione.",
    nextStep3: "Segua la consegna sul sito della Posta Svizzera non appena verrà assegnato un numero di tracciamento.",
    supportLine: "Domande? Ci contatti all'indirizzo",
  },
};

// ---------------------------------------------------------------------------
// dispatch-submitted
// ---------------------------------------------------------------------------

export interface DispatchSubmittedStrings {
  subject: string;
  heading: string;
  body: string;
  orderLabel: string;
  statusLabel: string;
  followUp: string;
}

export const DISPATCH_SUBMITTED_STRINGS: Record<SupportedLocale, DispatchSubmittedStrings> = {
  "en-CH": {
    subject: `${BRAND_NAME} – Your letter has been submitted`,
    heading: "Letter submitted",
    body: "Your letter has been submitted to Swiss Post for processing.",
    orderLabel: "Order",
    statusLabel: "View order status",
    followUp: "You will receive another notification if there are updates.",
  },
  "de-CH": {
    subject: `${BRAND_NAME} – Ihr Brief wurde eingereicht`,
    heading: "Brief eingereicht",
    body: "Ihr Brief wurde zur Bearbeitung an die Schweizerische Post übergeben.",
    orderLabel: "Bestellung",
    statusLabel: "Bestellstatus anzeigen",
    followUp: "Bei Statusänderungen erhalten Sie eine weitere Benachrichtigung.",
  },
  "fr-CH": {
    subject: `${BRAND_NAME} – Votre lettre a été soumise`,
    heading: "Lettre soumise",
    body: "Votre lettre a été soumise à La Poste Suisse pour traitement.",
    orderLabel: "Commande",
    statusLabel: "Voir le statut de la commande",
    followUp: "Vous serez notifié en cas de mise à jour.",
  },
  "it-CH": {
    subject: `${BRAND_NAME} – La sua lettera è stata inviata`,
    heading: "Lettera inviata",
    body: "La sua lettera è stata trasmessa alla Posta Svizzera per la lavorazione.",
    orderLabel: "Ordine",
    statusLabel: "Visualizza lo stato dell'ordine",
    followUp: "Riceverà un'ulteriore notifica in caso di aggiornamenti.",
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
  referenceLabel: string;
  trackingLabel: string;
  trackOnPostLabel: string;
  downloadLabel: string;
  retentionNotice: string;
  supportLine: string;
}

export const DISPATCH_ACCEPTED_STRINGS: Record<SupportedLocale, DispatchAcceptedStrings> = {
  "en-CH": {
    subject: `${BRAND_NAME} – Your letter has been accepted by Swiss Post`,
    heading: "Letter accepted by Swiss Post",
    body: "Swiss Post has confirmed acceptance of your letter for processing and delivery.",
    orderLabel: "Order",
    referenceLabel: "Reference",
    trackingLabel: "Tracking number",
    trackOnPostLabel: "Track on Swiss Post",
    downloadLabel: "Download Confirmation",
    retentionNotice: "Your confirmation document is available for download for {days} days.",
    supportLine: "Questions? Contact us at",
  },
  "de-CH": {
    subject: `${BRAND_NAME} – Ihr Brief wurde von der Post akzeptiert`,
    heading: "Brief von der Post akzeptiert",
    body: "Die Schweizerische Post hat den Eingang Ihres Briefes zur Verarbeitung und Zustellung bestätigt.",
    orderLabel: "Bestellung",
    referenceLabel: "Referenz",
    trackingLabel: "Sendungsnummer",
    trackOnPostLabel: "Bei der Post verfolgen",
    downloadLabel: "Bestätigung herunterladen",
    retentionNotice: "Ihr Bestätigungsdokument steht {days} Tage zum Download bereit.",
    supportLine: "Fragen? Kontaktieren Sie uns unter",
  },
  "fr-CH": {
    subject: `${BRAND_NAME} – Votre lettre a été acceptée par La Poste`,
    heading: "Lettre acceptée par La Poste",
    body: "La Poste Suisse a confirmé la réception de votre lettre pour traitement et livraison.",
    orderLabel: "Commande",
    referenceLabel: "Référence",
    trackingLabel: "Numéro de suivi",
    trackOnPostLabel: "Suivre sur La Poste",
    downloadLabel: "Télécharger la confirmation",
    retentionNotice: "Votre document de confirmation est disponible au téléchargement pendant {days} jours.",
    supportLine: "Des questions ? Contactez-nous à",
  },
  "it-CH": {
    subject: `${BRAND_NAME} – La sua lettera è stata accettata dalla Posta`,
    heading: "Lettera accettata dalla Posta",
    body: "La Posta Svizzera ha confermato l'accettazione della sua lettera per la lavorazione e la consegna.",
    orderLabel: "Ordine",
    referenceLabel: "Riferimento",
    trackingLabel: "Numero di tracciamento",
    trackOnPostLabel: "Traccia su La Posta",
    downloadLabel: "Scarica la conferma",
    retentionNotice: "Il documento di conferma è disponibile per il download per {days} giorni.",
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
