/**
 * Guidance the assistant is given when a draft was seeded from a landing
 * template.
 *
 * This lives server-side on purpose. It used to travel on the wire next to the
 * slug, which meant a client could pair one template's display copy with another
 * template's guidance: the panel said "Wohnung kündigen" while the model was
 * being steered to write a Rechtsvorschlag. Only the slug crosses the boundary
 * now, and both sides are reconstructed from it.
 */
export type TemplateGuidanceEntry = {
  /** What belongs in this kind of letter — not a list of user inputs. */
  checklist: string[];
  /** Framing notes, flattened to `"<title>: <body>"`. */
  considerations: string[];
};
