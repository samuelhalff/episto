import type { SnapshotData } from "@swiss-mail/shared";
import { BRAND_NAME, BRAND_COLOR, renderBrandMarkSvg } from "../../shared/brand.js";

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
  issuedOn: string;
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
  dispatchStates: Record<string, string>;
  deliveryTypes: Record<SnapshotData["deliveryType"], string>;
  noteCurrent: string;
  noteLive: string;
  noteBundle: string;
}

const COPY: Record<ConfirmationLocale, ConfirmationCopy> = {
  "en-CH": {
    eyebrow: BRAND_NAME,
    title: "Dispatch statement",
    issuedOn: "Issued on",
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
  },
  "de-CH": {
    eyebrow: BRAND_NAME,
    title: "Versandnachweis",
    issuedOn: "Ausgestellt am",
    orderRef: "Bestellreferenz",
    dispatchStatus: "Versandstatus",
    deliveryType: "Versandart",
    providerReference: "Anbieterreferenz",
    trackingNumber: "Sendungsnummer",
    attachments: "Beilagen",
    sender: "Absender",
    recipient: "Empfaenger",
    subject: "Betreff",
    notAvailable: "Nicht verfuegbar",
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
    noteCurrent: "Dieser Versandnachweis zeigt den aktuellen Versandstand.",
    noteLive:
      "Anbieterkennungen werden exakt wie von der Versandintegration geliefert angezeigt.",
    noteBundle: "Das exakte Brief-PDF beginnt auf der naechsten Seite.",
  },
  "fr-CH": {
    eyebrow: BRAND_NAME,
    title: "Justificatif d'envoi",
    issuedOn: "Etabli le",
    orderRef: "Reference de commande",
    dispatchStatus: "Statut d'envoi",
    deliveryType: "Mode d'envoi",
    providerReference: "Reference prestataire",
    trackingNumber: "Numero de suivi",
    attachments: "Pieces jointes",
    sender: "Expediteur",
    recipient: "Destinataire",
    subject: "Objet",
    notAvailable: "Non disponible",
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
    noteCurrent: "Ce justificatif reflete l'etat actuel de l'envoi.",
    noteLive:
      "Les identifiants prestataire sont affiches exactement comme renvoyes par l'integration d'envoi.",
    noteBundle: "Le PDF exact de la lettre commence a la page suivante.",
  },
  "it-CH": {
    eyebrow: BRAND_NAME,
    title: "Attestazione di spedizione",
    issuedOn: "Emesso il",
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

function resolveControlNote(
  copy: ConfirmationCopy,
  providerMode: SubmissionMode,
): string {
  if (providerMode === "live") {
    return copy.noteLive;
  }

  return copy.noteCurrent;
}

function renderBrandMark(): string {
  return renderBrandMarkSvg(56);
}

export function renderConfirmationDocumentHtml(input: ConfirmationDocumentInput): string {
  const copy = getCopy(input.locale);
  const dispatchStatusLabel =
    copy.dispatchStates[input.dispatchState] ?? input.dispatchState;
  const deliveryTypeLabel = copy.deliveryTypes[input.deliveryType] ?? input.deliveryType;
  const controlNote = resolveControlNote(copy, input.providerMode ?? null);
  const issuedAt = formatDateTime(
    input.locale,
    input.submittedAt ?? new Date(),
    copy.notAvailable,
  );
  const letterHtml = input.letterHtml?.trim() ?? "";
  const showTracking = Boolean(input.trackingNumber);
  const showProviderReference = Boolean(
    input.providerMode === "live" && input.providerReference,
  );
  const showReferenceCard = showTracking || showProviderReference;
  const primaryReferenceLabel = input.trackingNumber
    ? copy.trackingNumber
    : copy.providerReference;
  const primaryReferenceValue =
    input.trackingNumber ?? input.providerReference ?? copy.notAvailable;
  const providerReferenceValue = input.providerReference ?? copy.notAvailable;
  const providerReferenceMeta = showTracking && showProviderReference
    ? `<p class="reference-meta"><span class="reference-meta-label">${escapeHtml(
        copy.providerReference,
      )}</span>${escapeHtml(providerReferenceValue)}</p>`
    : "";
  const subjectValue = input.subject
    ? escapeHtml(input.subject)
    : `<span class="value-muted">${escapeHtml(copy.notAvailable)}</span>`;
  const attachmentTags =
    input.attachmentNames.length > 0
      ? formatList(input.attachmentNames, copy.notAvailable)
      : "";
  const metaItems: string[] = [];

  if (input.subject) {
    metaItems.push(`<div>
          <div class="label">${escapeHtml(copy.subject)}</div>
          <div class="meta-value">${subjectValue}</div>
        </div>`);
  }

  if (input.attachmentNames.length > 0) {
    metaItems.push(`<div>
          <div class="label">${escapeHtml(copy.attachments)}</div>
          <div class="tag-list">${attachmentTags}</div>
        </div>`);
  }

  return `<!DOCTYPE html>
<html lang="${escapeHtml(input.locale)}">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    :root {
      --pdf-bg: #fffaf2;
      --pdf-surface: #ffffff;
      --pdf-surface-soft: #faf7f1;
      --pdf-border: rgba(24, 24, 27, 0.08);
      --pdf-border-strong: rgba(24, 24, 27, 0.14);
      --pdf-text: #18181b;
      --pdf-muted: #71717a;
      --pdf-muted-strong: #3f3f46;
      --pdf-accent: ${BRAND_COLOR};
      --pdf-shadow: none;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      color: var(--pdf-text);
      background: var(--pdf-bg);
    }
    .confirmation-page {
      min-height: 297mm;
      padding: 14mm 14mm 12mm;
      display: flex;
      flex-direction: column;
      gap: 8mm;
    }
    .header-card,
    .hero-card,
    .section-card,
    .party-card,
    .meta-card,
    .footer-note {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid var(--pdf-border);
      border-radius: 16px;
      background: var(--pdf-surface);
      box-shadow: var(--pdf-shadow);
    }
    .header-card {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 12mm;
      padding: 10mm;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand-copy small,
    .label,
    .reference-meta-label,
    .header-meta-label {
      display: block;
      margin-bottom: 4px;
      font-size: 8.5pt;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--pdf-muted);
    }
    .brand-copy h1 {
      margin: 0;
      font-size: 22pt;
      line-height: 1.05;
      font-weight: 800;
    }
    .header-meta {
      min-width: 46mm;
      text-align: right;
    }
    .header-meta-value,
    .fact-value,
    .meta-value,
    .party-value,
    .reference-value,
    .footer-note p {
      word-break: break-word;
    }
    .header-meta-value {
      font-size: 11pt;
      line-height: 1.35;
      font-weight: 700;
      color: var(--pdf-text);
    }
    .fact-card,
    .reference-card {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid var(--pdf-border);
      border-radius: 16px;
      background: var(--pdf-surface);
    }
    .fact-card,
    .party-card,
    .meta-card,
    .reference-card {
      padding: 8mm;
    }
    .facts-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px 16px;
    }
    .reference-card {
      background: var(--pdf-surface-soft);
      border-color: var(--pdf-border-strong);
    }
    .reference-value {
      font-size: 18pt;
      line-height: 1.15;
      font-weight: 900;
      color: var(--pdf-text);
    }
    .tracking-value {
      color: #18181b;
      font-weight: 900;
      letter-spacing: 0.02em;
    }
    .value-muted {
      color: var(--pdf-muted);
      font-weight: 500;
    }
    .reference-meta {
      margin: 10px 0 0;
      font-size: 9pt;
      line-height: 1.5;
      color: var(--pdf-muted-strong);
    }
    .fact-value,
    .meta-value,
    .party-value {
      font-size: 10.75pt;
      line-height: 1.55;
      font-weight: 700;
      color: var(--pdf-text);
    }
    .parties-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 12px 14px;
    }
    .footer-note {
      padding: 6mm 8mm;
      background: var(--pdf-surface-soft);
    }
    .footer-note p {
      margin: 0;
      font-size: 9.25pt;
      line-height: 1.55;
      color: var(--pdf-muted-strong);
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
      background: var(--pdf-surface-soft);
      border: 1px solid var(--pdf-border);
      font-size: 9pt;
      font-weight: 600;
      color: var(--pdf-text);
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <main class="confirmation-page">
    <section class="header-card">
      <div class="brand">
        ${renderBrandMark()}
        <div class="brand-copy">
          <small>${escapeHtml(copy.eyebrow)}</small>
          <h1>${escapeHtml(copy.title)}</h1>
        </div>
      </div>
      <div class="header-meta">
        <div class="header-meta-label">${escapeHtml(copy.issuedOn)}</div>
        <div class="header-meta-value">${escapeHtml(issuedAt)}</div>
      </div>
    </section>

    ${
      showReferenceCard
        ? `<section class="reference-card">
        <div class="label">${escapeHtml(primaryReferenceLabel)}</div>
        <div class="reference-value${showTracking ? " tracking-value" : ""}">${escapeHtml(primaryReferenceValue)}</div>
        ${providerReferenceMeta}
      </section>`
        : ""
    }

    <section class="fact-card">
      <div class="facts-grid">
        <div>
          <div class="label">${escapeHtml(copy.orderRef)}</div>
          <div class="fact-value">${escapeHtml(input.orderRef)}</div>
        </div>
        <div>
          <div class="label">${escapeHtml(copy.dispatchStatus)}</div>
          <div class="fact-value">${escapeHtml(dispatchStatusLabel)}</div>
        </div>
        <div>
          <div class="label">${escapeHtml(copy.deliveryType)}</div>
          <div class="fact-value">${escapeHtml(deliveryTypeLabel)}</div>
        </div>
      </div>
    </section>

    <section class="parties-grid">
      <article class="party-card">
        <div class="label">${escapeHtml(copy.sender)}</div>
        <div class="party-value">${formatAddress(input.sender)}</div>
      </article>
      <article class="party-card">
        <div class="label">${escapeHtml(copy.recipient)}</div>
        <div class="party-value">${formatAddress(input.recipient)}</div>
      </article>
    </section>

    ${
      metaItems.length > 0
        ? `<section class="meta-card">
      <div class="meta-grid">${metaItems.join("")}</div>
    </section>`
        : ""
    }

    <section class="footer-note">
      <p>${escapeHtml(controlNote)}</p>
      <p>${escapeHtml(copy.noteBundle)}</p>
    </section>
  </main>
  ${letterHtml ? `<section class="page-break">${letterHtml}</section>` : ""}
</body>
</html>`;
}
