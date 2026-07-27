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
   *  episto writes into the letter, not things the user brings. See `prepare`. */
  checklist: string[];
  /** Inputs the USER should have to hand, shown in the workspace intake when the
   *  draft was seeded from this template. Deliberately distinct from `checklist`:
   *  "the lease address" belongs here, "a request for written confirmation" does
   *  not. 3-5 short noun phrases. Draft templates only; service guides never seed. */
  prepare?: string[];
  /** Swiss specifics: notice periods, deadlines, form requirements. */
  notes: LandingNote[];
  faqs: LandingFaq[];
  /** Related slugs for internal linking. */
  related: string[];
}
