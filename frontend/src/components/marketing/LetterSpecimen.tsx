import type { Locale } from "../../i18n/routing";

/**
 * Homepage hero visual: a flat, straight, real typeset sample letter (clearly
 * marked MUSTER) with a mono "dispatch docket" beneath it — the physical output
 * of the product, shown honestly. No grey placeholder bars, no fake date stamp,
 * no decorative script signature, no tilt.
 *
 * Copy is intentionally local (not in the message catalog): it is an
 * illustrative, clearly-labelled sample, and keeping it here avoids churning the
 * translation files for non-user-facing specimen text.
 */
interface SpecimenCopy {
  sampleLabel: string;
  city: string;
  subjectLabel: string;
  subject: string;
  salutation: string;
  body: string;
  closing: string;
  signatory: string;
  docket: {
    dispatch: string;
    dispatchValue: string;
    pages: string;
    status: string;
    statusValue: string;
  };
}

export const SPECIMEN_COPY: Record<Locale, SpecimenCopy> = {
  "de-CH": {
    sampleLabel: "Muster",
    city: "Zürich",
    subjectLabel: "Betreff",
    subject: "Kündigung Mietvertrag, Bahnhofstrasse 12",
    salutation: "Sehr geehrte Damen und Herren",
    body: "Hiermit kündige ich den Mietvertrag für die oben genannte Wohnung ordentlich und fristgerecht per 30. September. Ich bitte Sie um eine schriftliche Bestätigung des Kündigungstermins.",
    closing: "Freundliche Grüsse",
    signatory: "Martin Keller",
    docket: {
      dispatch: "Versandart",
      dispatchValue: "Einschreiben",
      pages: "Seiten",
      status: "Status",
      statusValue: "Bereit zur Freigabe",
    },
  },
  "fr-CH": {
    sampleLabel: "Modèle",
    city: "Genève",
    subjectLabel: "Objet",
    subject: "Résiliation du bail, rue du Rhône 12",
    salutation: "Madame, Monsieur",
    body: "Par la présente, je résilie le bail de l'appartement susmentionné dans les délais ordinaires pour le 30 septembre. Je vous prie de bien vouloir me confirmer par écrit la date de résiliation.",
    closing: "Meilleures salutations",
    signatory: "Martin Rochat",
    docket: {
      dispatch: "Envoi",
      dispatchValue: "Recommandé",
      pages: "Pages",
      status: "Statut",
      statusValue: "Prêt à valider",
    },
  },
  "it-CH": {
    sampleLabel: "Fac-simile",
    city: "Lugano",
    subjectLabel: "Oggetto",
    subject: "Disdetta del contratto di locazione, via Nassa 12",
    salutation: "Egregi Signori",
    body: "Con la presente disdico il contratto di locazione dell'appartamento sopra indicato nei termini ordinari per il 30 settembre. Vi prego di confermarmi per iscritto la data di disdetta.",
    closing: "Distinti saluti",
    signatory: "Martin Bernasconi",
    docket: {
      dispatch: "Spedizione",
      dispatchValue: "Raccomandata",
      pages: "Pagine",
      status: "Stato",
      statusValue: "Pronto per l'invio",
    },
  },
  "en-CH": {
    sampleLabel: "Sample",
    city: "Zurich",
    subjectLabel: "Subject",
    subject: "Termination of lease, Bahnhofstrasse 12",
    salutation: "Dear Sir or Madam",
    body: "I hereby terminate the lease for the above apartment with ordinary notice, effective 30 September. Please confirm the termination date to me in writing.",
    closing: "Kind regards",
    signatory: "Martin Keller",
    docket: {
      dispatch: "Dispatch",
      dispatchValue: "Registered",
      pages: "Pages",
      status: "Status",
      statusValue: "Ready to send",
    },
  },
};

function DocketRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[var(--app-border)] py-1.5 first:border-t-0">
      <span className="uppercase tracking-[0.12em] text-[var(--app-muted)]">{label}</span>
      <span className="text-[var(--app-fg)]">{value}</span>
    </div>
  );
}

export function LetterSpecimen({ locale }: { locale: Locale }) {
  const copy = SPECIMEN_COPY[locale] ?? SPECIMEN_COPY["de-CH"];
  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Zurich",
  }).format(new Date());

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[27rem]">
      {/* The letter — flat, straight document white on the paper background. */}
      <div className="rounded-sm border border-[var(--app-border)] bg-white px-8 py-9 text-zinc-800 shadow-[0_1px_2px_rgba(22,22,22,0.06)] sm:px-10 sm:py-11">
        <div className="flex items-start justify-between gap-6 font-sans">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--app-muted)]">
            {copy.sampleLabel}
          </p>
          <p className="numeral shrink-0 text-[11px] text-zinc-500">
            {copy.city}, {dateLabel}
          </p>
        </div>

        <p className="mt-8 font-sans text-sm text-zinc-900">
          <span className="text-zinc-500">{copy.subjectLabel}: </span>
          <span className="font-semibold">{copy.subject}</span>
        </p>

        <p className="mt-6 font-serif text-[15px] leading-7 text-zinc-700">
          {copy.salutation},
        </p>
        <p className="mt-3 font-serif text-[15px] leading-7 text-zinc-700">{copy.body}</p>

        <p className="mt-6 font-serif text-[15px] leading-7 text-zinc-700">
          {copy.closing}
        </p>
        <p className="mt-1 font-serif text-[15px] text-zinc-900">{copy.signatory}</p>
      </div>

      {/* Dispatch docket — mono, thin rules, one yellow status marker. */}
      <div className="mt-4 rounded-sm border border-[var(--app-border)] bg-[var(--app-surface-muted)] px-5 py-3 font-mono text-[11px]">
        <DocketRow label={copy.docket.dispatch} value={copy.docket.dispatchValue} />
        <DocketRow label={copy.docket.pages} value="01" />
        <div className="flex items-center justify-between gap-4 border-t border-[var(--app-border)] py-1.5">
          <span className="uppercase tracking-[0.12em] text-[var(--app-muted)]">
            {copy.docket.status}
          </span>
          <span className="inline-flex items-center gap-2 text-[var(--app-fg)]">
            <span className="h-2 w-2 rounded-full bg-[var(--action-primary-bg)]" />
            {copy.docket.statusValue}
          </span>
        </div>
      </div>
    </div>
  );
}
