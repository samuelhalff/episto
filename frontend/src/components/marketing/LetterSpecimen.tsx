import type { Locale } from "../../i18n/routing";

/**
 * Homepage hero visual: an actual Episto letter produced by the real PDF render
 * pipeline (registered / EINSCHREIBEN sample), shown per UI language and cropped
 * to A4 content. Rendered offline into /public/hero/letter-<locale>.png via
 * tmp/render-hero-letters-all.mjs. A small caption keeps it honest ("from the
 * Episto PDF · sample data").
 *
 * SPECIMEN_COPY keeps the small per-locale labels still used by UseCaseGrid.
 */
export const SPECIMEN_COPY: Record<Locale, { subjectLabel: string; signatory: string }> =
  {
    "de-CH": { subjectLabel: "Betreff", signatory: "Martin Keller" },
    "fr-CH": { subjectLabel: "Objet", signatory: "Martin Rochat" },
    "it-CH": { subjectLabel: "Oggetto", signatory: "Martin Bernasconi" },
    "en-CH": { subjectLabel: "Subject", signatory: "Martin Keller" },
  };

const HERO_CAPTION: Record<Locale, string> = {
  "de-CH": "Aus dem Episto-PDF · Beispieldaten",
  "fr-CH": "Extrait du PDF Episto · données fictives",
  "it-CH": "Dal PDF di Episto · dati di esempio",
  "en-CH": "From the Episto PDF · sample data",
};

export function LetterSpecimen({ locale }: { locale: Locale }) {
  const caption = HERO_CAPTION[locale] ?? HERO_CAPTION["de-CH"];

  return (
    <div className="mx-auto w-full max-w-[26rem]">
      {/* Decorative: the letter reads as an image; screen readers skip it. */}
      <img
        src={`/hero/letter-${locale}.png`}
        alt=""
        aria-hidden="true"
        className="w-full rounded-sm border border-[var(--app-border)] bg-white shadow-[0_10px_30px_rgba(22,22,22,0.10)]"
      />
      <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--app-muted)]">
        {caption}
      </p>
    </div>
  );
}
