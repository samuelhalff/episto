import type { LandingPage } from "./types";

export const IT_LANDING_PAGES: LandingPage[] = [
  {
    slug: "wohnung-kuendigen",
    category: "Disdetta",
    metaTitle: "Disdire un appartamento – lettera e invio",
    metaDescription:
      "Disdire correttamente il contratto di locazione in Svizzera: termine, scadenza e forma. episto redige la disdetta e La invia – anche come raccomandata.",
    h1: "Disdire un appartamento: terminare il contratto di locazione correttamente e nei termini",
    quickAnswer:
      "Per disdire il Suo appartamento in Svizzera, invii al locatore una disdetta scritta che pervenga al più tardi l'ultimo giorno prima dell'inizio del termine. Per i contratti di locazione a tempo indeterminato vale di regola un termine di tre mesi sulla scadenza usuale della località. Un invio raccomandato funge da prova.",
    steps: [
      {
        title: "Verificare il termine e la scadenza",
        text: "Consulti il contratto di locazione per il termine di disdetta e le scadenze ammesse. In assenza di indicazioni, vale il minimo legale di tre mesi su una scadenza usuale della località.",
      },
      {
        title: "Raccogliere i dati necessari",
        text: "Annoti l'indirizzo dell'immobile locato, la data di fine desiderata e i nomi di tutte le persone che hanno firmato il contratto.",
      },
      {
        title: "Redigere la disdetta",
        text: "Formuli una lettera chiara con oggetto, data di disdetta e firma. episto La aiuta a creare una lettera precisa in pochi minuti.",
      },
      {
        title: "Inviare con prova di ricezione",
        text: "Invii la disdetta come raccomandata per poter comprovare il ricevimento entro i termini. episto trasmette la lettera alla Posta Svizzera, che la stampa e la spedisce.",
      },
    ],
    checklist: [
      "Indirizzo completo del locatore e dell'immobile locato",
      "Data di disdetta univoca (data di fine del rapporto di locazione)",
      "Riferimento al contratto di locazione",
      "Firma di tutte le parti contraenti",
      "Richiesta di conferma scritta",
    ],
    notes: [
      {
        title: "Abitazione familiare: entrambi i partner devono firmare",
        body: "Per un'abitazione familiare utilizzata in comune, entrambi i coniugi o partner registrati devono firmare la disdetta – anche se solo una persona figura nel contratto.",
      },
      {
        title: "Fa stato il ricevimento entro i termini",
        body: "Determinante non è la data della lettera, bensì il momento in cui la disdetta perviene al locatore. Consideri i tempi postali e invii con sufficiente anticipo.",
      },
    ],
    faqs: [
      {
        question: "Qual è il termine di disdetta per un appartamento?",
        answer:
          "Per i contratti di locazione a tempo indeterminato, il termine minimo legale è di tre mesi sulla scadenza usuale della località. Il contratto di locazione può prevedere termini più lunghi – l'indicazione contrattuale prevale.",
      },
      {
        question: "Devo inviare la disdetta per raccomandata?",
        answer:
          "La legge non prescrive una modalità di invio specifica. Tuttavia, l'invio raccomandato è fortemente consigliato perché consente di comprovare il ricevimento entro i termini.",
      },
      {
        question: "Posso recedere anticipatamente dal contratto di locazione?",
        answer:
          "Sì. Può disdire fuori termine se propone un subentrante idoneo, disposto e solvibile, che riprenda il contratto alle condizioni esistenti.",
      },
      {
        question: "Quanto costa l'invio con episto?",
        answer:
          "Il prezzo esatto è visibile prima del pagamento. È composto dall'affrancatura e da una tariffa di servizio trasparente; un invio raccomandato costa leggermente più di una lettera standard.",
      },
    ],
    related: ["abo-kuendigen", "einschreiben-online", "mietzins-senken"],
  },
  {
    slug: "einschreiben-online",
    category: "Invio",
    metaTitle: "Spedire una raccomandata online – senza posta",
    metaDescription:
      "Scrivere e inviare una raccomandata online, senza ufficio postale. episto trasmette la Sua lettera alla Posta Svizzera, che la stampa e la recapita – con prova.",
    h1: "Spedire una raccomandata online – senza recarsi all'ufficio postale",
    quickAnswer:
      "Spedire una raccomandata online significa: scrivere la lettera in formato digitale, che viene poi stampata e consegnata alla Posta come invio raccomandato. In questo modo si ottiene una prova di recapito senza doversi recare personalmente all'ufficio postale. Con episto è tutto fatto in pochi minuti.",
    steps: [
      {
        title: "Creare la lettera in digitale",
        text: "Descriva la Sua richiesta. episto La aiuta a formulare una lettera formale chiara, che Lei potrà verificare e adattare.",
      },
      {
        title: "Scegliere l'invio raccomandato",
        text: "Selezioni l'opzione «Raccomandata» al momento della spedizione. Il totale esatto è visibile prima del pagamento.",
      },
      {
        title: "Stampa e consegna",
        text: "episto trasmette la lettera alla Posta Svizzera, che la stampa e la recapita come invio raccomandato.",
      },
      {
        title: "Tracciare il recapito",
        text: "Una raccomandata include una prova dell'impostazione e del recapito, consentendoLe di comprovare l'invio.",
      },
    ],
    checklist: [
      "Indirizzo completo del destinatario in Svizzera",
      "Oggetto e richiesta chiari",
      "Data e firma",
      "Eventuali allegati in PDF",
      "Selezione «Raccomandata» al momento dell'invio",
    ],
    notes: [
      {
        title: "Quando vale la pena inviare una raccomandata",
        body: "Una raccomandata è consigliabile ogni volta che è in corso un termine o il ricevimento è importante – ad esempio per disdette, opposizioni o solleciti.",
      },
      {
        title: "Solo per indirizzi svizzeri",
        body: "episto spedisce lettere a indirizzi di destinatari in Svizzera. Verifichi l'indirizzo prima dell'invio.",
      },
    ],
    faqs: [
      {
        question: "Posso spedire una raccomandata senza andare alla posta?",
        answer:
          "Sì. Lei scrive la lettera online ed episto la trasmette alla Posta Svizzera, che la stampa e la recapita come raccomandata. Non è necessario recarsi all'ufficio postale.",
      },
      {
        question: "Ricevo una prova di recapito?",
        answer:
          "Sì. Una raccomandata comprende una prova dell'impostazione e del recapito, che Lei può conservare per sicurezza.",
      },
      {
        question: "Ho bisogno di un account?",
        answer:
          "No. Può iniziare come ospite, verificare la lettera e pagare solo al momento dell'invio.",
      },
      {
        question: "Quanto costa una raccomandata?",
        answer:
          "Il prezzo è composto dall'affrancatura per raccomandata e da una tariffa di servizio trasparente. Il totale esatto è visibile prima del pagamento.",
      },
    ],
    related: ["wohnung-kuendigen", "brief-online-versenden", "beschwerde-schreiben"],
  },
  {
    slug: "krankenkasse-kuendigen",
    category: "Disdetta",
    metaTitle: "Disdire e cambiare cassa malati – lettera e termine",
    metaDescription:
      "Disdire l'assicurazione di base entro il 30 novembre e cambiare cassa. episto redige e invia per posta la Sua disdetta – se desiderato come raccomandata.",
    h1: "Disdire e cambiare la cassa malati – entro i termini per fine anno",
    quickAnswer:
      "Per disdire la Sua assicurazione di base, invii alla cassa malati una disdetta scritta che pervenga entro il 30 novembre; l'assicurazione termina al 31 dicembre. Si iscriva contemporaneamente presso una nuova assicurazione di base – vige l'obbligo di ammissione. Una raccomandata garantisce la prova.",
    steps: [
      {
        title: "Scegliere contemporaneamente la nuova cassa",
        text: "Si iscriva presso una nuova assicurazione di base contestualmente alla disdetta. Qui vige l'obbligo di ammissione – ogni cassa deve accettarLa. Non attenda una conferma prima di disdire.",
      },
      {
        title: "Redigere la disdetta",
        text: "Scriva una disdetta con il numero di assicurato, il nome e la data di fine desiderata (31 dicembre). episto crea la lettera in pochi minuti.",
      },
      {
        title: "Inviare per tempo",
        text: "La disdetta deve pervenire alla cassa entro la fine di novembre. Invii con sufficiente anticipo – idealmente come raccomandata.",
      },
      {
        title: "Conservare la conferma",
        text: "Conservi la conferma di invio e la conferma di disdetta della cassa.",
      },
    ],
    checklist: [
      "Numero di assicurato e data di nascita",
      "Nome completo e indirizzo",
      "Data di fine desiderata (31 dicembre)",
      "Riferimento all'assicurazione di base",
      "Firma",
    ],
    notes: [
      {
        title: "Termine: 30 novembre",
        body: "La disdetta dell'assicurazione di base deve pervenire alla cassa malati entro il 30 novembre. Determinante è il ricevimento, non il timbro postale – invii pertanto con sufficiente anticipo, idealmente entro metà novembre.",
      },
      {
        title: "Iscriversi contemporaneamente – non attendere la conferma",
        body: "Disdica entro i termini e si iscriva contemporaneamente presso la nuova cassa. Non attenda una conferma, altrimenti rischia di superare il termine. La vecchia assicurazione termina non appena è notificata la copertura ininterrotta da parte della nuova assicurazione di base.",
      },
    ],
    faqs: [
      {
        question: "Entro quando devo disdire la cassa malati?",
        answer:
          "La disdetta deve pervenire alla cassa entro il 30 novembre; l'assicurazione termina al 31 dicembre. Determinante è il ricevimento, non il timbro postale. Si iscriva contemporaneamente presso la nuova cassa.",
      },
      {
        question: "Devo disdire per raccomandata?",
        answer:
          "La raccomandata non è obbligatoria, ma è consigliata. A causa del termine ristretto di fine novembre, la prova di ricezione è particolarmente importante.",
      },
      {
        question: "Posso cambiare durante l'anno?",
        answer:
          "Il cambio dell'assicurazione di base è di regola possibile a fine anno. A determinate condizioni, ad esempio in caso di aumento del premio, esistono ulteriori possibilità di disdetta.",
      },
      {
        question: "episto scrive la disdetta per me?",
        answer:
          "Sì. Lei inserisce i Suoi dati, episto formula la disdetta e La invia – se desiderato come raccomandata con prova di recapito.",
      },
    ],
    related: ["versicherung-kuendigen", "abo-kuendigen", "einschreiben-online"],
  },
  {
    slug: "abo-kuendigen",
    category: "Disdetta",
    metaTitle: "Disdire un abbonamento – modello e invio",
    metaDescription:
      "Disdire un abbonamento streaming, a una rivista o associazione: verificare termine, durata e prova. episto redige e invia la disdetta in modo sicuro.",
    h1: "Disdire un abbonamento: terminare il contratto per tempo e con prova",
    quickAnswer:
      "Per disdire un abbonamento, verifichi innanzitutto durata, termine di disdetta e forma richiesta nel contratto o nelle CGC. Indichi il numero cliente e la data di fine desiderata e chieda una conferma. In Svizzera non esiste un diritto generale di revoca per i contratti conclusi online. episto formula la Sua disdetta e La invia per Lei.",
    steps: [
      {
        title: "Verificare contratto e CGC",
        text: "Cerchi durata minima, termine di disdetta, scadenza di disdetta e forma ammessa nella Sua conferma o nelle CGC vigenti.",
      },
      {
        title: "Raccogliere i dati contrattuali",
        text: "Tenga a portata di mano l'indirizzo del fornitore, il numero cliente o di socio, il nome del prodotto e la data di fine contratto desiderata.",
      },
      {
        title: "Formulare la disdetta in modo chiaro",
        text: "Disdica sul prossimo termine utile e chieda una conferma scritta. episto La aiuta a creare una lettera precisa.",
      },
      {
        title: "Inviare entro i termini",
        text: "Invii la disdetta per tempo e, per abbonamenti importanti o costosi, con prova di ricezione. episto trasmette la lettera alla Posta, che la stampa e la spedisce.",
      },
    ],
    checklist: [
      "Nome completo e indirizzo",
      "Fornitore e indirizzo del destinatario",
      "Numero cliente, contratto o socio",
      "Descrizione dell'abbonamento e termine di disdetta desiderato",
      "Richiesta di conferma scritta della disdetta",
    ],
    notes: [
      {
        title: "Contratto e CGC sono determinanti",
        body: "Per abbonamenti streaming, a riviste e ad associazioni valgono spesso durate e modalità di disdetta diverse. Verifichi anche se il contratto si rinnova automaticamente.",
      },
      {
        title: "Nessun diritto generale di revoca per acquisti online",
        body: "Il diritto svizzero non prevede un diritto generale di revoca per gli acquisti online. Un fornitore può concederlo volontariamente nelle proprie CGC.",
      },
    ],
    faqs: [
      {
        question: "Come posso disdire il mio abbonamento?",
        answer:
          "Verifichi termine e forma nel contratto, indichi i Suoi dati contrattuali e disdica in modo univoco sul prossimo termine utile. Si faccia confermare per iscritto la fine del contratto.",
      },
      {
        question: "Posso revocare un abbonamento concluso online?",
        answer:
          "In Svizzera non esiste un diritto generale di revoca per i contratti conclusi online. Determinante è se il fornitore concede volontariamente un diritto di recesso o un periodo di prova nelle CGC.",
      },
      {
        question: "Cosa succede se supero il termine di disdetta?",
        answer:
          "A seconda del contratto, l'abbonamento prosegue o si rinnova. Disdica comunque immediatamente sul prossimo termine utile e chieda eventualmente al fornitore uno scioglimento anticipato a titolo di cortesia.",
      },
      {
        question: "Devo disdire un abbonamento per raccomandata?",
        answer:
          "La raccomandata spesso non è richiesta, ma può essere utile in caso di costi elevati, termini ristretti o conferme poco chiare, poiché consente di comprovare l'invio.",
      },
    ],
    related: ["handyabo-kuendigen", "fitnessabo-kuendigen", "einschreiben-online"],
  },
  {
    slug: "arbeitsvertrag-kuendigen",
    category: "Disdetta",
    metaTitle: "Disdire un contratto di lavoro – lettera e invio",
    metaDescription:
      "Disdire correttamente il contratto di lavoro in Svizzera: termine, data di fine e notifica. episto formula e invia la Sua disdetta – anche come raccomandata.",
    h1: "Disdire il contratto di lavoro: procedere in modo corretto e professionale",
    quickAnswer:
      "Per disdire il Suo contratto di lavoro, verifichi il contratto e l'eventuale contratto collettivo di lavoro per quanto riguarda termine e scadenza di disdetta. La disdetta deve pervenire per tempo al datore di lavoro; per iscritto è generalmente consigliabile per motivi di prova. Indichi la data di fine e chieda conferma e certificato di lavoro. episto formula e invia la Sua disdetta.",
    steps: [
      {
        title: "Verificare le regole di disdetta",
        text: "Legga il contratto di lavoro, il regolamento del personale e l'eventuale contratto collettivo di lavoro. Determinanti sono il termine di disdetta, la scadenza ammessa e un'eventuale forma scritta concordata.",
      },
      {
        title: "Determinare l'ultimo giorno di lavoro",
        text: "Calcoli la fine del contratto e consideri quando la disdetta deve pervenire al datore di lavoro. Chiarisca separatamente ferie e ore straordinarie.",
      },
      {
        title: "Redigere la disdetta",
        text: "Formuli in modo breve, univoco e professionale. In caso di dimissioni ordinarie, una motivazione non è di regola necessaria.",
      },
      {
        title: "Documentare la ricezione",
        text: "Consegni la lettera contro ricevuta o la invii con prova di ricezione. episto si occupa su richiesta dell'invio come raccomandata.",
      },
    ],
    checklist: [
      "Nome e indirizzo del lavoratore e del datore di lavoro",
      "Data e chiara frase di disdetta",
      "Data di fine desiderata del rapporto di lavoro",
      "Richiesta di conferma della disdetta e di certificato di lavoro",
      "Firma autografa se è richiesta la forma scritta",
    ],
    notes: [
      {
        title: "Fa stato la ricezione tempestiva",
        body: "La disdetta dovrebbe pervenire al datore di lavoro prima dell'inizio del termine di disdetta. La data di spedizione da sola non è di regola sufficiente come prova del termine.",
      },
      {
        title: "Contratto e CCL possono derogare",
        body: "I termini di disdetta dipendono tra l'altro dal periodo di prova, dagli anni di servizio e dalle regole contrattuali. I contratti a tempo determinato terminano spesso senza disdetta ordinaria, salvo diverso accordo.",
      },
    ],
    faqs: [
      {
        question: "Come devo disdire il mio contratto di lavoro?",
        answer:
          "Disdica in modo univoco e per tempo sulla scadenza contrattuale ammessa. Una disdetta scritta e firmata con prova di recapito è particolarmente consigliabile se il contratto richiede la forma scritta.",
      },
      {
        question: "Quale termine di disdetta vale per il mio lavoro?",
        answer:
          "Verifichi innanzitutto il contratto di lavoro, il regolamento del personale e il CCL. In assenza di una regola diversa, il termine dipende di regola dal periodo di prova e dalla durata del rapporto di lavoro.",
      },
      {
        question: "Devo motivare le mie dimissioni?",
        answer:
          "In caso di disdetta ordinaria, i lavoratori non devono di regola indicare un motivo. Un breve ringraziamento può mantenere un tono professionale, ma è facoltativo.",
      },
      {
        question: "episto può anche richiedere un certificato di lavoro?",
        answer:
          "Sì. episto può includere direttamente nella disdetta la richiesta di un certificato di lavoro qualificato e di una conferma scritta della data di uscita.",
      },
    ],
    related: ["abo-kuendigen", "einschreiben-online", "brief-an-behoerde"],
  },
  {
    slug: "versicherung-kuendigen",
    category: "Disdetta",
    metaTitle: "Disdire un'assicurazione – lettera, termine e invio",
    metaDescription:
      "Disdire un'assicurazione complementare, mobilia domestica o RC: verificare polizza, termine e anno assicurativo. episto redige e invia la lettera.",
    h1: "Disdire un'assicurazione: terminare la polizza entro i termini",
    quickAnswer:
      "Per disdire un'assicurazione, verifichi polizza e condizioni di assicurazione per durata, termine di disdetta e fine dell'anno assicurativo. Indichi il numero di polizza e la scadenza desiderata e si faccia confermare lo scioglimento. In caso di cambio, la nuova copertura dovrebbe essere garantita in anticipo. episto formula la Sua disdetta e La invia con prova di ricezione.",
    steps: [
      {
        title: "Leggere polizza e condizioni",
        text: "Verifichi durata del contratto, anno assicurativo, termine di disdetta ed eventuali diritti speciali di disdetta nella polizza e nelle condizioni generali di assicurazione.",
      },
      {
        title: "Coordinare la nuova copertura",
        text: "Se la protezione resta necessaria, ottenga prima una conferma di ammissione vincolante dalla nuova assicurazione.",
      },
      {
        title: "Creare la disdetta",
        text: "Indichi tipo di assicurazione, numero di polizza e data di fine. episto La aiuta a formulare una disdetta chiara e formale.",
      },
      {
        title: "Notificare per tempo",
        text: "Consideri i tempi postali e conservi la conferma di invio e di disdetta. episto invia su richiesta come raccomandata.",
      },
    ],
    checklist: [
      "Nome e indirizzo della persona assicurata",
      "Compagnia di assicurazione e indirizzo del destinatario",
      "Numero di polizza o contratto",
      "Tipo di assicurazione e data di fine desiderata",
      "Richiesta di conferma scritta",
    ],
    notes: [
      {
        title: "L'anno assicurativo non coincide sempre con l'anno civile",
        body: "La fine del contratto può variare da polizza a polizza. Verifichi pertanto l'anno assicurativo concreto e il termine di disdetta invece di supporre genericamente il 31 dicembre.",
      },
      {
        title: "Separare assicurazione complementare e di base",
        body: "Per le assicurazioni complementari malattia valgono regole diverse rispetto all'assicurazione di base obbligatoria. Disdica un'assicurazione complementare solo quando la nuova copertura desiderata è confermata.",
      },
    ],
    faqs: [
      {
        question: "Come posso disdire la mia assicurazione?",
        answer:
          "Verifichi polizza e condizioni di assicurazione, indichi numero di polizza e data di fine e invii la disdetta con sufficiente anticipo affinché pervenga entro il termine concordato.",
      },
      {
        question: "Quando termina l'anno assicurativo?",
        answer:
          "L'anno assicurativo non corrisponde obbligatoriamente all'anno civile. La data determinante si trova nella polizza, nell'ultima fattura del premio o nelle condizioni di assicurazione.",
      },
      {
        question: "Posso disdire dopo un sinistro?",
        answer:
          "A seconda del tipo di assicurazione e delle condizioni, dopo un sinistro liquidato può esistere un diritto speciale di disdetta. Verifichi la polizza e reagisca entro il termine ivi indicato.",
      },
      {
        question: "Devo avere una nuova assicurazione prima della disdetta?",
        answer:
          "Se necessita ancora della protezione, è fortemente consigliato. Soprattutto per le assicurazioni complementari, una nuova ammissione non è garantita; eviti pertanto una lacuna di copertura involontaria.",
      },
    ],
    related: ["krankenkasse-kuendigen", "abo-kuendigen", "einschreiben-online"],
  },
  {
    slug: "handyabo-kuendigen",
    category: "Disdetta",
    metaTitle: "Disdire un abbonamento mobile – modello e invio",
    metaDescription:
      "Disdire un abbonamento mobile o internet: verificare durata, termine, numero e costi dispositivo. episto redige e invia la disdetta in modo sicuro.",
    h1: "Disdire un abbonamento mobile: termine, numero e cambio sotto controllo",
    quickAnswer:
      "Per disdire un abbonamento mobile, verifichi durata minima, termine di disdetta ed eventuali costi residui per dispositivi o sconti. Indichi numero cliente e di telefono e la data di fine desiderata. In caso di cambio operatore, la portabilità del numero va coordinata. episto formula la Sua disdetta e La invia per Lei.",
    steps: [
      {
        title: "Verificare la durata contrattuale",
        text: "Controlli durata minima, termine di disdetta, rinnovo ed eventuali penali per scioglimento anticipato nel contratto o nell'area clienti.",
      },
      {
        title: "Pianificare cambio e numero",
        text: "Chiarisca con il nuovo operatore se e quando il Suo numero sarà portato. Non disdica due volte se il nuovo operatore si occupa del cambio.",
      },
      {
        title: "Formulare la disdetta",
        text: "Indichi numero cliente, contratto e di telefono e la scadenza desiderata. episto crea una lettera di disdetta univoca.",
      },
      {
        title: "Controllare la conferma",
        text: "Verifichi la data di fine confermata, i pagamenti residui del dispositivo e gli obblighi di restituzione. Conservi la conferma di invio e quella dell'operatore.",
      },
    ],
    checklist: [
      "Nome completo e indirizzo di fatturazione",
      "Numero cliente e contratto",
      "Numero di telefono mobile o fisso interessato",
      "Termine di disdetta desiderato",
      "Indicazione sulla portabilità del numero e richiesta di conferma",
    ],
    notes: [
      {
        title: "Durata minima e costi residui",
        body: "Una disdetta prima della scadenza della durata minima può comportare costi. Verifichi anche le rate del dispositivo, gli sconti concessi ed eventuali obblighi di restituzione.",
      },
      {
        title: "Coordinare la portabilità con il nuovo operatore",
        body: "Chi desidera mantenere il numero dovrebbe chiarire prima la procedura di cambio con il nuovo operatore. Una disdetta non coordinata può complicare la portabilità.",
      },
    ],
    faqs: [
      {
        question: "Come posso disdire il mio abbonamento mobile?",
        answer:
          "Verifichi durata e termine di disdetta, indichi numero cliente e di telefono e disdica sul prossimo termine utile. Chieda una conferma con la data di fine.",
      },
      {
        question: "Posso disdire anticipatamente il mio abbonamento mobile?",
        answer:
          "Dipende dal contratto. Spesso, in caso di scioglimento anticipato, sono dovuti costi residui, importi per il dispositivo o sconti decadenti; si faccia quantificare i costi in anticipo.",
      },
      {
        question: "Come posso mantenere il mio numero di telefono?",
        answer:
          "Incarichi il nuovo operatore della portabilità e coordini la scadenza. Chiarisca se l'operatore si occupa della disdetta prima di inviare Lei stesso una lettera.",
      },
      {
        question: "Cosa posso fare in caso di controversia con l'operatore?",
        answer:
          "Reclami dapprima per iscritto presso l'operatore e documenti contratto, fatture e risposte. Se il conflitto resta irrisolto, è spesso possibile rivolgersi all'organo di conciliazione ombudscom.",
      },
    ],
    related: ["abo-kuendigen", "beschwerde-schreiben", "einschreiben-online"],
  },
  {
    slug: "fitnessabo-kuendigen",
    category: "Disdetta",
    metaTitle: "Disdire un abbonamento fitness – lettera e invio",
    metaDescription:
      "Disdire un abbonamento fitness: verificare durata, rinnovo, termine e casi particolari. episto formula e invia la Sua disdetta in modo sicuro per posta.",
    h1: "Disdire un abbonamento fitness: terminare l'affiliazione entro i termini",
    quickAnswer:
      "Per disdire un abbonamento fitness, verifichi contratto e CGC per durata minima, rinnovo automatico, termine di disdetta e forma richiesta. Indichi il numero di socio e la data di fine desiderata. Malattia o trasloco non comportano automaticamente lo scioglimento del contratto; spesso valgono condizioni particolari. episto formula la Sua disdetta e La invia con prova di ricezione.",
    steps: [
      {
        title: "Verificare durata e termine",
        text: "Legga contratto e CGC e annoti durata minima, regola di rinnovo, termine di disdetta e modalità di disdetta ammessa.",
      },
      {
        title: "Documentare il caso particolare",
        text: "Se disdice per malattia, trasloco o modifica della prestazione, verifichi la regola contrattuale e alleghi la prova richiesta.",
      },
      {
        title: "Creare la lettera di disdetta",
        text: "Indichi numero di socio, sede e data di fine desiderata. episto formula la lettera in modo chiaro e cortese.",
      },
      {
        title: "Assicurarsi la conferma",
        text: "Invii per tempo e chieda la fine del contratto per iscritto. In caso di termine ristretto, si consiglia un invio con prova di ricezione.",
      },
    ],
    checklist: [
      "Nome, indirizzo e data di nascita",
      "Numero di socio o contratto",
      "Centro fitness e sede interessata",
      "Termine di disdetta desiderato",
      "Eventuale prova per un motivo di disdetta particolare",
    ],
    notes: [
      {
        title: "Attenzione al rinnovo automatico",
        body: "I contratti fitness si rinnovano spesso secondo le CGC se non vengono disdetti per tempo. Determinanti sono le condizioni concordate al momento della stipula.",
      },
      {
        title: "Verificare malattia o trasloco separatamente",
        body: "Uno scioglimento anticipato non è dovuto in ogni caso. Alcuni centri prevedono, dietro prova, soluzioni di cortesia, sospensioni o regole particolari in caso di malattia duratura o grande distanza.",
      },
    ],
    faqs: [
      {
        question: "Come posso disdire il mio abbonamento fitness?",
        answer:
          "Verifichi contratto e CGC, indichi numero di socio e data di fine e invii la disdetta entro il termine concordato nella forma richiesta.",
      },
      {
        question: "Posso disdire anticipatamente per malattia?",
        answer:
          "Dipende dal contratto, dalla durata della limitazione e dalle CGC. Spesso il centro fitness richiede un certificato medico e offre uno scioglimento o una sospensione.",
      },
      {
        question: "Posso recedere dal contratto in caso di trasloco?",
        answer:
          "Un trasloco non autorizza automaticamente alla disdetta. Verifichi se le CGC contengono una regola sulla distanza e, in caso contrario, chieda una soluzione di cortesia con un certificato di domicilio.",
      },
      {
        question: "Cosa fare se il centro non conferma la disdetta?",
        answer:
          "Solleciti per iscritto e alleghi la Sua prova di invio. In caso di termini ristretti o ricezione contestata, una raccomandata può fornire una prova supplementare.",
      },
    ],
    related: ["abo-kuendigen", "einschreiben-online", "beschwerde-schreiben"],
  },
  {
    slug: "beschwerde-schreiben",
    category: "Reclamo",
    metaTitle: "Scrivere un reclamo – modello per la Svizzera",
    metaDescription:
      "Scrivere un reclamo obiettivo, indicare la richiesta e allegare le prove. episto formula e invia la Sua lettera di reclamo – anche come raccomandata.",
    h1: "Scrivere un reclamo: obiettivo, chiaro e convincente",
    quickAnswer:
      "Per scrivere un reclamo, descriva l'accaduto in ordine cronologico, menzioni contratto, ordinazione o fattura e formuli una soluzione concreta. Documenti la Sua esposizione con i documenti pertinenti e fissi se necessario un termine di risposta adeguato. episto La aiuta a trasformare tutto in una lettera di reclamo professionale e La invia per Lei.",
    steps: [
      {
        title: "Ordinare i fatti",
        text: "Annoti data, persone coinvolte, prestazione promessa e quanto è effettivamente accaduto. Separi i fatti verificabili dalla Sua valutazione.",
      },
      {
        title: "Definire la soluzione",
        text: "Decida cosa si aspetta concretamente: correzione, sostituzione, rimborso, spiegazione o un'altra soluzione adeguata.",
      },
      {
        title: "Redigere il reclamo",
        text: "Rimanga cortese ma determinato, menzioni le prove e fissi se necessario un termine di risposta realistico. episto struttura la lettera.",
      },
      {
        title: "Documentare l'invio",
        text: "Alleghi solo le copie necessarie e conservi la lettera e la prova di invio. Per richieste importanti, una raccomandata è consigliabile.",
      },
    ],
    checklist: [
      "Indirizzo completo del mittente e del destinatario",
      "Oggetto chiaro con numero cliente, ordinazione o fattura",
      "Descrizione cronologica e obiettiva",
      "Soluzione concreta desiderata e termine di risposta",
      "Prove pertinenti in copia o PDF",
    ],
    notes: [
      {
        title: "Fatti invece di accuse",
        body: "Una cronologia precisa, dati concreti e prove comprensibili hanno di solito più efficacia di accuse generiche o formulazioni emotive.",
      },
      {
        title: "Verificare la via di escalation",
        body: "Molti settori dispongono di organi di mediazione o conciliazione. Spesso è necessario aver prima reclamato senza successo direttamente presso l'azienda e poter documentare la corrispondenza.",
      },
    ],
    faqs: [
      {
        question: "Come posso scrivere un reclamo efficace?",
        answer:
          "Descriva i fatti in modo conciso e cronologico, menzioni i riferimenti e le prove e chieda una soluzione concreta e adeguata entro un termine realistico.",
      },
      {
        question: "Come formulare un reclamo in modo cortese ma determinato?",
        answer:
          "Utilizzi fatti neutri, eviti attacchi personali e scriva chiaramente quale correzione si aspetta. Un tono pacato aumenta le probabilità di una risposta costruttiva.",
      },
      {
        question: "Quali prove dovrei allegare?",
        answer:
          "Sono adatti ad esempio contratto, conferma d'ordine, fattura, foto e corrispondenza precedente. Invii di regola copie e conservi gli originali presso di Sé.",
      },
      {
        question: "Un reclamo va inviato per raccomandata?",
        answer:
          "No, non sempre. Per importi elevati, termini in corso o una possibile escalation, un invio con prova di ricezione è tuttavia spesso consigliabile.",
      },
    ],
    related: ["einsprache-erheben", "mahnung-schreiben", "einschreiben-online"],
  },
  {
    slug: "mahnung-schreiben",
    category: "Recupero crediti",
    metaTitle: "Scrivere un sollecito – esigere il pagamento",
    metaDescription:
      "Scrivere un sollecito chiaro con riferimento alla fattura, importo e nuovo termine. episto formula e invia la Sua lettera – anche come raccomandata.",
    h1: "Scrivere un sollecito: esigere il pagamento insoluto in modo professionale",
    quickAnswer:
      "Per scrivere un sollecito, indichi fattura, importo insoluto, scadenza originaria e un nuovo termine di pagamento adeguato. Formuli in modo obiettivo, indichi le coordinate di pagamento e annunci ulteriori passi solo se intende verificarli e attuarli. episto crea il Suo sollecito e Lo invia con prova di ricezione.",
    steps: [
      {
        title: "Verificare il credito",
        text: "Controlli contratto, fattura, scadenza, pagamenti effettuati e l'indirizzo corretto del debitore o della debitrice.",
      },
      {
        title: "Fissare un nuovo termine",
        text: "Stabilisca una data di pagamento concreta e adeguata e decida se inviare dapprima un promemoria amichevole o già un sollecito formale.",
      },
      {
        title: "Redigere il sollecito",
        text: "Indichi chiaramente importo, numero di fattura, scadenza e dati di pagamento. episto formula la lettera in modo professionale e determinato.",
      },
      {
        title: "Registrare invio e reazione",
        text: "Documenti l'invio, la ricezione del pagamento e le risposte. Per un ultimo sollecito o crediti più elevati, si consiglia una raccomandata.",
      },
    ],
    checklist: [
      "Nomi e indirizzi completi di entrambe le parti",
      "Numero di fattura, data fattura e prestazione",
      "Importo insoluto e scadenza originaria",
      "Nuovo termine di pagamento concreto",
      "IBAN o altre coordinate di pagamento univoche",
    ],
    notes: [
      {
        title: "La mora dipende dalla scadenza",
        body: "Se un sollecito sia necessario per costituire in mora la persona tenuta al pagamento dipende tra l'altro dal fatto che fosse stata concordata una data di pagamento precisa. Verifichi il caso concreto.",
      },
      {
        title: "Non inventare spese e interessi in modo forfettario",
        body: "Le spese di sollecito dovrebbero essere pattuite contrattualmente e adeguate. Interessi di mora e ulteriori costi dipendono dall'accordo e dalla situazione giuridica; indichi solo importi motivati in modo comprensibile.",
      },
    ],
    faqs: [
      {
        question: "Come devo scrivere un sollecito?",
        answer:
          "Indichi la fattura concreta, l'importo insoluto, la scadenza e una nuova data di pagamento. Aggiunga le coordinate di pagamento e chieda un riscontro se il pagamento è già stato effettuato.",
      },
      {
        question: "Quale termine di pagamento devo indicare nel sollecito?",
        answer:
          "Il termine dovrebbe essere realistico e indicato come data concreta. Quanto sia adeguato dipende dall'importo, dai contatti precedenti e dalle circostanze del credito.",
      },
      {
        question: "Posso esigere spese di sollecito e interessi di mora?",
        answer:
          "Non è automaticamente ammesso in qualsiasi misura. Verifichi contratto, CGC e la situazione giuridica concreta e indichi solo importi motivati in modo comprensibile.",
      },
      {
        question: "Quando dovrei inviare un sollecito per raccomandata?",
        answer:
          "La raccomandata è particolarmente utile per un ultimo sollecito, importi elevati o un'eventuale procedura esecutiva successiva, poiché consente di documentare l'invio.",
      },
    ],
    related: ["einschreiben-online", "beschwerde-schreiben", "brief-online-versenden"],
  },
  {
    slug: "einsprache-erheben",
    category: "Lettera soggetta a termine",
    metaTitle: "Fare opposizione – termine e lettera",
    metaDescription:
      "Fare opposizione contro una fattura, una decisione o un provvedimento: verificare termine, autorità competente, motivazione e prove. episto redige la lettera.",
    h1: "Fare opposizione: reagire entro i termini e in modo comprensibile",
    quickAnswer:
      "Per fare opposizione, verifichi innanzitutto quale rimedio giuridico è ammesso, quale autorità è competente e quando scade il termine. Designi con precisione la decisione impugnata, formuli una richiesta chiara e la motivi con le prove. Per le fatture, spesso è sufficiente un'obiezione scritta. episto formula e invia la Sua lettera.",
    steps: [
      {
        title: "Verificare rimedio giuridico e termine",
        text: "Legga per intero la decisione, il provvedimento o la fattura. L'indicazione dei rimedi giuridici specifica spesso procedura, autorità competente, forma e termine.",
      },
      {
        title: "Ordinare richiesta e motivi",
        text: "Annoti cosa dev'essere modificato o annullato e quali fatti, documenti o calcoli sostengono la Sua posizione.",
      },
      {
        title: "Redigere la lettera",
        text: "Designi il documento con data e numero di riferimento e formuli richiesta e motivazione in modo chiaro. episto struttura la lettera.",
      },
      {
        title: "Presentare entro i termini",
        text: "Firmi la lettera, alleghi le prove e la invii con prova di ricezione all'autorità competente. Conservi una copia completa.",
      },
    ],
    checklist: [
      "Autorità destinataria o di ricorso competente",
      "Data, numero di riferimento e designazione della decisione",
      "Richiesta chiara: cosa dev'essere modificato?",
      "Motivazione comprensibile con prove",
      "Data, firma e prova di invio entro i termini",
    ],
    notes: [
      {
        title: "Non ogni lettera si chiama opposizione",
        body: "A seconda del documento, può essere prevista opposizione, reclamo, ricorso o una semplice obiezione. Utilizzi la procedura e l'autorità indicate nell'indicazione dei rimedi giuridici.",
      },
      {
        title: "Mettere subito al sicuro i termini",
        body: "I termini dei rimedi giuridici possono essere brevi e spesso non sono prorogabili. Verifichi inizio, fine e requisiti formali subito dopo aver ricevuto il documento.",
      },
    ],
    faqs: [
      {
        question: "Come posso fare opposizione?",
        answer:
          "Segua l'indicazione dei rimedi giuridici, designi la decisione impugnata, formuli una richiesta chiara e presenti motivazione, firma e prove entro i termini all'autorità competente.",
      },
      {
        question: "Quanto dura il termine di opposizione?",
        answer:
          "Il termine dipende dalla procedura e dall'autorità. Determinanti sono la procedura applicabile e l'indicazione dei rimedi giuridici sulla decisione concreta; la verifichi immediatamente.",
      },
      {
        question: "Posso fare opposizione contro una fattura errata?",
        answer:
          "Per una fattura privata non si tratta di regola di un'opposizione formale, bensì di un'obiezione scritta o di una contestazione. Indichi le posizioni contestate e i Suoi motivi.",
      },
      {
        question: "È sufficiente una lettera breve senza motivazione?",
        answer:
          "Dipende dalle regole procedurali e può essere rischioso. Presenti se possibile una richiesta chiara e una motivazione comprensibile con le prove entro il termine.",
      },
    ],
    related: ["brief-an-behoerde", "beschwerde-schreiben", "einschreiben-online"],
  },
  {
    slug: "mietzins-senken",
    category: "Diritto di locazione",
    metaTitle: "Ridurre la pigione – domanda di riduzione",
    metaDescription:
      "Chiedere la riduzione della pigione per ribasso del tasso di riferimento: verificare base, scadenza e termini. episto redige la domanda e La invia per posta.",
    h1: "Ridurre la pigione: presentare correttamente la domanda di riduzione",
    quickAnswer:
      "Chi desidera ridurre la pigione confronta il tasso d'interesse di riferimento su cui si basa la pigione attuale con il tasso determinante odierno. Se sussiste in linea di principio un diritto, presenti al locatore una domanda scritta di riduzione sul prossimo termine di disdetta. Ulteriori fattori di costo possono influenzare la riduzione. episto formula e invia la Sua domanda.",
    steps: [
      {
        title: "Determinare la situazione di partenza",
        text: "Verifichi il contratto di locazione e l'ultimo adeguamento della pigione. Spesso vi è indicato quale tasso d'interesse di riferimento è alla base della pigione netta attuale.",
      },
      {
        title: "Calcolare approssimativamente il diritto",
        text: "Confronti il tasso di allora con il tasso d'interesse di riferimento attuale e consideri possibili fattori contrari come rincaro o aumenti generali dei costi.",
      },
      {
        title: "Redigere la domanda di riduzione",
        text: "Chieda l'adeguamento della pigione netta sul prossimo termine utile e richieda un calcolo comprensibile. episto crea la lettera.",
      },
      {
        title: "Monitorare risposta e termini",
        text: "Invii possibilmente come raccomandata e annoti la data di spedizione. Verifichi per tempo un eventuale rifiuto o calcolo compensativo.",
      },
    ],
    checklist: [
      "Indirizzo completo dei conduttori e del locatore",
      "Indirizzo dell'immobile locato",
      "Pigione netta attuale",
      "Tasso d'interesse di riferimento determinante precedente e attuale",
      "Scadenza di adeguamento richiesta e domanda di conferma",
    ],
    notes: [
      {
        title: "Il tasso d'interesse di riferimento è determinante",
        body: "Per i rapporti di locazione in corso vale il tasso d'interesse di riferimento ipotecario, non direttamente il tasso guida della Banca nazionale. Il punto di partenza è di solito il livello al momento della stipula del contratto o dell'ultimo adeguamento.",
      },
      {
        title: "Rispettare i termini di risposta e di conciliazione",
        body: "Il locatore deve rispondere di regola entro 30 giorni. In caso di rifiuto o mancata risposta, valgono termini brevi per adire l'autorità di conciliazione; li verifichi immediatamente.",
      },
    ],
    faqs: [
      {
        question: "Come posso ridurre la mia pigione?",
        answer:
          "Verifichi il tasso d'interesse di riferimento determinante per la Sua pigione e presenti al locatore una domanda scritta e motivata di riduzione sul prossimo termine di disdetta.",
      },
      {
        question:
          "Ogni ribasso del tasso di riferimento comporta una riduzione della pigione?",
        answer:
          "Non necessariamente. Determinante è il livello su cui si basa la Sua pigione attuale; inoltre il locatore può, a seconda del caso, opporre in compensazione rincaro o aumenti dei costi.",
      },
      {
        question: "Da quando vale la riduzione della pigione?",
        answer:
          "Una riduzione non ha di regola effetto retroattivo, bensì al più presto su un termine di disdetta futuro ammesso. Invii pertanto la domanda con sufficiente anticipo prima dell'inizio del termine di disdetta.",
      },
      {
        question: "Cosa fare se il locatore rifiuta?",
        answer:
          "Verifichi subito motivazione e calcolo. Se non è d'accordo o non riceve risposta, può adire l'autorità di conciliazione competente entro il termine determinante.",
      },
    ],
    related: [
      "wohnung-kuendigen",
      "nebenkostenabrechnung-pruefen",
      "einschreiben-online",
    ],
  },
  {
    slug: "brief-an-behoerde",
    category: "Corrispondenza con le autorità",
    metaTitle: "Scrivere una lettera alle autorità online",
    metaDescription:
      "Scrivere una lettera chiara a ufficio, comune o amministrazione: indicare riferimento, richiesta, termine e prove. episto La aiuta con l'invio sicuro.",
    h1: "Scrivere una lettera alle autorità: chiara, completa ed entro i termini",
    quickAnswer:
      "Per scrivere una lettera a un'autorità, indichi l'ufficio competente, i Suoi dati personali e un eventuale numero di riferimento. Formuli la Sua richiesta in modo univoco, la motivi brevemente e alleghi le prove richieste. Rispetti i termini e i requisiti di forma. episto crea e invia la Sua lettera alle autorità.",
    steps: [
      {
        title: "Chiarire la competenza",
        text: "Verifichi quale ufficio o servizio comunale tratta la Sua richiesta e se è prescritto un modulo o una determinata modalità di presentazione.",
      },
      {
        title: "Raccogliere i documenti",
        text: "Tenga a portata di mano numero di riferimento, dati rilevanti, lettere precedenti e le prove richieste. Utilizzi copie ben leggibili.",
      },
      {
        title: "Formulare la richiesta",
        text: "Scriva chiaramente cosa richiede o desidera sapere e ordini i motivi principali. episto conferisce alla Sua richiesta una forma professionale.",
      },
      {
        title: "Presentare entro i termini",
        text: "Firmi, controlli gli allegati e scelga, in caso di termini in corso, un invio con prova di ricezione. Conservi una copia completa.",
      },
    ],
    checklist: [
      "Nome completo, indirizzo e recapiti",
      "Autorità e servizio competente corretti",
      "Numero di riferimento, dossier o pratica",
      "Richiesta chiara con motivazione",
      "Data, firma e allegati designati",
    ],
    notes: [
      {
        title: "Il modulo può essere obbligatorio",
        body: "Per determinate domande, comunicazioni o rimedi giuridici, Confederazione, Cantone o Comune esigono un modulo ufficiale o un canale digitale specifico. Verifichi le prescrizioni prima dell'invio.",
      },
      {
        title: "Documentare termine e notifica",
        body: "In caso di decisioni e procedure in corso, possono valere termini brevi. Osservi l'indicazione dei rimedi giuridici e conservi le prove d'impostazione o di ricezione.",
      },
    ],
    faqs: [
      {
        question: "Come posso scrivere una lettera a un'autorità?",
        answer:
          "Indichi ufficio competente, dati personali e numero di riferimento, formuli una richiesta univoca e la motivi con i dati e le prove necessarie.",
      },
      {
        question: "Come trovo l'autorità giusta?",
        answer:
          "Verifichi la lettera ricevuta, il sito web del Suo Comune o Cantone o chieda all'amministrazione. Un invio errato può essere rischioso in presenza di termini.",
      },
      {
        question: "Una lettera alle autorità richiede la firma?",
        answer:
          "Per domande formali e rimedi giuridici, la firma è spesso necessaria. Osservi la prescrizione concreta di procedura o di modulo dell'ufficio competente.",
      },
      {
        question: "Devo inviare la lettera all'ufficio per raccomandata?",
        answer:
          "In presenza di un termine importante o di una richiesta formale, un invio con prova di ricezione è spesso opportuno. Determinante resta che la lettera sia presentata per tempo all'ufficio giusto.",
      },
    ],
    related: ["einsprache-erheben", "einschreiben-online", "brief-online-versenden"],
  },
  {
    slug: "brief-online-versenden",
    category: "Invio",
    metaTitle: "Spedire una lettera online – stampa e invio",
    metaDescription:
      "Scrivere una lettera online e spedirla tramite Posta Svizzera, senza stampante né ufficio postale. episto la scrive, la stampa e la spedisce.",
    h1: "Spedire una lettera online – senza stampante né ufficio postale",
    quickAnswer:
      "Chi desidera spedire una lettera online inserisce contenuto e destinatario in formato digitale, verifica la lettera finale e incarica stampa, imbustamento e consegna alla Posta. A seconda della richiesta, si sceglie posta standard o raccomandata. Così si risparmiano stampante e viaggio all'ufficio postale. Con episto si fa tutto online in pochi minuti.",
    steps: [
      {
        title: "Inserire la richiesta",
        text: "Descriva a chi scrive e cosa desidera ottenere. episto La aiuta a formulare una lettera adatta e professionale.",
      },
      {
        title: "Verificare la lettera",
        text: "Controlli e modifichi contenuto, mittente, destinatario, data ed eventuali allegati prima del via libera.",
      },
      {
        title: "Scegliere la modalità di invio",
        text: "Scelga lettera standard o raccomandata in base a termine, importanza e prova desiderata. Il prezzo è visualizzato prima del pagamento.",
      },
      {
        title: "Affidare stampa e invio",
        text: "episto trasmette la Sua lettera alla Posta Svizzera, che la stampa, la imbusta e la recapita. Lei non deve né stampare né recarsi all'ufficio postale.",
      },
    ],
    checklist: [
      "Indirizzo completo del mittente",
      "Indirizzo corretto del destinatario in Svizzera",
      "Oggetto chiaro e contenuto della lettera verificato",
      "Eventuali allegati in PDF",
      "Modalità di invio adatta: standard o raccomandata",
    ],
    notes: [
      {
        title: "Raccomandata per termini importanti",
        body: "Per disdette, opposizioni o altre dichiarazioni importanti, la raccomandata è spesso opportuna. Documenta impostazione e recapito meglio di una lettera standard.",
      },
      {
        title: "Verificare l'indirizzo prima del via libera",
        body: "episto spedisce a indirizzi di destinatari in Svizzera. Controlli con cura nome, via, numero civico, NPA e località prima di confermare l'incarico.",
      },
    ],
    faqs: [
      {
        question: "Come posso spedire una lettera online?",
        answer:
          "Inserisce contenuto e indirizzo in digitale, verifica la lettera finale e sceglie la modalità di invio. episto trasmette la lettera alla Posta Svizzera, che si occupa di stampa, imbustamento e recapito.",
      },
      {
        question: "Ho bisogno di una stampante o di francobolli?",
        answer:
          "No. Lei crea e paga la lettera online; episto inoltra l'ordine alla Posta Svizzera, che si occupa di carta, stampa, busta, affrancatura e consegna.",
      },
      {
        question: "Posso inviare la lettera come raccomandata?",
        answer:
          "Sì. Scelga prima del pagamento l'opzione «Raccomandata» se necessita di una prova d'impostazione e recapito.",
      },
      {
        question: "Posso includere allegati?",
        answer:
          "Sì. Gli allegati pertinenti possono di regola essere aggiunti come PDF. Prima del via libera, verifichi che tutte le pagine siano complete e ben leggibili.",
      },
    ],
    related: ["einschreiben-online", "brief-an-behoerde", "beschwerde-schreiben"],
  },
  {
    slug: "nebenkostenabrechnung-pruefen",
    category: "Diritto di locazione",
    metaTitle: "Spese accessorie – verifica e contestazione",
    metaDescription:
      "Verificare il conguaglio delle spese accessorie, chiedere i giustificativi e contestare voci poco chiare. episto formula e invia la Sua obiezione.",
    h1: "Verificare il conguaglio spese accessorie e contestare le divergenze",
    quickAnswer:
      "Per verificare un conguaglio spese accessorie, confronti periodo di conteggio, tipi di costi pattuiti contrattualmente, acconti e chiave di ripartizione. In caso di dubbi, chieda un prospetto dettagliato e la consultazione dei giustificativi. Contesti singole voci per iscritto invece di respingere l'intero conteggio in blocco. episto formula e invia la Sua obiezione.",
    steps: [
      {
        title: "Confrontare con il contratto di locazione",
        text: "Verifichi quali spese accessorie sono pattuite separatamente e se paga acconti, un forfait o singoli costi direttamente.",
      },
      {
        title: "Ricalcolare il conteggio",
        text: "Controlli periodo, oggetto, acconti versati, costi totali, chiave di ripartizione e il saldo che ne risulta.",
      },
      {
        title: "Chiedere giustificativi e spiegazioni",
        text: "Per le voci che saltano all'occhio, chieda una spiegazione comprensibile e la consultazione delle fatture o delle basi di calcolo.",
      },
      {
        title: "Inviare l'obiezione in modo concreto",
        text: "Indichi con precisione le voci contestate e le Sue domande. episto La aiuta a formulare una lettera obiettiva al locatore o all'amministrazione.",
      },
    ],
    checklist: [
      "Contratto di locazione e tipi di spese accessorie pattuite",
      "Periodo di conteggio e immobile locato interessato",
      "Acconti versati",
      "Voci e importi contestati",
      "Richiesta di consultazione dei giustificativi, spiegazione e conteggio corretto",
    ],
    notes: [
      {
        title: "Solo spese accessorie pattuite separatamente",
        body: "Le spese accessorie devono di regola essere pattuite concretamente nel contratto di locazione per poter essere richieste in aggiunta alla pigione netta. Termini collettivi generici possono sollevare questioni.",
      },
      {
        title: "La consultazione dei giustificativi crea chiarezza",
        body: "I locatari possono di regola chiedere la consultazione dei giustificativi alla base del conteggio. Presenti la richiesta tempestivamente e indichi le voci poco chiare.",
      },
    ],
    faqs: [
      {
        question: "Come posso verificare il mio conguaglio spese accessorie?",
        answer:
          "Confronti i tipi di costo con il contratto di locazione e controlli periodo, acconti, chiave di ripartizione e saldo. Per importi poco chiari, chieda giustificativi e spiegazioni.",
      },
      {
        question: "Posso consultare i giustificativi del conguaglio spese accessorie?",
        answer:
          "Sì, i locatari possono di regola chiedere la consultazione dei giustificativi alla base. Concordi con il locatore o l'amministrazione come e dove avviene la consultazione.",
      },
      {
        question: "Quali spese accessorie può fatturare il locatore?",
        answer:
          "Possono essere fatturate separatamente, di regola, le spese accessorie pattuite concretamente nel contratto di locazione e legate all'uso dell'immobile locato. Manutenzione e amministrazione non vi rientrano a piacimento.",
      },
      {
        question: "Devo pagare subito un conguaglio contestato?",
        answer:
          "Non ignori la fattura. Contesti immediatamente per iscritto le voci concrete e chiarisca come procedere con gli importi non contestati e quelli contestati fino alla verifica.",
      },
    ],
    related: ["mietzins-senken", "beschwerde-schreiben", "einschreiben-online"],
  },
  {
    slug: "rechtsvorschlag-erheben",
    category: "Esecuzione",
    metaTitle: "Interporre opposizione – termine e lettera",
    metaDescription:
      "Interporre opposizione a un precetto esecutivo: termine di 10 giorni, forma ed effetto da verificare. episto redige la Sua opposizione e la invia per posta.",
    h1: "Interporre opposizione a un precetto esecutivo",
    quickAnswer:
      "Chi riceve un precetto esecutivo dell’ufficio d’esecuzione e non riconosce il credito può interporre opposizione entro 10 giorni dalla notificazione. L’opposizione non deve essere motivata e sospende l’esecuzione. Il creditore deve poi procedere con il rigetto o con un’azione. episto redige la Sua opposizione.",
    steps: [
      {
        title: "Verificare precetto e termine",
        text: "Annoti la data di notificazione del precetto esecutivo. Il termine per l’opposizione è di 10 giorni dalla notificazione – non lo lasci scadere.",
      },
      {
        title: "Scegliere la forma",
        text: "L’opposizione può essere dichiarata oralmente o per iscritto all’ufficio d’esecuzione. La forma scritta con prova è la più sicura; un’opposizione parziale va quantificata.",
      },
      {
        title: "Redigere l’opposizione",
        text: "Indichi il numero d’esecuzione, l’ufficio e le parti e dichiari chiaramente di interporre opposizione. episto redige la lettera.",
      },
      {
        title: "Inoltrare nel termine",
        text: "Invii l’opposizione in modo che pervenga all’ufficio entro il termine – preferibilmente come raccomandata. Conservi la prova d’invio.",
      },
    ],
    checklist: [
      "Indirizzo completo e dati della persona escussa",
      "Ufficio d’esecuzione competente e numero d’esecuzione",
      "Data di notificazione del precetto esecutivo",
      "Dichiarazione di interporre opposizione (totale o parziale)",
      "Data e firma",
    ],
    notes: [
      {
        title: "Termine di 10 giorni (art. 74 LEF)",
        body: "L’opposizione va interposta entro 10 giorni dalla notificazione del precetto esecutivo. Scaduto il termine, l’esecuzione può proseguire; un’opposizione tardiva è ammessa solo eccezionalmente.",
      },
      {
        title: "Effetto e seguito",
        body: "L’opposizione non deve essere motivata e sospende l’esecuzione. Il creditore può poi chiedere il rigetto o promuovere un’azione. Interporre opposizione non significa che il credito non esista.",
      },
    ],
    faqs: [
      {
        question: "Come si interpone opposizione?",
        answer:
          "Dichiari all’ufficio d’esecuzione, entro 10 giorni dalla notificazione del precetto, oralmente o per iscritto, di interporre opposizione. Non è necessaria alcuna motivazione.",
      },
      {
        question: "Quanto tempo ho a disposizione?",
        answer:
          "Il termine è di 10 giorni dalla notificazione del precetto esecutivo. Conta la ricezione da parte dell’ufficio, non la data della Sua lettera.",
      },
      {
        question: "Devo motivare l’opposizione?",
        answer:
          "No. L’opposizione non deve essere motivata. Può interporla totalmente o – indicando l’importo riconosciuto – parzialmente.",
      },
      {
        question: "Cosa succede dopo l’opposizione?",
        answer:
          "L’esecuzione è sospesa. Il creditore deve proseguirla con il rigetto o con un’azione se mantiene il credito.",
      },
    ],
    related: ["einsprache-erheben", "mahnung-schreiben", "brief-an-behoerde"],
  },
  {
    slug: "mietmangel-melden",
    category: "Diritto di locazione",
    metaTitle: "Segnalare un difetto dell’abitazione",
    metaDescription:
      "Segnalare un difetto dell’abitazione ed esigere la riparazione: descrivere, fissare un termine, verificare i diritti. episto redige la notifica e la invia.",
    h1: "Segnalare un difetto dell’abitazione ed esigere la riparazione",
    quickAnswer:
      "Chi constata nell’abitazione locata un difetto di cui deve rispondere il locatore lo segnala per iscritto al più presto ed esige la riparazione entro un termine adeguato. A seconda della gravità entrano in gioco altri diritti come la riduzione della pigione. episto redige la Sua notifica di difetti e la invia.",
    steps: [
      {
        title: "Documentare il difetto",
        text: "Annoti tipo e luogo del difetto e da quando esiste. Foto con data servono da prova.",
      },
      {
        title: "Esigere la riparazione e fissare un termine",
        text: "Chieda per iscritto al locatore di riparare il difetto entro un termine adeguato e lo descriva in modo concreto.",
      },
      {
        title: "Redigere la notifica di difetti",
        text: "Descriva il difetto, esiga la riparazione e si riservi gli altri diritti. episto redige la lettera.",
      },
      {
        title: "Seguire la reazione",
        text: "Invii preferibilmente come raccomandata e annoti la data. Se il locatore non reagisce, valuti i passi successivi.",
      },
    ],
    checklist: [
      "Indirizzo completo di conduttore e locatore",
      "Indirizzo dell’oggetto locato",
      "Descrizione precisa del difetto e da quando esiste",
      "Riparazione richiesta e termine adeguato",
      "Riserva degli altri diritti, data e firma",
    ],
    notes: [
      {
        title: "Diritto alla riparazione del difetto (art. 259 CO)",
        body: "Per i difetti di cui non deve rispondere Lei, può esigere la riparazione dal locatore. Segnali i difetti rapidamente; una segnalazione tardiva può comportare svantaggi.",
      },
      {
        title: "Altri diritti in caso di difetto",
        body: "A seconda della gravità entrano in gioco la riduzione della pigione, il risarcimento o – a condizioni particolari – il deposito della pigione. Il deposito è soggetto a rigorose regole di forma; le verifichi prima.",
      },
    ],
    faqs: [
      {
        question: "Come si segnala un difetto dell’abitazione?",
        answer:
          "Descriva il difetto per iscritto, esiga la riparazione entro un termine adeguato e si riservi gli altri diritti. Invii la notifica preferibilmente con prova.",
      },
      {
        question: "Entro quando devo segnalare un difetto?",
        answer:
          "Segnali i difetti il prima possibile dopo averli scoperti. Una segnalazione tardiva può ridurre le Sue pretese, soprattutto se ne deriva un danno maggiore.",
      },
      {
        question: "Posso ridurre la pigione a causa di un difetto?",
        answer:
          "In caso di difetto rilevante può entrare in gioco una riduzione della pigione. Esiga prima la riparazione; la riduzione e altri passi si valutano secondo il caso.",
      },
      {
        question: "Posso semplicemente trattenere la pigione?",
        answer:
          "Non senz’altro. Trattenere la pigione di propria iniziativa è rischioso. Il deposito della pigione è ammesso solo a condizioni e forme rigorose.",
      },
    ],
    related: ["mietzins-senken", "nebenkostenabrechnung-pruefen", "wohnung-kuendigen"],
  },
];
