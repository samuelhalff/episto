import type { LandingLocale } from "./landing-routes";

/**
 * First-person intake starters per drafting template, used to seed the draft
 * when a user arrives from a template CTA (?template=<slug>). Explicit strings
 * (not derived from the SEO h1) so the composer opens with a natural request
 * the assistant can act on. Only draft-template slugs appear here; service
 * guides never seed. Keyed by locale for the three landing locales.
 */
export const DRAFT_STARTERS: Record<string, Record<LandingLocale, string>> = {
  "wohnung-kuendigen": {
    "de-CH": "Ich möchte den Mietvertrag für meine Wohnung kündigen.",
    "fr-CH": "Je souhaite résilier le bail de mon appartement.",
    "it-CH": "Desidero disdire il contratto di locazione del mio appartamento.",
  },
  "krankenkasse-kuendigen": {
    "de-CH": "Ich möchte meine Krankenkasse (Grundversicherung) kündigen.",
    "fr-CH": "Je souhaite résilier mon assurance maladie de base.",
    "it-CH": "Desidero disdire la mia cassa malati (assicurazione di base).",
  },
  "abo-kuendigen": {
    "de-CH": "Ich möchte ein Abo kündigen.",
    "fr-CH": "Je souhaite résilier un abonnement.",
    "it-CH": "Desidero disdire un abbonamento.",
  },
  "arbeitsvertrag-kuendigen": {
    "de-CH": "Ich möchte meinen Arbeitsvertrag kündigen.",
    "fr-CH": "Je souhaite résilier mon contrat de travail.",
    "it-CH": "Desidero disdire il mio contratto di lavoro.",
  },
  "versicherung-kuendigen": {
    "de-CH": "Ich möchte eine Versicherung kündigen.",
    "fr-CH": "Je souhaite résilier une assurance.",
    "it-CH": "Desidero disdire un'assicurazione.",
  },
  "handyabo-kuendigen": {
    "de-CH": "Ich möchte mein Handy-Abo kündigen.",
    "fr-CH": "Je souhaite résilier mon abonnement de téléphonie mobile.",
    "it-CH": "Desidero disdire il mio abbonamento di telefonia mobile.",
  },
  "fitnessabo-kuendigen": {
    "de-CH": "Ich möchte mein Fitness-Abo kündigen.",
    "fr-CH": "Je souhaite résilier mon abonnement de fitness.",
    "it-CH": "Desidero disdire il mio abbonamento in palestra.",
  },
  "beschwerde-schreiben": {
    "de-CH": "Ich möchte eine Beschwerde schreiben.",
    "fr-CH": "Je souhaite écrire une réclamation.",
    "it-CH": "Desidero scrivere un reclamo.",
  },
  "mahnung-schreiben": {
    "de-CH": "Ich möchte eine Mahnung für eine unbezahlte Rechnung schreiben.",
    "fr-CH": "Je souhaite envoyer un rappel pour une facture impayée.",
    "it-CH": "Desidero inviare un sollecito per una fattura non pagata.",
  },
  "einsprache-erheben": {
    "de-CH": "Ich möchte gegen einen Entscheid Einsprache erheben.",
    "fr-CH": "Je souhaite faire opposition à une décision.",
    "it-CH": "Desidero presentare opposizione a una decisione.",
  },
  "mietzins-senken": {
    "de-CH": "Ich möchte eine Mietzinssenkung verlangen.",
    "fr-CH": "Je souhaite demander une baisse de loyer.",
    "it-CH": "Desidero chiedere una riduzione della pigione.",
  },
  "brief-an-behoerde": {
    "de-CH": "Ich möchte einen Brief an eine Behörde schreiben.",
    "fr-CH": "Je souhaite écrire une lettre à une autorité.",
    "it-CH": "Desidero scrivere una lettera a un'autorità.",
  },
  "nebenkostenabrechnung-pruefen": {
    "de-CH": "Ich möchte meine Nebenkostenabrechnung anfechten.",
    "fr-CH": "Je souhaite contester mon décompte de charges.",
    "it-CH": "Desidero contestare il mio conteggio delle spese accessorie.",
  },
  "rechtsvorschlag-erheben": {
    "de-CH": "Ich möchte gegen einen Zahlungsbefehl Rechtsvorschlag erheben.",
    "fr-CH": "Je souhaite former opposition à un commandement de payer.",
    "it-CH": "Desidero interporre opposizione a un precetto esecutivo.",
  },
  "mietmangel-melden": {
    "de-CH": "Ich möchte meiner Vermieterschaft einen Mangel in der Wohnung melden.",
    "fr-CH": "Je souhaite signaler un défaut de mon logement au bailleur.",
    "it-CH": "Desidero segnalare al locatore un difetto dell’abitazione.",
  },
  "arbeitszeugnis-korrigieren": {
    "de-CH": "Ich möchte die Korrektur meines Arbeitszeugnisses verlangen.",
    "fr-CH": "Je souhaite demander la correction de mon certificat de travail.",
    "it-CH": "Desidero chiedere la correzione del mio certificato di lavoro.",
  },
};

export function getDraftStarter(slug: string, locale: string): string | null {
  return DRAFT_STARTERS[slug]?.[locale as LandingLocale] ?? null;
}
