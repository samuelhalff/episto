/** Landing-page content types. */

export interface LandingStep {
  title: string;
  text: string;
}

export interface LandingFaq {
  question: string;
  answer: string;
}

export interface LandingNote {
  title: string;
  body: string;
  /** Optional outbound reference shown under the note body. */
  link?: { href: string; label: string };
}

export interface LandingPage {
  slug: string;
  /** Short cluster label used as the eyebrow + breadcrumb. */
  category: string;
  /** <= ~60 chars, brand appended by the page. */
  metaTitle: string;
  /** ~150-160 chars. */
  metaDescription: string;
  h1: string;
  /** Definition-first answer, ~40-60 words, shown above the fold (GEO). */
  quickAnswer: string;
  steps: LandingStep[];
  /** "What belongs in the letter" checklist. NOT an input list — these are things
   *  episto writes into the letter, not things the user brings. The user-input
   *  counterpart lives in `lib/template-intake.ts`, deliberately outside this
   *  module so the draft workspace can import it without pulling in the landing
   *  datasets. */
  checklist: string[];
  /** Swiss specifics: notice periods, deadlines, form requirements. */
  notes: LandingNote[];
  faqs: LandingFaq[];
  /** Related slugs for internal linking. */
  related: string[];
}
