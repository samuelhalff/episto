import type { SnapshotData } from "@episto/shared";
import { BRAND_NAME } from "../../shared/brand.js";

type ConfirmationLocale = SnapshotData["locale"];

export interface ConfirmationCopy {
  eyebrow: string;
  title: string;
  issuedOn: string;
  depositedOn: string;
  orderRef: string;
  dispatchStatus: string;
  deliveryType: string;
  providerReference: string;
  trackingNumber: string;
  attachments: string;
  sender: string;
  recipient: string;
  subject: string;
  notAvailable: string;
  timezoneSuffix: string;
  dispatchStates: Record<string, string>;
  deliveryTypes: Record<SnapshotData["deliveryType"], string>;
  noteCurrent: string;
  noteLive: string;
  noteBundle: string;
  attestationHeading: string;
  contentSummaryHeading: string;
  fingerprintHeading: string;
  fingerprintNote: string;
  enclosureHashesLabel: string;
  noEnclosures: string;
  letterLabel: string;
  totalContentLabel: string;
  page: string;
  pagePlural: string;
  /** date, deliveryType → attestation sentence. */
  attestation: (date: string, deliveryType: string) => string;
  /** issuer fields → "Established by …" issuer line. */
  issuerLine: (issuer: { name: string; address: string; uidVat: string }) => string;
}

export function pageWord(copy: ConfirmationCopy, count: number): string {
  return count === 1 ? copy.page : copy.pagePlural;
}

const DEFAULT_COPY: ConfirmationCopy = {
  eyebrow: BRAND_NAME,
  title: "Dispatch statement",
  issuedOn: "Statement issued on",
  depositedOn: "Deposited on",
  orderRef: "Order reference",
  dispatchStatus: "Status",
  deliveryType: "Delivery type",
  providerReference: "Provider reference",
  trackingNumber: "Tracking number",
  attachments: "Attachments",
  sender: "Sender",
  recipient: "Recipient",
  subject: "Subject",
  notAvailable: "Not available",
  timezoneSuffix: "Swiss time",
  dispatchStates: {
    queued: "Queued",
    submitted: "Submitted",
    accepted: "Accepted",
    reconciled: "Confirmed",
    rejected: "Rejected",
    unknown: "Pending clarification",
  },
  deliveryTypes: {
    standard: "Standard post",
    registered: "Registered post",
  },
  noteCurrent: "This statement reflects the current dispatch record.",
  noteLive:
    "Provider identifiers are shown exactly as returned by the dispatch integration.",
  noteBundle: "The exact letter PDF follows on the next page.",
  attestationHeading: "Attestation",
  contentSummaryHeading: "Content overview",
  fingerprintHeading: "Letter fingerprint",
  fingerprintNote:
    "Anyone can recompute the SHA-256 fingerprint of the file and compare it with the one shown here; an identical fingerprint establishes that the document is strictly identical to the one handed over to Swiss Post.",
  enclosureHashesLabel: "Enclosure fingerprints",
  noEnclosures: "No enclosures.",
  letterLabel: "Letter",
  totalContentLabel: "Total content",
  page: "page",
  pagePlural: "pages",
  attestation: (date, deliveryType) =>
    `This statement certifies that the letter and enclosures reproduced on the following pages were deposited with Swiss Post on ${date} as ${deliveryType}, and that their content is identical to what was handed over.`,
  issuerLine: (issuer) =>
    `Established by ${issuer.name}, ${issuer.address}, ${issuer.uidVat} — on the basis of the deposit data transmitted by Swiss Post Ltd.`,
};

const COPY = {
  "en-CH": DEFAULT_COPY,
  "de-CH": {
    eyebrow: BRAND_NAME,
    title: "Versandnachweis",
    issuedOn: "Bestätigung erstellt am",
    depositedOn: "Aufgegeben am",
    orderRef: "Bestellreferenz",
    dispatchStatus: "Versandstatus",
    deliveryType: "Versandart",
    providerReference: "Anbieterreferenz",
    trackingNumber: "Sendungsnummer",
    attachments: "Beilagen",
    sender: "Absender",
    recipient: "Empfänger",
    subject: "Betreff",
    notAvailable: "Nicht verfügbar",
    timezoneSuffix: "Schweizer Zeit",
    dispatchStates: {
      queued: "In Warteschlange",
      submitted: "Eingereicht",
      accepted: "Akzeptiert",
      reconciled: "Bestätigt",
      rejected: "Abgelehnt",
      unknown: "In Klärung",
    },
    deliveryTypes: {
      standard: "A-Post",
      registered: "Einschreiben",
    },
    noteCurrent: "Dieser Versandnachweis zeigt den aktuellen Versandstand.",
    noteLive:
      "Anbieterkennungen werden exakt wie von der Versandintegration geliefert angezeigt.",
    noteBundle: "Das exakte Brief-PDF beginnt auf der nächsten Seite.",
    attestationHeading: "Bestätigung",
    contentSummaryHeading: "Inhaltsübersicht",
    fingerprintHeading: "Brief-Fingerabdruck",
    fingerprintNote:
      "Jede Person kann den SHA-256-Fingerabdruck der Datei neu berechnen und mit dem hier angezeigten vergleichen; ein identischer Fingerabdruck belegt, dass das Dokument mit dem der Post übergebenen exakt übereinstimmt.",
    enclosureHashesLabel: "Fingerabdrücke der Beilagen",
    noEnclosures: "Keine Beilagen.",
    letterLabel: "Brief",
    totalContentLabel: "Inhalt gesamt",
    page: "Seite",
    pagePlural: "Seiten",
    attestation: (date, deliveryType) =>
      `Dieser Nachweis bestätigt, dass der Brief und die auf den folgenden Seiten wiedergegebenen Beilagen am ${date} als ${deliveryType} bei der Schweizerischen Post aufgegeben wurden und dass ihr Inhalt mit dem übergebenen identisch ist.`,
    issuerLine: (issuer) =>
      `Erstellt durch ${issuer.name}, ${issuer.address}, ${issuer.uidVat} — auf der Grundlage der von der Schweizerischen Post AG übermittelten Aufgabedaten.`,
  },
  "fr-CH": {
    eyebrow: BRAND_NAME,
    title: "Justificatif d'envoi",
    issuedOn: "Justificatif établi le",
    depositedOn: "Déposé le",
    orderRef: "Référence de commande",
    dispatchStatus: "Statut d'envoi",
    deliveryType: "Mode d'envoi",
    providerReference: "Référence prestataire",
    trackingNumber: "Numéro de suivi",
    attachments: "Pièces jointes",
    sender: "Expéditeur",
    recipient: "Destinataire",
    subject: "Objet",
    notAvailable: "Non disponible",
    timezoneSuffix: "heure suisse",
    dispatchStates: {
      queued: "En attente",
      submitted: "Soumis",
      accepted: "Accepté",
      reconciled: "Confirmé",
      rejected: "Rejeté",
      unknown: "En vérification",
    },
    deliveryTypes: {
      standard: "Courrier standard",
      registered: "Courrier recommandé",
    },
    noteCurrent: "Ce justificatif reflète l'état actuel de l'envoi.",
    noteLive:
      "Les identifiants prestataire sont affichés exactement comme renvoyés par l'intégration d'envoi.",
    noteBundle: "Le PDF exact de la lettre commence à la page suivante.",
    attestationHeading: "Attestation",
    contentSummaryHeading: "Récapitulatif du contenu",
    fingerprintHeading: "Empreinte de la lettre",
    fingerprintNote:
      "Toute personne peut recalculer l'empreinte SHA-256 du fichier et la comparer à celle-ci ; une empreinte identique établit que le document est strictement identique à celui remis à la Poste.",
    enclosureHashesLabel: "Empreintes des pièces jointes",
    noEnclosures: "Aucune pièce jointe.",
    letterLabel: "Lettre",
    totalContentLabel: "Contenu total",
    page: "page",
    pagePlural: "pages",
    attestation: (date, deliveryType) =>
      `Ce justificatif atteste que la lettre et les pièces jointes reproduites sur les pages suivantes ont été déposées à la Poste suisse le ${date} en envoi ${deliveryType}, et que leur contenu est identique à ce qui a été remis.`,
    issuerLine: (issuer) =>
      `Établi par ${issuer.name}, ${issuer.address}, ${issuer.uidVat} — sur la base des données de dépôt transmises par La Poste Suisse SA.`,
  },
  "it-CH": {
    eyebrow: BRAND_NAME,
    title: "Attestazione di spedizione",
    issuedOn: "Attestazione emessa il",
    depositedOn: "Depositato il",
    orderRef: "Riferimento ordine",
    dispatchStatus: "Stato spedizione",
    deliveryType: "Tipo di invio",
    providerReference: "Riferimento fornitore",
    trackingNumber: "Numero di tracciamento",
    attachments: "Allegati",
    sender: "Mittente",
    recipient: "Destinatario",
    subject: "Oggetto",
    notAvailable: "Non disponibile",
    timezoneSuffix: "ora svizzera",
    dispatchStates: {
      queued: "In coda",
      submitted: "Inviato",
      accepted: "Accettato",
      reconciled: "Confermato",
      rejected: "Rifiutato",
      unknown: "In verifica",
    },
    deliveryTypes: {
      standard: "Posta standard",
      registered: "Raccomandata",
    },
    noteCurrent: "Questa attestazione riflette lo stato corrente della spedizione.",
    noteLive:
      "Gli identificativi del fornitore sono riportati esattamente come restituiti dall'integrazione di spedizione.",
    noteBundle: "Il PDF esatto della lettera inizia alla pagina successiva.",
    attestationHeading: "Attestazione",
    contentSummaryHeading: "Riepilogo del contenuto",
    fingerprintHeading: "Impronta della lettera",
    fingerprintNote:
      "Chiunque può ricalcolare l'impronta SHA-256 del file e confrontarla con quella qui riportata; un'impronta identica dimostra che il documento è esattamente identico a quello consegnato alla Posta.",
    enclosureHashesLabel: "Impronte degli allegati",
    noEnclosures: "Nessun allegato.",
    letterLabel: "Lettera",
    totalContentLabel: "Contenuto totale",
    page: "pagina",
    pagePlural: "pagine",
    attestation: (date, deliveryType) =>
      `La presente attestazione certifica che la lettera e gli allegati riprodotti nelle pagine seguenti sono stati depositati alla Posta svizzera il ${date} come ${deliveryType}, e che il loro contenuto è identico a quanto consegnato.`,
    issuerLine: (issuer) =>
      `Rilasciato da ${issuer.name}, ${issuer.address}, ${issuer.uidVat} — sulla base dei dati di deposito trasmessi da La Posta Svizzera SA.`,
  },
} satisfies Record<ConfirmationLocale, ConfirmationCopy>;

export function getCopy(locale: ConfirmationLocale): ConfirmationCopy {
  return COPY[locale as keyof typeof COPY] ?? DEFAULT_COPY;
}

/**
 * Short, lowercase delivery form for use inside the attestation sentence
 * ("en envoi recommandé" rather than "en envoi Courrier recommandé"). Strips
 * a leading "Courrier "/"Posta " noun so the sentence reads naturally.
 */
export function deliveryFormForAttestation(label: string): string {
  return label.replace(/^(Courrier|Posta)\s+/i, "").toLowerCase();
}
