/**
 * Intake copy the draft workspace shows when a draft was seeded from a template.
 *
 * `prepare` is NOT the landing `checklist`. The checklist is what the finished
 * letter must contain (episto writes it); `prepare` is what the USER should
 * have to hand: a document, a reference number, a date, a name, an address, an
 * amount. Items must never state legal conclusions, notice periods or
 * deadlines — the panel says "have this ready", never "your deadline is…".
 *
 * `title` is the recognisable head of the landing h1 so a user arriving from a
 * hub card sees the name they clicked.
 */
export interface TemplateIntake {
  title: string;
  prepare: string[];
}
