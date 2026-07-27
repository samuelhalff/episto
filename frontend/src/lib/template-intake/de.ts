import type { TemplateIntake } from "./types";

/** German intake copy. See ./types for the authoring rules. */
export const DE_TEMPLATE_INTAKE: Record<string, TemplateIntake> = {
  "wohnung-kuendigen": {
    title: "Wohnung kündigen",
    prepare: [
      "Der Mietvertrag",
      "Die vollständige Adresse der Vermieterschaft",
      "Das gewünschte Ende des Mietverhältnisses",
      "Die Namen aller Personen, die den Mietvertrag unterzeichnet haben",
    ],
  },
  "krankenkasse-kuendigen": {
    title: "Krankenkasse kündigen",
    prepare: [
      "Die Police der Grundversicherung",
      "Die Versichertennummer",
      "Die vollständige Adresse der Krankenkasse",
      "Das gewünschte Ende der Versicherung",
    ],
  },
  "abo-kuendigen": {
    title: "Abo kündigen",
    prepare: [
      "Der Abonnementsvertrag oder die Bestellbestätigung",
      "Die Kunden-, Vertrags- oder Mitgliedsnummer",
      "Die vollständige Adresse des Anbieters",
      "Die Abo-Bezeichnung und das gewünschte Vertragsende",
    ],
  },
  "arbeitsvertrag-kuendigen": {
    title: "Arbeitsvertrag kündigen",
    prepare: [
      "Der Arbeitsvertrag und allfällige Personalreglemente",
      "Ein allfälliger Gesamtarbeitsvertrag",
      "Die vollständige Adresse der Arbeitgeberschaft",
      "Das gewünschte Ende des Arbeitsverhältnisses",
    ],
  },
  "versicherung-kuendigen": {
    title: "Versicherung kündigen",
    prepare: [
      "Die Versicherungspolice und die Versicherungsbedingungen",
      "Die Policen- oder Vertragsnummer",
      "Die vollständige Adresse der Versicherungsgesellschaft",
      "Die Versicherungsart und das gewünschte Vertragsende",
    ],
  },
  "handyabo-kuendigen": {
    title: "Handyabo kündigen",
    prepare: [
      "Der Abonnementsvertrag oder die letzte Rechnung",
      "Die Kunden- und Vertragsnummer",
      "Die betroffene Mobil- oder Festnetznummer",
      "Die vollständige Adresse des Telekom-Anbieters",
      "Das gewünschte Vertragsende und ob Sie die Rufnummer mitnehmen möchten",
    ],
  },
  "fitnessabo-kuendigen": {
    title: "Fitnessabo kündigen",
    prepare: [
      "Der Mitgliedschaftsvertrag und die AGB",
      "Die Mitglieds- oder Vertragsnummer",
      "Die vollständige Adresse des Fitnesscenters",
      "Das gewünschte Vertragsende",
      "Ein allfälliges Arztzeugnis oder ein anderer Nachweis des Kündigungsgrunds",
    ],
  },
  "beschwerde-schreiben": {
    title: "Beschwerde schreiben",
    prepare: [
      "Der betroffene Vertrag, die Rechnung oder die Bestellbestätigung",
      "Die Kunden-, Bestell- oder Rechnungsnummer",
      "Die vollständige Adresse des Empfängers",
      "Die relevanten Daten und Beträge",
      "Belege wie Fotos, Quittungen oder bisherige Korrespondenz",
    ],
  },
  "mahnung-schreiben": {
    title: "Mahnung schreiben",
    prepare: [
      "Die unbezahlte Rechnung",
      "Die Rechnungsnummer und das Rechnungsdatum",
      "Die vollständige Adresse der zahlungspflichtigen Person oder Firma",
      "Der offene Betrag und die ursprüngliche Fälligkeit",
      "Die IBAN oder andere Zahlungsangaben",
    ],
  },
  "einsprache-erheben": {
    title: "Einsprache erheben",
    prepare: [
      "Der angefochtene Entscheid mit Rechtsmittelbelehrung",
      "Das Aktenzeichen und die zuständige Rechtsmittelstelle",
      "Das Zustelldatum des Entscheids",
      "Die verlangte Änderung des Entscheids",
      "Belege für die vorgebrachten Gründe",
    ],
  },
  "mietzins-senken": {
    title: "Mietzins senken",
    prepare: [
      "Der Mietvertrag",
      "Die letzte Mitteilung zur Mietzinsanpassung",
      "Der aktuelle Nettomietzins",
      "Der Referenzzinssatz, der im Vertrag oder in der letzten Anpassung genannt ist",
      "Die vollständige Adresse der Vermieterschaft",
    ],
  },
  "brief-an-behoerde": {
    title: "Brief an Behörde schreiben",
    prepare: [
      "Das letzte Schreiben oder Formular der Behörde",
      "Die vollständige Adresse der zuständigen Amtsstelle",
      "Die Akten-, Dossier- oder Referenznummer",
      "Die relevanten Daten und die verlangten Nachweise",
    ],
  },
  "nebenkostenabrechnung-pruefen": {
    title: "Nebenkostenabrechnung prüfen",
    prepare: [
      "Der Mietvertrag",
      "Die aktuelle Nebenkostenabrechnung",
      "Nachweise über geleistete Akontozahlungen",
      "Die beanstandeten Positionen und Beträge",
      "Eine allfällige Abrechnung der Vorperiode",
    ],
  },
  "rechtsvorschlag-erheben": {
    title: "Rechtsvorschlag erheben",
    prepare: [
      "Der Zahlungsbefehl",
      "Die Betreibungsnummer und das zuständige Betreibungsamt",
      "Das Zustelldatum des Zahlungsbefehls",
      "Der bestrittene Betrag – bei teilweiser Bestreitung auch der anerkannte Betrag",
    ],
  },
  "mietmangel-melden": {
    title: "Mietmangel melden",
    prepare: [
      "Der Mietvertrag",
      "Die vollständige Adresse der Vermieterschaft oder Verwaltung",
      "Das Datum, an dem Sie den Mangel erstmals festgestellt haben",
      "Fotos oder Videos des Mangels",
      "Eine allfällige frühere Korrespondenz zum Mangel",
    ],
  },
  "arbeitszeugnis-korrigieren": {
    title: "Arbeitszeugnis korrigieren",
    prepare: [
      "Das aktuelle Arbeitszeugnis",
      "Der Arbeitsvertrag oder die Stellenbeschreibung",
      "Aufgabenlisten, Beurteilungen oder andere Leistungsnachweise",
      "Die beanstandeten Passagen und die gewünschte Formulierung",
      "Die vollständige Adresse der Arbeitgeberschaft",
    ],
  },
};
