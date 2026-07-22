/**
 * Lead-generation landing pages, keyed by locale.
 *
 * Content lives in per-locale modules (landing/de.ts, fr.ts, it.ts); this
 * barrel exposes the lookup helpers plus the localized UI chrome. Slugs are
 * shared across locales so hreflang alternates map 1:1. en-CH is not part of
 * the initiative.
 */
import { DE_LANDING_PAGES } from "./landing/de";
import { FR_LANDING_PAGES } from "./landing/fr";
import { IT_LANDING_PAGES } from "./landing/it";
import type { LandingPage } from "./landing/types";

export type { LandingPage, LandingStep, LandingFaq, LandingNote } from "./landing/types";

export const LANDING_LOCALES = ["de-CH", "fr-CH", "it-CH"] as const;
export type LandingLocale = (typeof LANDING_LOCALES)[number];

const LANDING_CONTENT: Record<LandingLocale, LandingPage[]> = {
  "de-CH": DE_LANDING_PAGES,
  "fr-CH": FR_LANDING_PAGES,
  "it-CH": IT_LANDING_PAGES,
};

// Slugs are identical across locales (the German set is the source of truth).
export const LANDING_SLUGS = DE_LANDING_PAGES.map((page) => page.slug);

export function isLandingLocale(locale: string): locale is LandingLocale {
  return (LANDING_LOCALES as readonly string[]).includes(locale);
}

export function getLandingPages(locale: LandingLocale): LandingPage[] {
  return LANDING_CONTENT[locale];
}

export function getLandingPage(locale: string, slug: string): LandingPage | undefined {
  if (!isLandingLocale(locale)) return undefined;
  return LANDING_CONTENT[locale].find((page) => page.slug === slug);
}

// Localized UI chrome for the landing template + hub.
export interface LandingUi {
  breadcrumbHome: string;
  breadcrumbHub: string;
  quickAnswerLabel: string;
  ctaLabel: string;
  stepsEyebrow: string;
  stepsTitle: string;
  checklistEyebrow: string;
  checklistTitle: string;
  notesEyebrow: string;
  notesTitle: string;
  faqTitle: string;
  relatedEyebrow: string;
  relatedTitle: string;
  disclaimer: string;
  ctaBandTitle: string;
  ctaBandBody: string;
  hubEyebrow: string;
  hubTitle: string;
  hubIntro: string;
  hubMetaTitle: string;
  hubMetaDescription: string;
}

export const LANDING_UI: Record<LandingLocale, LandingUi> = {
  "de-CH": {
    breadcrumbHome: "Start",
    breadcrumbHub: "Vorlagen",
    quickAnswerLabel: "Kurz erklärt",
    ctaLabel: "Brief verfassen",
    stepsEyebrow: "So funktioniert es",
    stepsTitle: "In wenigen Schritten erledigt",
    checklistEyebrow: "Das gehört in den Brief",
    checklistTitle: "Checkliste",
    notesEyebrow: "Wichtig in der Schweiz",
    notesTitle: "Gut zu wissen",
    faqTitle: "Häufige Fragen",
    relatedEyebrow: "Auch hilfreich",
    relatedTitle: "Verwandte Briefe",
    disclaimer:
      "Dieser Text bietet allgemeine Informationen zu einem Anliegen in der Schweiz und ist keine Rechtsberatung. Massgebend sind Ihr Vertrag und die geltenden gesetzlichen Bestimmungen.",
    ctaBandTitle: "Bereit, Ihren Brief zu verfassen?",
    ctaBandBody:
      "Beschreiben Sie Ihr Anliegen – Episto schreibt den Brief und versendet ihn, auf Wunsch als Einschreiben.",
    hubEyebrow: "Vorlagen & Anleitungen",
    hubTitle: "Offizielle Briefe schreiben – mit Schweizer Fristen",
    hubIntro:
      "Anleitungen für die häufigsten Anliegen – von der Kündigung bis zur Einsprache. Beschreiben Sie Ihre Situation, und Episto schreibt den Brief und versendet ihn, auf Wunsch als Einschreiben.",
    hubMetaTitle: "Vorlagen & Anleitungen für offizielle Briefe | Episto",
    hubMetaDescription:
      "Anleitungen für Kündigungen, Beschwerden, Einsprachen und mehr – mit Schweizer Fristen und Formvorschriften. Brief schreiben lassen und versenden mit Episto.",
  },
  "fr-CH": {
    breadcrumbHome: "Accueil",
    breadcrumbHub: "Modèles",
    quickAnswerLabel: "En bref",
    ctaLabel: "Rédiger la lettre",
    stepsEyebrow: "Comment ça marche",
    stepsTitle: "En quelques étapes",
    checklistEyebrow: "À inclure dans la lettre",
    checklistTitle: "Checklist",
    notesEyebrow: "Important en Suisse",
    notesTitle: "Bon à savoir",
    faqTitle: "Questions fréquentes",
    relatedEyebrow: "Également utile",
    relatedTitle: "Lettres similaires",
    disclaimer:
      "Ce texte fournit des informations générales sur une démarche en Suisse et ne constitue pas un conseil juridique. Votre contrat et les dispositions légales en vigueur font foi.",
    ctaBandTitle: "Prêt à rédiger votre lettre ?",
    ctaBandBody:
      "Décrivez votre demande – Episto rédige la lettre et l'envoie, en recommandé si vous le souhaitez.",
    hubEyebrow: "Modèles & guides",
    hubTitle: "Rédiger des lettres officielles – avec les délais suisses",
    hubIntro:
      "Des guides pour les démarches les plus courantes – de la résiliation à l'opposition. Décrivez votre situation et Episto rédige la lettre et l'envoie, en recommandé si vous le souhaitez.",
    hubMetaTitle: "Modèles & guides pour lettres officielles | Episto",
    hubMetaDescription:
      "Guides pour résiliations, réclamations, oppositions et plus – avec les délais et formes suisses. Faites rédiger et envoyer votre lettre avec Episto.",
  },
  "it-CH": {
    breadcrumbHome: "Home",
    breadcrumbHub: "Modelli",
    quickAnswerLabel: "In breve",
    ctaLabel: "Scrivere la lettera",
    stepsEyebrow: "Come funziona",
    stepsTitle: "In pochi passi",
    checklistEyebrow: "Cosa mettere nella lettera",
    checklistTitle: "Checklist",
    notesEyebrow: "Importante in Svizzera",
    notesTitle: "Da sapere",
    faqTitle: "Domande frequenti",
    relatedEyebrow: "Utile anche",
    relatedTitle: "Lettere correlate",
    disclaimer:
      "Questo testo offre informazioni generali su una pratica in Svizzera e non costituisce una consulenza legale. Fanno fede il Suo contratto e le disposizioni di legge vigenti.",
    ctaBandTitle: "Pronto a scrivere la Sua lettera?",
    ctaBandBody:
      "Descriva la Sua richiesta – Episto scrive la lettera e la invia, se desidera come raccomandata.",
    hubEyebrow: "Modelli e guide",
    hubTitle: "Scrivere lettere ufficiali – con i termini svizzeri",
    hubIntro:
      "Guide per le pratiche più frequenti – dalla disdetta all'opposizione. Descriva la Sua situazione ed Episto scrive la lettera e la invia, se desidera come raccomandata.",
    hubMetaTitle: "Modelli e guide per lettere ufficiali | Episto",
    hubMetaDescription:
      "Guide per disdette, reclami, opposizioni e altro – con termini e forme svizzere. Faccia scrivere e inviare la Sua lettera con Episto.",
  },
};
