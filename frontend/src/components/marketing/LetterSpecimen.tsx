import type { Locale } from "../../i18n/routing";

/**
 * A realistic specimen of Swiss formal correspondence, used as the homepage
 * hero visual. It shows the actual product (a drafted, print-ready letter)
 * rather than an abstract app mockup. Decorative: hidden from assistive tech.
 *
 * Copy here is intentionally local (not in the message catalog): it is an
 * illustrative sample, and the per-locale labels keep the specimen believable
 * to a Swiss reader without churning the translation files.
 */
export const SPECIMEN_COPY: Record<
  Locale,
  {
    city: string;
    betreff: string;
    subject: string;
    salutation: string;
    closing: string;
    signatory: string;
  }
> = {
  "de-CH": {
    city: "Zürich",
    betreff: "Betreff",
    subject: "Kündigung Mietvertrag",
    salutation: "Sehr geehrte Damen und Herren,",
    closing: "Freundliche Grüsse",
    signatory: "M. Keller",
  },
  "fr-CH": {
    city: "Genève",
    betreff: "Objet",
    subject: "Résiliation du bail",
    salutation: "Madame, Monsieur,",
    closing: "Meilleures salutations",
    signatory: "M. Rochat",
  },
  "it-CH": {
    city: "Lugano",
    betreff: "Oggetto",
    subject: "Disdetta del contratto di locazione",
    salutation: "Egregi Signori,",
    closing: "Distinti saluti",
    signatory: "M. Bernasconi",
  },
  "en-CH": {
    city: "Zurich",
    betreff: "Subject",
    subject: "Termination of lease agreement",
    salutation: "Dear Sir or Madam,",
    closing: "Kind regards",
    signatory: "M. Keller",
  },
};

function Bar({ className }: { className?: string }) {
  return (
    <span
      className={`block rounded-full bg-zinc-300/70 dark:bg-zinc-600/50 ${className ?? ""}`}
    />
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
  const stamp = new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Europe/Zurich",
  }).format(new Date());

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[30rem]">
      <div className="letter-sheet rotate-[1.4deg] rounded-[1.5rem] px-7 py-8 sm:px-9 sm:py-10">
        {/* Postmark — restrained, static */}
        <div className="pointer-events-none absolute right-3 top-3 sm:right-5 sm:top-6">
          <div className="postmark flex h-16 w-16 flex-col items-center justify-center text-center text-[8px] font-semibold uppercase leading-tight tracking-wide sm:h-[4.75rem] sm:w-[4.75rem]">
            <span>8000</span>
            <span className="text-[10px]">Zürich</span>
            <span>{stamp}</span>
          </div>
        </div>

        {/* Sender + date */}
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-1.5 pt-0.5">
            <Bar className="h-2 w-24" />
            <Bar className="h-2 w-20" />
          </div>
          <p className="numeral shrink-0 pt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {copy.city}, {dateLabel}
          </p>
        </div>

        {/* Recipient */}
        <div className="mt-8 space-y-2">
          <Bar className="h-2.5 w-40" />
          <Bar className="h-2.5 w-32" />
          <Bar className="h-2.5 w-36" />
        </div>

        {/* Subject */}
        <p className="mt-8 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          <span className="text-zinc-500 dark:text-zinc-400">{copy.betreff}: </span>
          {copy.subject}
        </p>

        {/* Salutation + body */}
        <p className="mt-5 text-[13px] text-zinc-600 dark:text-zinc-300">
          {copy.salutation}
        </p>
        <div className="mt-4 space-y-2.5">
          <Bar className="h-2 w-full" />
          <Bar className="h-2 w-[94%]" />
          <Bar className="h-2 w-[97%]" />
          <Bar className="h-2 w-[88%]" />
          <Bar className="h-2 w-[62%]" />
        </div>

        {/* Closing + signature */}
        <p className="mt-7 text-[13px] text-zinc-600 dark:text-zinc-300">
          {copy.closing}
        </p>
        <p className="signature-script mt-1 text-zinc-800 dark:text-amber-100/90">
          {copy.signatory}
        </p>
      </div>
    </div>
  );
}
