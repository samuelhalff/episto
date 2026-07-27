import type { TemplateIntake } from "./types";

/** French intake copy. See ./types for the authoring rules. */
export const FR_TEMPLATE_INTAKE: Record<string, TemplateIntake> = {
  "wohnung-kuendigen": {
    title: "Résilier son bail",
    prepare: [
      "Le contrat de bail",
      "L’adresse complète du bailleur",
      "La date de fin de bail souhaitée",
      "Les noms de toutes les personnes ayant signé le bail",
    ],
  },
  "krankenkasse-kuendigen": {
    title: "Résilier sa caisse-maladie",
    prepare: [
      "La police d’assurance de base",
      "Le numéro d’assuré",
      "L’adresse complète de la caisse-maladie",
      "La date de fin d’assurance souhaitée",
    ],
  },
  "abo-kuendigen": {
    title: "Résilier un abonnement",
    prepare: [
      "Le contrat d’abonnement ou la confirmation de commande",
      "Le numéro de client, de contrat ou de membre",
      "L’adresse complète du prestataire",
      "La désignation de l’abonnement et la date de fin souhaitée",
    ],
  },
  "arbeitsvertrag-kuendigen": {
    title: "Résilier son contrat de travail",
    prepare: [
      "Le contrat de travail et les éventuels règlements du personnel",
      "L’éventuelle convention collective de travail",
      "L’adresse complète de l’employeur",
      "La date de fin souhaitée des rapports de travail",
    ],
  },
  "versicherung-kuendigen": {
    title: "Résilier une assurance",
    prepare: [
      "La police et les conditions d’assurance",
      "Le numéro de police ou de contrat",
      "L’adresse complète de la compagnie d’assurance",
      "Le type d’assurance et la date de fin souhaitée",
    ],
  },
  "handyabo-kuendigen": {
    title: "Résilier son abonnement mobile",
    prepare: [
      "Le contrat d’abonnement ou la dernière facture",
      "Le numéro de client et de contrat",
      "Le numéro de mobile ou de ligne fixe concerné",
      "L’adresse complète de l’opérateur télécom",
      "La date de fin souhaitée et si vous voulez conserver votre numéro",
    ],
  },
  "fitnessabo-kuendigen": {
    title: "Résilier son abonnement fitness",
    prepare: [
      "Le contrat d’adhésion et les conditions générales",
      "Le numéro de membre ou de contrat",
      "L’adresse complète du centre de fitness",
      "La date de fin souhaitée",
      "Un éventuel certificat médical ou autre justificatif du motif de résiliation",
    ],
  },
  "beschwerde-schreiben": {
    title: "Rédiger une réclamation",
    prepare: [
      "Le contrat, la facture ou la confirmation de commande concernée",
      "Le numéro de client, de commande ou de facture",
      "L’adresse complète du destinataire",
      "Les dates et montants pertinents",
      "Les justificatifs tels que photos, quittances ou échanges antérieurs",
    ],
  },
  "mahnung-schreiben": {
    title: "Rédiger un rappel de paiement",
    prepare: [
      "La facture impayée",
      "Le numéro et la date de la facture",
      "L’adresse complète de la personne ou de l’entreprise débitrice",
      "Le montant dû et l’échéance initiale",
      "L’IBAN ou les autres coordonnées de paiement",
    ],
  },
  "einsprache-erheben": {
    title: "Faire opposition",
    prepare: [
      "La décision contestée avec l’indication des voies de droit",
      "Le numéro de dossier et l’autorité de recours compétente",
      "La date de notification de la décision",
      "Le montant ou la prestation sur lequel porte la décision",
      "Les justificatifs à l’appui des motifs invoqués",
    ],
  },
  "mietzins-senken": {
    title: "Baisser son loyer",
    prepare: [
      "Le contrat de bail",
      "La dernière notification d’adaptation du loyer",
      "Le loyer net actuel",
      "Le taux d’intérêt de référence indiqué dans le bail ou la dernière adaptation",
      "L’adresse complète du bailleur",
    ],
  },
  "brief-an-behoerde": {
    title: "Rédiger un courrier aux autorités",
    prepare: [
      "Le dernier courrier ou formulaire de l’autorité",
      "L’adresse complète du service compétent",
      "Le numéro de dossier, d’affaire ou de référence",
      "Les dates pertinentes et les justificatifs demandés",
    ],
  },
  "nebenkostenabrechnung-pruefen": {
    title: "Vérifier le décompte de charges",
    prepare: [
      "Le contrat de bail",
      "Le décompte de charges actuel",
      "Les preuves des acomptes versés",
      "Les postes et montants contestés",
      "L’éventuel décompte de la période précédente",
    ],
  },
  "rechtsvorschlag-erheben": {
    title: "Former opposition à un commandement de payer",
    prepare: [
      "Le commandement de payer",
      "Le numéro de poursuite et l’office des poursuites compétent",
      "La date de notification du commandement de payer",
      "Le montant que vous contestez – chiffré exactement en cas d’opposition partielle",
    ],
  },
  "mietmangel-melden": {
    title: "Signaler un défaut du logement",
    prepare: [
      "Le contrat de bail",
      "L’adresse complète du bailleur ou de la gérance",
      "La date à laquelle vous avez constaté le défaut pour la première fois",
      "Les photos ou vidéos du défaut",
      "Les éventuels échanges antérieurs concernant le défaut",
    ],
  },
  "arbeitszeugnis-korrigieren": {
    title: "Corriger un certificat de travail",
    prepare: [
      "Le certificat de travail actuel",
      "Le contrat de travail ou le descriptif de poste",
      "Les listes de tâches, évaluations ou autres preuves des prestations",
      "Les passages que vous contestez",
      "L’adresse complète de l’employeur",
    ],
  },
};
