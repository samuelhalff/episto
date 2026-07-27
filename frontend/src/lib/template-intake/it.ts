import type { TemplateIntake } from "./types";

/** Italian intake copy. See ./types for the authoring rules. */
export const IT_TEMPLATE_INTAKE: Record<string, TemplateIntake> = {
  "wohnung-kuendigen": {
    title: "Disdire un appartamento",
    prepare: [
      "Il contratto di locazione",
      "L’indirizzo completo del locatore",
      "La data di fine locazione desiderata",
      "I nomi di tutte le persone che hanno firmato il contratto",
    ],
  },
  "krankenkasse-kuendigen": {
    title: "Disdire la cassa malati",
    prepare: [
      "La polizza dell’assicurazione di base",
      "Il numero di assicurato",
      "L’indirizzo completo della cassa malati",
      "La data di fine assicurazione desiderata",
    ],
  },
  "abo-kuendigen": {
    title: "Disdire un abbonamento",
    prepare: [
      "Il contratto di abbonamento o la conferma d’ordine",
      "Il numero cliente, di contratto o di socio",
      "L’indirizzo completo del fornitore",
      "La denominazione dell’abbonamento e la data di fine desiderata",
    ],
  },
  "arbeitsvertrag-kuendigen": {
    title: "Disdire il contratto di lavoro",
    prepare: [
      "Il contratto di lavoro e gli eventuali regolamenti del personale",
      "L’eventuale contratto collettivo di lavoro",
      "L’indirizzo completo del datore di lavoro",
      "La data di fine desiderata del rapporto di lavoro",
    ],
  },
  "versicherung-kuendigen": {
    title: "Disdire un’assicurazione",
    prepare: [
      "La polizza e le condizioni d’assicurazione",
      "Il numero di polizza o di contratto",
      "L’indirizzo completo della compagnia d’assicurazione",
      "Il tipo d’assicurazione e la data di fine desiderata",
    ],
  },
  "handyabo-kuendigen": {
    title: "Disdire un abbonamento mobile",
    prepare: [
      "Il contratto di abbonamento o l’ultima fattura",
      "Il numero cliente e di contratto",
      "Il numero di telefono mobile o fisso interessato",
      "L’indirizzo completo dell’operatore di telecomunicazioni",
      "La data di fine desiderata e se desidera mantenere il suo numero",
    ],
  },
  "fitnessabo-kuendigen": {
    title: "Disdire un abbonamento fitness",
    prepare: [
      "Il contratto di affiliazione e le condizioni generali",
      "Il numero di socio o di contratto",
      "L’indirizzo completo del centro fitness",
      "La data di fine desiderata",
      "Un eventuale certificato medico o altro giustificativo del motivo di disdetta",
    ],
  },
  "beschwerde-schreiben": {
    title: "Scrivere un reclamo",
    prepare: [
      "Il contratto, la fattura o la conferma d’ordine interessata",
      "Il numero cliente, d’ordine o di fattura",
      "L’indirizzo completo del destinatario",
      "Le date e gli importi pertinenti",
      "I giustificativi quali fotografie, ricevute o corrispondenza precedente",
    ],
  },
  "mahnung-schreiben": {
    title: "Scrivere un sollecito",
    prepare: [
      "La fattura insoluta",
      "Il numero e la data della fattura",
      "L’indirizzo completo della persona o impresa debitrice",
      "L’importo insoluto e la scadenza originaria",
      "L’IBAN o le altre coordinate di pagamento",
    ],
  },
  "einsprache-erheben": {
    title: "Fare opposizione",
    prepare: [
      "La decisione contestata con l’indicazione dei rimedi giuridici",
      "Il numero d’incarto e l’autorità di ricorso competente",
      "La data di notificazione della decisione",
      "La modifica richiesta della decisione",
      "I giustificativi a sostegno dei motivi invocati",
    ],
  },
  "mietzins-senken": {
    title: "Ridurre la pigione",
    prepare: [
      "Il contratto di locazione",
      "L’ultima comunicazione di adeguamento della pigione",
      "La pigione netta attuale",
      "Il tasso d’interesse di riferimento indicato nel contratto o nell’ultimo adeguamento",
      "L’indirizzo completo del locatore",
    ],
  },
  "brief-an-behoerde": {
    title: "Scrivere una lettera alle autorità",
    prepare: [
      "L’ultima comunicazione o il modulo dell’autorità",
      "L’indirizzo completo del servizio competente",
      "Il numero d’incarto, di pratica o di riferimento",
      "Le date pertinenti e i giustificativi richiesti",
    ],
  },
  "nebenkostenabrechnung-pruefen": {
    title: "Verificare il conguaglio spese accessorie",
    prepare: [
      "Il contratto di locazione",
      "Il conguaglio spese accessorie attuale",
      "Le prove degli acconti versati",
      "Le voci e gli importi contestati",
      "L’eventuale conteggio del periodo precedente",
    ],
  },
  "rechtsvorschlag-erheben": {
    title: "Interporre opposizione a un precetto esecutivo",
    prepare: [
      "Il precetto esecutivo",
      "Il numero d’esecuzione e l’ufficio d’esecuzione competente",
      "La data di notificazione del precetto esecutivo",
      "L’importo contestato – in caso di opposizione parziale, anche l’importo riconosciuto",
    ],
  },
  "mietmangel-melden": {
    title: "Segnalare un difetto dell’abitazione",
    prepare: [
      "Il contratto di locazione",
      "L’indirizzo completo del locatore o dell’amministrazione",
      "La data in cui ha constatato il difetto per la prima volta",
      "Le fotografie o i video del difetto",
      "L’eventuale corrispondenza precedente relativa al difetto",
    ],
  },
  "arbeitszeugnis-korrigieren": {
    title: "Correggere il certificato di lavoro",
    prepare: [
      "Il certificato di lavoro attuale",
      "Il contratto di lavoro o la descrizione della funzione",
      "Gli elenchi dei compiti, le valutazioni o altre prove delle prestazioni",
      "I passaggi contestati e la formulazione desiderata",
      "L’indirizzo completo del datore di lavoro",
    ],
  },
};
