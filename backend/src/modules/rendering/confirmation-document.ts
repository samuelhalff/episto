import type { SnapshotData } from "@swiss-mail/shared";

type ConfirmationLocale = SnapshotData["locale"];
type ConfirmationAddress = SnapshotData["sender"] | SnapshotData["recipient"];
type SubmissionMode = "mock" | "live" | null;

export interface ConfirmationDocumentInput {
  orderRef: string;
  locale: ConfirmationLocale;
  submittedAt: Date | null;
  dispatchState: string;
  deliveryType: SnapshotData["deliveryType"];
  providerMode?: SubmissionMode;
  providerReference?: string | null;
  trackingNumber?: string | null;
  pageCount: number;
  attachmentNames: string[];
  sender: SnapshotData["sender"];
  recipient: SnapshotData["recipient"];
  subject: string | null;
  contentSummary: string;
  letterHtml?: string;
}

interface ConfirmationCopy {
  eyebrow: string;
  title: string;
  subtitle: string;
  recordedAt: string;
  orderRef: string;
  submittedAt: string;
  dispatchStatus: string;
  deliveryType: string;
  submissionMode: string;
  providerReference: string;
  trackingNumber: string;
  letterPages: string;
  attachments: string;
  sender: string;
  recipient: string;
  subject: string;
  contentSummary: string;
  notes: string;
  notAvailable: string;
  submissionModes: Record<Exclude<SubmissionMode, null>, string>;
  dispatchStates: Record<string, string>;
  deliveryTypes: Record<SnapshotData["deliveryType"], string>;
  summaryPending: string;
  summaryLive: string;
  summaryMock: string;
  noteLive: string;
  noteMock: string;
  noteBundle: string;
}

const COPY: Record<ConfirmationLocale, ConfirmationCopy> = {
  "en-CH": {
    eyebrow: "Swiss Mail record",
    title: "Dispatch confirmation document",
    subtitle:
      "Structured confirmation page followed by the exact letter package prepared for dispatch.",
    recordedAt: "Record generated",
    orderRef: "Order reference",
    submittedAt: "Submitted at",
    dispatchStatus: "Dispatch status",
    deliveryType: "Delivery type",
    submissionMode: "Submission mode",
    providerReference: "Provider reference",
    trackingNumber: "Tracking number",
    letterPages: "Letter pages",
    attachments: "Attachments",
    sender: "Sender",
    recipient: "Recipient",
    subject: "Subject",
    contentSummary: "Content summary",
    notes: "Control notes",
    notAvailable: "Not available",
    submissionModes: {
      mock: "Mock provider response",
      live: "Live ePost submission",
    },
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
    summaryPending:
      "This document records the latest Swiss Mail letter package while provider submission is still pending.",
    summaryLive:
      "This document confirms that Swiss Mail submitted the attached letter package to ePost for physical dispatch.",
    summaryMock:
      "This document confirms that Swiss Mail processed the attached letter package in mock ePost mode. No fee-bearing provider submission occurred.",
    noteLive:
      "Provider identifiers on this page are recorded exactly as returned by the live dispatch integration.",
    noteMock:
      "Mock mode mirrors the response surface expected from ePost so operations can validate references, tracking fields, emails, and PDFs without triggering fees.",
    noteBundle:
      "The pages after this confirmation sheet are the exact rendered letter PDF prepared for dispatch. Keep this bundle as the canonical audit copy.",
  },
  "de-CH": {
    eyebrow: "Swiss Mail Protokoll",
    title: "Versandbestaetigungsdokument",
    subtitle:
      "Strukturierte Bestaetigungsseite mit dem anschliessenden, fuer den Versand vorbereiteten Briefpaket.",
    recordedAt: "Protokoll erstellt",
    orderRef: "Bestellreferenz",
    submittedAt: "Uebermittelt am",
    dispatchStatus: "Versandstatus",
    deliveryType: "Versandart",
    submissionMode: "Uebermittlungsmodus",
    providerReference: "Anbieterreferenz",
    trackingNumber: "Sendungsnummer",
    letterPages: "Briefseiten",
    attachments: "Beilagen",
    sender: "Absender",
    recipient: "Empfaenger",
    subject: "Betreff",
    contentSummary: "Inhaltszusammenfassung",
    notes: "Kontrollhinweise",
    notAvailable: "Nicht verfuegbar",
    submissionModes: {
      mock: "Mock-Antwort",
      live: "Live-ePost-Uebermittlung",
    },
    dispatchStates: {
      queued: "In Warteschlange",
      submitted: "Eingereicht",
      accepted: "Akzeptiert",
      reconciled: "Bestaetigt",
      rejected: "Abgelehnt",
      unknown: "In Klaerung",
    },
    deliveryTypes: {
      standard: "A-Post",
      registered: "Einschreiben",
    },
    summaryPending:
      "Dieses Dokument protokolliert das aktuelle Swiss Mail Briefpaket, waehrend die Anbieteruebermittlung noch aussteht.",
    summaryLive:
      "Dieses Dokument bestaetigt, dass Swiss Mail das beigefuegte Briefpaket zur physischen Zustellung an ePost uebermittelt hat.",
    summaryMock:
      "Dieses Dokument bestaetigt, dass Swiss Mail das beigefuegte Briefpaket im ePost-Mock-Modus verarbeitet hat. Es wurde keine gebuehrenpflichtige Anbieteruebermittlung ausgeloest.",
    noteLive:
      "Alle Anbieterkennungen auf dieser Seite sind exakt so erfasst, wie sie von der Live-Integration geliefert wurden.",
    noteMock:
      "Der Mock-Modus bildet die erwartete ePost-Antwortoberflaeche nach, damit Referenzen, Tracking-Felder, E-Mails und PDFs ohne Gebuehren validiert werden koennen.",
    noteBundle:
      "Die Seiten nach diesem Bestaetigungsblatt sind das exakt gerenderte Brief-PDF, das fuer den Versand vorbereitet wurde. Dieses Paket ist die massgebliche Audit-Kopie.",
  },
  "fr-CH": {
    eyebrow: "Journal Swiss Mail",
    title: "Document de confirmation d'envoi",
    subtitle:
      "Page de confirmation structuree suivie du paquet de lettre prepare pour l'envoi.",
    recordedAt: "Document genere le",
    orderRef: "Reference de commande",
    submittedAt: "Transmis le",
    dispatchStatus: "Statut d'envoi",
    deliveryType: "Mode d'envoi",
    submissionMode: "Mode de soumission",
    providerReference: "Reference prestataire",
    trackingNumber: "Numero de suivi",
    letterPages: "Pages de lettre",
    attachments: "Pieces jointes",
    sender: "Expediteur",
    recipient: "Destinataire",
    subject: "Objet",
    contentSummary: "Resume du contenu",
    notes: "Notes de controle",
    notAvailable: "Non disponible",
    submissionModes: {
      mock: "Reponse mock",
      live: "Soumission ePost en direct",
    },
    dispatchStates: {
      queued: "En attente",
      submitted: "Soumis",
      accepted: "Accepte",
      reconciled: "Confirme",
      rejected: "Rejete",
      unknown: "En verification",
    },
    deliveryTypes: {
      standard: "Courrier standard",
      registered: "Courrier recommande",
    },
    summaryPending:
      "Ce document consigne le dernier paquet de lettre Swiss Mail pendant que la soumission au prestataire est encore en attente.",
    summaryLive:
      "Ce document confirme que Swiss Mail a soumis le paquet de lettre ci-joint a ePost pour l'envoi physique.",
    summaryMock:
      "Ce document confirme que Swiss Mail a traite le paquet de lettre ci-joint en mode mock ePost. Aucune soumission payante au prestataire n'a eu lieu.",
    noteLive:
      "Les identifiants prestataire figurant sur cette page sont enregistres exactement tels qu'ils ont ete renvoyes par l'integration en direct.",
    noteMock:
      "Le mode mock reproduit la surface de reponse attendue d'ePost afin de valider references, champs de suivi, e-mails et PDFs sans frais.",
    noteBundle:
      "Les pages apres cette feuille de confirmation correspondent au PDF de lettre exact prepare pour l'envoi. Conservez ce bundle comme copie d'audit de reference.",
  },
  "it-CH": {
    eyebrow: "Registro Swiss Mail",
    title: "Documento di conferma spedizione",
    subtitle:
      "Pagina di conferma strutturata seguita dal pacchetto lettera preparato per la spedizione.",
    recordedAt: "Documento generato il",
    orderRef: "Riferimento ordine",
    submittedAt: "Trasmesso il",
    dispatchStatus: "Stato spedizione",
    deliveryType: "Tipo di invio",
    submissionMode: "Modalita di invio",
    providerReference: "Riferimento fornitore",
    trackingNumber: "Numero di tracciamento",
    letterPages: "Pagine lettera",
    attachments: "Allegati",
    sender: "Mittente",
    recipient: "Destinatario",
    subject: "Oggetto",
    contentSummary: "Sintesi contenuto",
    notes: "Note di controllo",
    notAvailable: "Non disponibile",
    submissionModes: {
      mock: "Risposta mock",
      live: "Invio ePost live",
    },
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
    summaryPending:
      "Questo documento registra l'ultimo pacchetto lettera Swiss Mail mentre l'invio al fornitore e ancora in attesa.",
    summaryLive:
      "Questo documento conferma che Swiss Mail ha inviato il pacchetto lettera allegato a ePost per la spedizione fisica.",
    summaryMock:
      "Questo documento conferma che Swiss Mail ha elaborato il pacchetto lettera allegato in modalita mock ePost. Non e stato eseguito alcun invio a pagamento verso il fornitore.",
    noteLive:
      "Gli identificativi del fornitore riportati in questa pagina sono registrati esattamente come restituiti dall'integrazione live.",
    noteMock:
      "La modalita mock replica la superficie di risposta prevista da ePost per validare riferimenti, campi tracking, e-mail e PDF senza costi.",
    noteBundle:
      "Le pagine dopo questo foglio di conferma corrispondono al PDF lettera esatto preparato per la spedizione. Conserva questo bundle come copia di audit canonica.",
  },
};

function getCopy(locale: ConfirmationLocale): ConfirmationCopy {
  return COPY[locale as keyof typeof COPY]!;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateTime(
  locale: ConfirmationLocale,
  value: Date | null,
  fallback: string,
): string {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Zurich",
  }).format(value);
}

function formatAddress(address: ConfirmationAddress): string {
  return [
    address.company,
    "department" in address ? address.department : null,
    [address.firstName, address.lastName].filter(Boolean).join(" ") || null,
    address.addressLine1,
    address.addressLine2,
    `${address.postalCode} ${address.city}`,
    address.country && address.country !== "CH" ? address.country : null,
  ]
    .filter((line): line is string => Boolean(line && line.trim().length > 0))
    .map((line) => escapeHtml(line))
    .join("<br>");
}

function formatList(items: string[], fallback: string): string {
  if (items.length === 0) {
    return `<span class="value-muted">${escapeHtml(fallback)}</span>`;
  }

  return items.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("");
}

function resolveSummary(copy: ConfirmationCopy, providerMode: SubmissionMode): string {
  if (providerMode === "mock") {
    return copy.summaryMock;
  }

  if (providerMode === "live") {
    return copy.summaryLive;
  }

  return copy.summaryPending;
}

function resolveControlNote(
  copy: ConfirmationCopy,
  providerMode: SubmissionMode,
): string {
  if (providerMode === "mock") {
    return copy.noteMock;
  }

  if (providerMode === "live") {
    return copy.noteLive;
  }

  return copy.noteBundle;
}

function renderBrandMark(): string {
  return `<svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" role="img">
    <defs>
      <linearGradient id="brand-shell" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#17324d" />
        <stop offset="100%" stop-color="#23476a" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="56" height="56" rx="16" fill="url(#brand-shell)" />
    <path d="M12 18h32v20H12z" fill="none" stroke="#f7f8fa" stroke-width="2.4" stroke-linejoin="round"/>
    <path d="M13 19l15 12 15-12" fill="none" stroke="#f7f8fa" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="36" y="8" width="12" height="12" rx="4" fill="#d64545" />
    <path d="M42 10.5v7M38.5 14h7" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`;
}

export function renderConfirmationDocumentHtml(input: ConfirmationDocumentInput): string {
  const copy = getCopy(input.locale);
  const providerModeLabel = input.providerMode
    ? copy.submissionModes[input.providerMode]
    : copy.notAvailable;
  const dispatchStatusLabel =
    copy.dispatchStates[input.dispatchState] ?? input.dispatchState;
  const deliveryTypeLabel = copy.deliveryTypes[input.deliveryType] ?? input.deliveryType;
  const summaryText = resolveSummary(copy, input.providerMode ?? null);
  const controlNote = resolveControlNote(copy, input.providerMode ?? null);
  const contentSummary =
    input.contentSummary.trim().length > 0 ? input.contentSummary : copy.notAvailable;
  const renderedAt = formatDateTime(input.locale, new Date(), copy.notAvailable);
  const submittedAt = formatDateTime(input.locale, input.submittedAt, copy.notAvailable);
  const letterHtml = input.letterHtml?.trim() ?? "";

  return `<!DOCTYPE html>
<html lang="${escapeHtml(input.locale)}">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      color: #152535;
      background: #edf2f7;
    }
    .confirmation-page {
      height: 297mm;
      padding: 16mm 16mm 14mm;
      overflow: hidden;
      background:
        radial-gradient(circle at top right, rgba(212, 190, 137, 0.18), transparent 32%),
        linear-gradient(180deg, #f9fbfd 0%, #fffdf8 100%);
    }
    .hero {
      border: 1px solid rgba(24, 50, 77, 0.08);
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.94);
      box-shadow: 0 18px 36px rgba(20, 37, 53, 0.08);
      overflow: hidden;
    }
    .hero-top {
      display: flex;
      justify-content: space-between;
      gap: 14mm;
      padding: 12mm 12mm 8mm;
      background: linear-gradient(135deg, #17324d 0%, #244c72 78%, #2b5f89 100%);
      color: #f7f8fa;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-copy small {
      display: block;
      margin-bottom: 4px;
      font-size: 9pt;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(247, 248, 250, 0.72);
    }
    .brand-copy h1 {
      margin: 0;
      font-size: 21pt;
      line-height: 1.05;
      font-weight: 700;
    }
    .brand-copy p {
      margin: 7px 0 0;
      max-width: 110mm;
      font-size: 10pt;
      line-height: 1.45;
      color: rgba(247, 248, 250, 0.86);
    }
    .status-pill {
      align-self: flex-start;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.22);
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .hero-body {
      padding: 10mm 12mm 12mm;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 9mm;
    }
    .summary-card {
      padding: 10px 12px;
      border-radius: 14px;
      border: 1px solid rgba(24, 50, 77, 0.08);
      background: #f8fafc;
    }
    .summary-card .label,
    .detail-card .label,
    .address-card .label {
      margin-bottom: 6px;
      font-size: 8.5pt;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #637284;
    }
    .summary-card .value {
      font-size: 11.5pt;
      font-weight: 700;
      line-height: 1.3;
      color: #152535;
    }
    .summary-card .value-muted,
    .detail-card .value-muted {
      color: #7d8794;
      font-weight: 500;
    }
    .details-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      gap: 12px;
      margin-bottom: 9mm;
    }
    .detail-card,
    .address-card {
      padding: 12px 14px;
      border-radius: 16px;
      border: 1px solid rgba(24, 50, 77, 0.08);
      background: #ffffff;
    }
    .detail-card h2 {
      margin: 0 0 12px;
      font-size: 12.5pt;
    }
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 14px;
    }
    .detail-row .value {
      font-size: 10.5pt;
      font-weight: 600;
      line-height: 1.45;
      color: #152535;
      word-break: break-word;
    }
    .detail-row .value.content-summary-value {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 4;
      overflow: hidden;
    }
    .address-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 12mm;
    }
    .address-card .value {
      font-size: 10.5pt;
      line-height: 1.65;
      color: #152535;
    }
    .notes-card {
      padding: 12px 14px;
      border-radius: 16px;
      border: 1px solid rgba(210, 168, 84, 0.22);
      background: linear-gradient(180deg, rgba(247, 235, 203, 0.8), rgba(255, 250, 240, 0.95));
    }
    .notes-card h2 {
      margin: 0 0 8px;
      font-size: 12.5pt;
    }
    .notes-card p {
      margin: 0 0 8px;
      font-size: 10pt;
      line-height: 1.45;
      color: #49371d;
    }
    .tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      background: #eef3f7;
      border: 1px solid rgba(24, 50, 77, 0.08);
      font-size: 9pt;
      font-weight: 600;
      color: #23476a;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <main class="confirmation-page">
    <section class="hero">
      <div class="hero-top">
        <div class="brand">
          ${renderBrandMark()}
          <div class="brand-copy">
            <small>${escapeHtml(copy.eyebrow)}</small>
            <h1>Swiss Mail</h1>
            <p>${escapeHtml(copy.subtitle)}</p>
          </div>
        </div>
        <div class="status-pill">${escapeHtml(providerModeLabel)}</div>
      </div>
      <div class="hero-body">
        <div style="margin-bottom: 12mm;">
          <div class="label">${escapeHtml(copy.title)}</div>
          <p style="margin: 6px 0 0; font-size: 12pt; line-height: 1.7; color: #324254;">
            ${escapeHtml(summaryText)}
          </p>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">${escapeHtml(copy.orderRef)}</div>
            <div class="value">${escapeHtml(input.orderRef)}</div>
          </div>
          <div class="summary-card">
            <div class="label">${escapeHtml(copy.dispatchStatus)}</div>
            <div class="value">${escapeHtml(dispatchStatusLabel)}</div>
          </div>
          <div class="summary-card">
            <div class="label">${escapeHtml(copy.recordedAt)}</div>
            <div class="value">${escapeHtml(renderedAt)}</div>
          </div>
        </div>

        <div class="details-layout">
          <section class="detail-card">
            <h2>${escapeHtml(copy.title)}</h2>
            <div class="detail-grid">
              <div class="detail-row">
                <div class="label">${escapeHtml(copy.submittedAt)}</div>
                <div class="value">${escapeHtml(submittedAt)}</div>
              </div>
              <div class="detail-row">
                <div class="label">${escapeHtml(copy.deliveryType)}</div>
                <div class="value">${escapeHtml(deliveryTypeLabel)}</div>
              </div>
              <div class="detail-row">
                <div class="label">${escapeHtml(copy.submissionMode)}</div>
                <div class="value">${escapeHtml(providerModeLabel)}</div>
              </div>
              <div class="detail-row">
                <div class="label">${escapeHtml(copy.letterPages)}</div>
                <div class="value">${escapeHtml(String(input.pageCount))}</div>
              </div>
              <div class="detail-row">
                <div class="label">${escapeHtml(copy.providerReference)}</div>
                <div class="value">${input.providerReference ? escapeHtml(input.providerReference) : `<span class="value-muted">${escapeHtml(copy.notAvailable)}</span>`}</div>
              </div>
              <div class="detail-row">
                <div class="label">${escapeHtml(copy.trackingNumber)}</div>
                <div class="value">${input.trackingNumber ? escapeHtml(input.trackingNumber) : `<span class="value-muted">${escapeHtml(copy.notAvailable)}</span>`}</div>
              </div>
              <div class="detail-row" style="grid-column: 1 / -1;">
                <div class="label">${escapeHtml(copy.subject)}</div>
                <div class="value">${input.subject ? escapeHtml(input.subject) : `<span class="value-muted">${escapeHtml(copy.notAvailable)}</span>`}</div>
              </div>
              <div class="detail-row" style="grid-column: 1 / -1;">
                <div class="label">${escapeHtml(copy.contentSummary)}</div>
                <div class="value content-summary-value">${escapeHtml(contentSummary)}</div>
              </div>
              <div class="detail-row" style="grid-column: 1 / -1;">
                <div class="label">${escapeHtml(copy.attachments)}</div>
                <div class="tag-list">${formatList(input.attachmentNames, copy.notAvailable)}</div>
              </div>
            </div>
          </section>

          <section class="notes-card">
            <h2>${escapeHtml(copy.notes)}</h2>
            <p>${escapeHtml(controlNote)}</p>
            <p>${escapeHtml(copy.noteBundle)}</p>
          </section>
        </div>

        <div class="address-grid">
          <section class="address-card">
            <div class="label">${escapeHtml(copy.sender)}</div>
            <div class="value">${formatAddress(input.sender)}</div>
          </section>
          <section class="address-card">
            <div class="label">${escapeHtml(copy.recipient)}</div>
            <div class="value">${formatAddress(input.recipient)}</div>
          </section>
        </div>
      </div>
    </section>
  </main>
  ${letterHtml ? `<section class="page-break">${letterHtml}</section>` : ""}
</body>
</html>`;
}
