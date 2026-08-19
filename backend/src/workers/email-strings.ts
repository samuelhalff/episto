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
// dispatch-failed
//
// Only ever sent on a settled rejection — the path where we know nothing was
// handed to Swiss Post and the payment has been refunded. The provider's own
// failure text is deliberately not in here: it is written for us, not for the
// customer, and it is the wrong place to leak an internal reason string.
// ---------------------------------------------------------------------------

export interface DispatchFailedStrings {
  subject: string;
  heading: string;
  body: string;
  refundNote: string;
  orderLabel: string;
  recipientLabel: string;
  supportLine: string;
}

export const DISPATCH_FAILED_STRINGS: Record<SupportedLocale, DispatchFailedStrings> = {
  "en-CH": {
    subject: `${BRAND_NAME} – Your letter could not be sent`,
    heading: "Your letter was not sent",
    body: "We were unable to hand your letter to Swiss Post, so it has not been posted.",
    refundNote:
      "You have not been charged: the payment is being refunded and will appear in your account within a few business days.",
    orderLabel: "Order",
    recipientLabel: "Recipient",
    supportLine: "We can help you send it again — contact us at",
  },
  "de-CH": {
    subject: `${BRAND_NAME} – Ihr Brief konnte nicht versendet werden`,
    heading: "Ihr Brief wurde nicht versendet",
    body: "Wir konnten Ihren Brief nicht an die Schweizerische Post übergeben. Er wurde nicht aufgegeben.",
    refundNote:
      "Ihnen wird nichts belastet: Die Zahlung wird zurückerstattet und erscheint innerhalb weniger Werktage auf Ihrem Konto.",
    orderLabel: "Bestellung",
    recipientLabel: "Empfänger",
    supportLine:
      "Wir helfen Ihnen gerne beim erneuten Versand – kontaktieren Sie uns unter",
  },
  "fr-CH": {
    subject: `${BRAND_NAME} – Votre lettre n'a pas pu être envoyée`,
    heading: "Votre lettre n'a pas été envoyée",
    body: "Nous n'avons pas pu remettre votre lettre à La Poste Suisse. Elle n'a pas été postée.",
    refundNote:
      "Rien ne vous est facturé : le paiement est remboursé et apparaîtra sur votre compte dans quelques jours ouvrables.",
    orderLabel: "Commande",
    recipientLabel: "Destinataire",
    supportLine: "Nous pouvons vous aider à la renvoyer — contactez-nous à",
  },
  "it-CH": {
    subject: `${BRAND_NAME} – Non è stato possibile inviare la sua lettera`,
    heading: "La sua lettera non è stata inviata",
    body: "Non siamo riusciti a consegnare la sua lettera alla Posta Svizzera. Non è stata impostata.",
    refundNote:
      "Non le viene addebitato nulla: il pagamento viene rimborsato e apparirà sul suo conto entro alcuni giorni lavorativi.",
    orderLabel: "Ordine",
    recipientLabel: "Destinatario",
    supportLine: "Possiamo aiutarla a inviarla di nuovo — ci contatti all'indirizzo",
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
  subtotalBeforeDiscountLabel: string;
  vatNote: string;
  downloadLabel: string;
  downloadCta: string;
  retentionNotice: string;
  attachmentNote: string;
  supportLine: string;
  promoCodeLabel: string;
  discountLabel: string;
}

export const PAYMENT_RECEIPT_STRINGS: Record<SupportedLocale, PaymentReceiptStrings> = {
  "en-CH": {
    subject: `Your ${BRAND_NAME} receipt`,
    heading: "Payment confirmed",
    body: "Thank you for your order. Your payment has been received and your letter is being processed.",
    orderLabel: "Order",
    totalLabel: "Total",
    subtotalBeforeDiscountLabel: "Subtotal before discount",
    vatNote: "incl. 8.1% VAT",
    downloadLabel: "View or download your letter",
    downloadCta: "View your letter",
    retentionNotice: "This secure link is available for {days} days.",
    attachmentNote: "Your receipt is attached to this email as a PDF.",
    supportLine: "Questions? Contact us at",
    promoCodeLabel: "Promo code",
    discountLabel: "Discount",
  },
  "de-CH": {
    subject: `Ihr ${BRAND_NAME}-Beleg`,
    heading: "Zahlung bestätigt",
    body: "Vielen Dank für Ihre Bestellung. Ihre Zahlung ist eingegangen und Ihr Brief wird bearbeitet.",
    orderLabel: "Bestellung",
    totalLabel: "Total",
    subtotalBeforeDiscountLabel: "Zwischentotal vor Rabatt",
    vatNote: "inkl. 8.1% MWST",
    downloadLabel: "Brief ansehen oder herunterladen",
    downloadCta: "Brief ansehen",
    retentionNotice: "Dieser sichere Link ist {days} Tage lang verfügbar.",
    attachmentNote: "Ihr Beleg ist dieser E-Mail als PDF beigefügt.",
    supportLine: "Fragen? Kontaktieren Sie uns unter",
    promoCodeLabel: "Promo-Code",
    discountLabel: "Rabatt",
  },
  "fr-CH": {
    subject: `Votre reçu ${BRAND_NAME}`,
    heading: "Paiement confirmé",
    body: "Merci pour votre commande. Votre paiement a été reçu et votre lettre est en cours de traitement.",
    orderLabel: "Commande",
    totalLabel: "Total",
    subtotalBeforeDiscountLabel: "Sous-total avant remise",
    vatNote: "TVA 8.1% incluse",
    downloadLabel: "Consulter ou télécharger votre lettre",
    downloadCta: "Consulter votre lettre",
    retentionNotice: "Ce lien sécurisé est disponible pendant {days} jours.",
    attachmentNote: "Votre reçu est joint à cet e-mail au format PDF.",
    supportLine: "Des questions ? Contactez-nous à",
    promoCodeLabel: "Code promo",
    discountLabel: "Remise",
  },
  "it-CH": {
    subject: `La sua ricevuta ${BRAND_NAME}`,
    heading: "Pagamento confermato",
    body: "Grazie per il suo ordine. Il suo pagamento è stato ricevuto e la sua lettera è in lavorazione.",
    orderLabel: "Ordine",
    totalLabel: "Totale",
    subtotalBeforeDiscountLabel: "Subtotale prima dello sconto",
    vatNote: "IVA 8.1% inclusa",
    downloadLabel: "Visualizzi o scarichi la sua lettera",
    downloadCta: "Visualizzi la lettera",
    retentionNotice: "Questo link sicuro è disponibile per {days} giorni.",
    attachmentNote: "La sua ricevuta è allegata a questa e-mail in formato PDF.",
    supportLine: "Domande? Ci contatti all'indirizzo",
    promoCodeLabel: "Codice promozionale",
    discountLabel: "Sconto",
  },
};

// ---------------------------------------------------------------------------
// dispatch-under-review
//
// The hardest email to word: everything true about this state is a negative.
// The letter was handed over, the provider has not answered, and we do not know
// which way it will go. Every line here is therefore checked against four
// things it must NOT imply — rejection, refund, delivery, or provider
// acceptance. "No action is needed" is the point of the message; the status is
// context for it.
// ---------------------------------------------------------------------------

export interface DispatchUnderReviewStrings {
  subject: string;
  heading: string;
  body: string;
  noActionNote: string;
  followUp: string;
  orderLabel: string;
  supportLine: string;
}

export const DISPATCH_UNDER_REVIEW_STRINGS: Record<
  SupportedLocale,
  DispatchUnderReviewStrings
> = {
  "en-CH": {
    subject: `${BRAND_NAME} – We are checking your letter's status`,
    heading: "We are checking your letter's status",
    body: "We submitted your letter, but Swiss Post has not confirmed the outcome yet.",
    noActionNote: "No action is needed from you right now.",
    followUp: "We will email you again as soon as the status is confirmed.",
    orderLabel: "Order",
    supportLine: "Questions? Contact us at",
  },
  "de-CH": {
    subject: `${BRAND_NAME} – Wir prüfen den Status Ihres Briefs`,
    heading: "Wir prüfen den Status Ihres Briefs",
    body: "Wir haben Ihren Brief eingereicht, die Schweizerische Post hat das Ergebnis jedoch noch nicht bestätigt.",
    noActionNote: "Von Ihnen ist derzeit nichts zu tun.",
    followUp:
      "Sobald der Status bestätigt ist, erhalten Sie von uns eine weitere E-Mail.",
    orderLabel: "Bestellung",
    supportLine: "Fragen? Kontaktieren Sie uns unter",
  },
  "fr-CH": {
    subject: `${BRAND_NAME} – Nous vérifions le statut de votre lettre`,
    heading: "Nous vérifions le statut de votre lettre",
    body: "Nous avons soumis votre lettre, mais La Poste Suisse n'a pas encore confirmé le résultat.",
    noActionNote: "Aucune action n'est requise de votre part pour le moment.",
    followUp: "Nous vous écrirons dès que le statut sera confirmé.",
    orderLabel: "Commande",
    supportLine: "Des questions ? Contactez-nous à",
  },
  "it-CH": {
    subject: `${BRAND_NAME} – Stiamo verificando lo stato della sua lettera`,
    heading: "Stiamo verificando lo stato della sua lettera",
    body: "Abbiamo inoltrato la sua lettera, ma la Posta Svizzera non ha ancora confermato l'esito.",
    noActionNote: "Al momento non è richiesta alcuna azione da parte sua.",
    followUp: "Le scriveremo non appena lo stato sarà confermato.",
    orderLabel: "Ordine",
    supportLine: "Domande? Ci contatti all'indirizzo",
  },
};
