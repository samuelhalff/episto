import type { LandingPage } from "./types";

export const DE_LANDING_PAGES: LandingPage[] = [
  {
    slug: "wohnung-kuendigen",
    category: "Kündigung",
    metaTitle: "Wohnung kündigen in der Schweiz – Brief & Versand",
    metaDescription:
      "Mietvertrag in der Schweiz korrekt kündigen: Frist, Termin und Form. episto schreibt Ihre Kündigung und versendet sie – auf Wunsch als Einschreiben.",
    h1: "Wohnung kündigen: Mietvertrag korrekt und fristgerecht beenden",
    quickAnswer:
      "Um Ihre Wohnung in der Schweiz zu kündigen, senden Sie dem Vermieter eine schriftliche Kündigung, die spätestens am letzten Tag vor Fristbeginn eintrifft. Bei unbefristeten Mietverträgen gilt in der Regel eine Frist von drei Monaten auf den ortsüblichen Termin. Ein Einschreiben gilt als Nachweis.",
    steps: [
      {
        title: "Frist und Termin prüfen",
        text: "Schauen Sie im Mietvertrag nach Kündigungsfrist und zulässigen Terminen. Fehlt eine Angabe, gilt das gesetzliche Minimum von drei Monaten auf einen ortsüblichen Termin.",
      },
      {
        title: "Angaben zusammentragen",
        text: "Notieren Sie Adresse der Mietsache, gewünschtes Enddatum sowie Namen aller Personen, die den Vertrag unterschrieben haben.",
      },
      {
        title: "Kündigung verfassen",
        text: "Formulieren Sie ein klares Schreiben mit Betreff, Kündigungsdatum und Unterschrift. episto erstellt daraus in Minuten einen sauberen Brief.",
      },
      {
        title: "Nachweisbar versenden",
        text: "Versenden Sie die Kündigung als Einschreiben, damit Sie den fristgerechten Zugang belegen können. episto übermittelt Ihren Brief der Schweizer Post, die ihn druckt und zustellt.",
      },
    ],
    checklist: [
      "Vollständige Adresse von Vermieter und Mietobjekt",
      "Eindeutiges Kündigungsdatum (Enddatum des Mietverhältnisses)",
      "Bezug auf den Mietvertrag",
      "Unterschrift aller Vertragsparteien",
      "Bitte um schriftliche Bestätigung",
    ],
    notes: [
      {
        title: "Familienwohnung: beide Partner unterschreiben",
        body: "Bei einer gemeinsam genutzten Familienwohnung müssen beide Ehe- bzw. eingetragenen Partner die Kündigung unterschreiben – auch wenn nur eine Person im Vertrag steht.",
      },
      {
        title: "Fristgerechter Zugang zählt",
        body: "Massgebend ist nicht das Datum des Briefes, sondern wann die Kündigung beim Vermieter eintrifft. Planen Sie den Postweg ein und versenden Sie früh genug.",
      },
    ],
    faqs: [
      {
        question: "Wie lange ist die Kündigungsfrist für eine Wohnung?",
        answer:
          "Bei unbefristeten Mietverträgen beträgt die gesetzliche Mindestfrist drei Monate auf den ortsüblichen Termin. Im Mietvertrag können längere Fristen vereinbart sein – die Angabe im Vertrag geht vor.",
      },
      {
        question: "Muss ich die Kündigung per Einschreiben senden?",
        answer:
          "Gesetzlich ist keine bestimmte Versandart vorgeschrieben. Ein Einschreiben wird aber dringend empfohlen, weil Sie damit den fristgerechten Zugang beweisen können.",
      },
      {
        question: "Kann ich vorzeitig aus dem Mietvertrag aussteigen?",
        answer:
          "Ja. Sie können ausserterminlich kündigen, wenn Sie einen zumutbaren Nachmieter vorschlagen, der bereit und zahlungsfähig ist und den Vertrag zu den bestehenden Bedingungen übernimmt.",
      },
      {
        question: "Was kostet der Versand mit episto?",
        answer:
          "Sie sehen den genauen Preis vor der Zahlung. Er setzt sich aus dem Porto und einer transparenten Servicepauschale zusammen; ein Einschreiben kostet etwas mehr als ein Standardbrief.",
      },
    ],
    related: ["abo-kuendigen", "einschreiben-online", "mietzins-senken"],
  },
  {
    slug: "einschreiben-online",
    category: "Versand",
    metaTitle: "Einschreiben online versenden – ohne Poststelle",
    metaDescription:
      "Einschreiben online versenden, ohne Gang zur Poststelle. episto übermittelt Ihren Brief der Schweizer Post, die ihn druckt und zustellt – mit Nachweis.",
    h1: "Einschreiben online versenden – ohne Gang zur Poststelle",
    quickAnswer:
      "Ein Einschreiben online zu versenden bedeutet: Sie schreiben den Brief digital, und er wird gedruckt und als eingeschriebene Sendung der Schweizer Post übergeben. So erhalten Sie einen Zustellnachweis, ohne selbst zur Poststelle zu gehen. Mit episto ist das in wenigen Minuten erledigt.",
    steps: [
      {
        title: "Brief digital erstellen",
        text: "Beschreiben Sie Ihr Anliegen. episto formuliert daraus ein sauberes, formelles Schreiben, das Sie prüfen und anpassen können.",
      },
      {
        title: "Einschreiben wählen",
        text: "Wählen Sie beim Versand die Option «Einschreiben». Sie sehen den genauen Total vor der Zahlung.",
      },
      {
        title: "Druck und Übergabe",
        text: "episto übermittelt den Brief der Schweizer Post, die ihn als eingeschriebene Sendung druckt und zustellt.",
      },
      {
        title: "Zustellung nachverfolgen",
        text: "Zu einem Einschreiben gehört ein Nachweis über die Aufgabe und Zustellung, sodass Sie den Versand belegen können.",
      },
    ],
    checklist: [
      "Vollständige Empfängeradresse in der Schweiz",
      "Klarer Betreff und Anliegen",
      "Datum und Unterschrift",
      "Allfällige Beilagen als PDF",
      "Auswahl «Einschreiben» beim Versand",
    ],
    notes: [
      {
        title: "Wann sich ein Einschreiben lohnt",
        body: "Ein Einschreiben empfiehlt sich immer dann, wenn eine Frist läuft oder der Zugang wichtig ist – etwa bei Kündigungen, Einsprachen oder Mahnungen.",
      },
      {
        title: "Nur an Schweizer Adressen",
        body: "episto versendet Briefe an Empfängeradressen in der Schweiz. Die Adresse prüfen Sie vor dem Versand.",
      },
    ],
    faqs: [
      {
        question: "Kann ich ein Einschreiben versenden, ohne zur Post zu gehen?",
        answer:
          "Ja. Sie schreiben den Brief online, und episto übermittelt ihn der Schweizer Post, die ihn als Einschreiben druckt und zustellt. Ein Gang zur Poststelle ist nicht nötig.",
      },
      {
        question: "Erhalte ich einen Zustellnachweis?",
        answer:
          "Ja. Ein Einschreiben umfasst einen Nachweis über Aufgabe und Zustellung, den Sie zur Sicherheit aufbewahren können.",
      },
      {
        question: "Brauche ich ein Konto?",
        answer:
          "Nein. Sie können als Gast starten, den Brief prüfen und erst bei Versand bezahlen.",
      },
      {
        question: "Was kostet ein Einschreiben?",
        answer:
          "Der Preis setzt sich aus dem Einschreiben-Porto und einer transparenten Servicepauschale zusammen. Den genauen Total sehen Sie vor der Zahlung.",
      },
    ],
    related: ["wohnung-kuendigen", "brief-online-versenden", "beschwerde-schreiben"],
  },
  {
    slug: "krankenkasse-kuendigen",
    category: "Kündigung",
    metaTitle: "Krankenkasse kündigen & wechseln – Brief & Frist",
    metaDescription:
      "Grundversicherung bis 30. November kündigen und die Kasse wechseln. episto schreibt und versendet Ihre Kündigung – auf Wunsch als Einschreiben.",
    h1: "Krankenkasse kündigen und wechseln – fristgerecht zum Jahresende",
    quickAnswer:
      "Um Ihre Grundversicherung zu kündigen, senden Sie der Krankenkasse eine schriftliche Kündigung, die bis am 30. November bei ihr eintrifft; die Versicherung endet dann per 31. Dezember. Melden Sie sich gleichzeitig bei einer neuen Grundversicherung an – dort besteht Aufnahmepflicht. Ein Einschreiben sichert den Nachweis.",
    steps: [
      {
        title: "Neue Kasse zeitgleich wählen",
        text: "Melden Sie sich zeitgleich mit der Kündigung bei einer neuen Grundversicherung an. Dort gilt Aufnahmepflicht – jede Kasse muss Sie aufnehmen. Warten Sie mit dem Kündigen nicht auf eine Bestätigung.",
      },
      {
        title: "Kündigung verfassen",
        text: "Schreiben Sie eine Kündigung mit Versichertennummer, Namen und dem gewünschten Enddatum (31. Dezember). episto erstellt den Brief in Minuten.",
      },
      {
        title: "Rechtzeitig versenden",
        text: "Die Kündigung muss bis spätestens Ende November bei der Kasse eintreffen. Versenden Sie früh genug – idealerweise als Einschreiben.",
      },
      {
        title: "Bestätigung ablegen",
        text: "Bewahren Sie die Versandbestätigung und die Kündigungsbestätigung der Kasse auf.",
      },
    ],
    checklist: [
      "Versichertennummer und Geburtsdatum",
      "Vollständiger Name und Adresse",
      "Gewünschtes Enddatum (31. Dezember)",
      "Bezug auf die Grundversicherung",
      "Unterschrift",
    ],
    notes: [
      {
        title: "Frist: 30. November",
        body: "Die Kündigung der Grundversicherung muss bis am 30. November bei der Krankenkasse eingetroffen sein. Massgebend ist der Eingang, nicht der Poststempel – versenden Sie deshalb rechtzeitig, idealerweise bis Mitte November.",
      },
      {
        title: "Gleichzeitig anmelden – nicht auf Bestätigung warten",
        body: "Kündigen Sie fristgerecht und melden Sie sich gleichzeitig bei der neuen Kasse an. Warten Sie nicht auf eine Bestätigung, sonst verpassen Sie die Frist. Die alte Versicherung endet, sobald die lückenlose Deckung durch die neue Grundversicherung gemeldet ist.",
      },
    ],
    faqs: [
      {
        question: "Bis wann muss ich die Krankenkasse kündigen?",
        answer:
          "Die Kündigung muss bis am 30. November bei der Kasse eintreffen; die Versicherung endet dann per 31. Dezember. Massgebend ist der Eingang, nicht der Poststempel. Melden Sie sich gleichzeitig bei der neuen Kasse an.",
      },
      {
        question: "Muss ich per Einschreiben kündigen?",
        answer:
          "Ein Einschreiben ist nicht zwingend, wird aber empfohlen. Wegen der knappen Frist Ende November ist der nachweisbare Zugang besonders wichtig.",
      },
      {
        question: "Kann ich unterjährig wechseln?",
        answer:
          "Ein Wechsel der Grundversicherung ist in der Regel auf Ende Jahr möglich. Unter bestimmten Voraussetzungen, etwa bei einer Prämienerhöhung, bestehen zusätzliche Kündigungsmöglichkeiten.",
      },
      {
        question: "Schreibt episto die Kündigung für mich?",
        answer:
          "Ja. Sie geben Ihre Angaben ein, episto formuliert die Kündigung und versendet sie – auf Wunsch als Einschreiben mit Zustellnachweis.",
      },
    ],
    related: ["versicherung-kuendigen", "abo-kuendigen", "einschreiben-online"],
  },
  {
    slug: "abo-kuendigen",
    category: "Kündigung",
    metaTitle: "Abo kündigen in der Schweiz – Vorlage & Versand",
    metaDescription:
      "Streaming-, Magazin- oder Mitglieder-Abo korrekt kündigen: Frist, Laufzeit und Nachweis prüfen. episto schreibt und versendet Ihre Kündigung – sicher per Post.",
    h1: "Abo kündigen: Vertrag rechtzeitig und nachweisbar beenden",
    quickAnswer:
      "Wenn Sie ein Abo kündigen, prüfen Sie zuerst Laufzeit, Kündigungsfrist und die verlangte Form in Vertrag oder AGB. Nennen Sie Kundennummer und gewünschtes Enddatum und verlangen Sie eine Bestätigung. In der Schweiz besteht bei Online-Abschlüssen kein allgemeines Widerrufsrecht. episto formuliert Ihre Kündigung und versendet sie für Sie.",
    steps: [
      {
        title: "Vertrag und AGB prüfen",
        text: "Suchen Sie Mindestlaufzeit, Kündigungsfrist, Kündigungstermin und die zugelassene Form in Ihrer Bestätigung oder in den aktuellen AGB.",
      },
      {
        title: "Vertragsangaben sammeln",
        text: "Halten Sie Anbieteradresse, Kunden- oder Mitgliedsnummer, Produktname und das gewünschte Vertragsende bereit.",
      },
      {
        title: "Kündigung klar formulieren",
        text: "Kündigen Sie auf den nächstmöglichen Termin und bitten Sie um eine schriftliche Bestätigung. episto erstellt daraus einen sauberen Brief.",
      },
      {
        title: "Fristgerecht versenden",
        text: "Senden Sie die Kündigung rechtzeitig und bei wichtigen oder teuren Abos nachweisbar. episto übernimmt Druck und Postversand.",
      },
    ],
    checklist: [
      "Vollständiger Name und Adresse",
      "Anbieter und Empfängeradresse",
      "Kunden-, Vertrags- oder Mitgliedsnummer",
      "Abo-Bezeichnung und gewünschter Kündigungstermin",
      "Bitte um schriftliche Kündigungsbestätigung",
    ],
    notes: [
      {
        title: "Vertrag und AGB sind entscheidend",
        body: "Für Streaming-, Magazin- und Mitglieder-Abos gelten häufig unterschiedliche Laufzeiten und Kündigungswege. Prüfen Sie auch, ob sich der Vertrag automatisch verlängert.",
      },
      {
        title: "Kein allgemeines Online-Widerrufsrecht",
        body: "Das Schweizer Recht kennt bei Internetkäufen kein allgemeines Widerrufsrecht. Ein Anbieter kann ein solches Recht freiwillig in seinen AGB einräumen.",
      },
    ],
    faqs: [
      {
        question: "Wie kann ich mein Abo kündigen?",
        answer:
          "Prüfen Sie Frist und Form im Vertrag, nennen Sie Ihre Vertragsdaten und kündigen Sie eindeutig auf den nächstmöglichen Termin. Lassen Sie sich das Vertragsende schriftlich bestätigen.",
      },
      {
        question: "Kann ich ein online abgeschlossenes Abo widerrufen?",
        answer:
          "In der Schweiz gibt es für Online-Abschlüsse kein allgemeines Widerrufsrecht. Massgebend ist, ob der Anbieter in den AGB freiwillig eine Rücktritts- oder Testfrist gewährt.",
      },
      {
        question: "Was passiert, wenn ich die Kündigungsfrist verpasse?",
        answer:
          "Das Abo läuft je nach Vertrag weiter oder verlängert sich. Kündigen Sie trotzdem sofort auf den nächstmöglichen Termin und bitten Sie den Anbieter allenfalls um eine kulante frühere Auflösung.",
      },
      {
        question: "Soll ich ein Abo per Einschreiben kündigen?",
        answer:
          "Ein Einschreiben ist häufig nicht vorgeschrieben, kann aber bei hohen Kosten, knappen Fristen oder unklarer Bestätigung sinnvoll sein, weil Sie den Versand nachweisen können.",
      },
    ],
    related: ["handyabo-kuendigen", "fitnessabo-kuendigen", "einschreiben-online"],
  },
  {
    slug: "arbeitsvertrag-kuendigen",
    category: "Kündigung",
    metaTitle: "Arbeitsvertrag kündigen – Brief, Frist & Versand",
    metaDescription:
      "Arbeitsvertrag in der Schweiz korrekt kündigen: Frist, Enddatum und Zustellung beachten. episto formuliert und versendet Ihre Kündigung – auch als Einschreiben.",
    h1: "Arbeitsvertrag kündigen: korrekt und professionell vorgehen",
    quickAnswer:
      "Wenn Sie Ihren Arbeitsvertrag kündigen, prüfen Sie Vertrag und allfälligen Gesamtarbeitsvertrag auf Kündigungsfrist und Termin. Die Kündigung muss dem Arbeitgeber rechtzeitig zugehen; schriftlich ist sie aus Beweisgründen meist sinnvoll. Nennen Sie das Enddatum und bitten Sie um Bestätigung sowie Arbeitszeugnis. episto formuliert und versendet Ihre Kündigung.",
    steps: [
      {
        title: "Kündigungsregeln prüfen",
        text: "Lesen Sie Arbeitsvertrag, Personalreglement und allfälligen Gesamtarbeitsvertrag. Entscheidend sind Kündigungsfrist, zulässiger Termin und eine vereinbarte Schriftform.",
      },
      {
        title: "Letzten Arbeitstag bestimmen",
        text: "Berechnen Sie das Vertragsende und berücksichtigen Sie, wann die Kündigung beim Arbeitgeber eintreffen muss. Klären Sie Ferien und Überstunden separat.",
      },
      {
        title: "Kündigung verfassen",
        text: "Formulieren Sie kurz, eindeutig und professionell. Eine Begründung ist bei einer ordentlichen Eigenkündigung in der Regel nicht nötig.",
      },
      {
        title: "Zugang dokumentieren",
        text: "Übergeben Sie den Brief gegen Empfangsbestätigung oder versenden Sie ihn nachweisbar. episto übernimmt auf Wunsch den Versand als Einschreiben.",
      },
    ],
    checklist: [
      "Name und Adresse von Arbeitnehmer und Arbeitgeber",
      "Datum und klarer Kündigungssatz",
      "Gewünschtes Ende des Arbeitsverhältnisses",
      "Bitte um Kündigungsbestätigung und Arbeitszeugnis",
      "Eigenhändige Unterschrift bei verlangter Schriftform",
    ],
    notes: [
      {
        title: "Der rechtzeitige Zugang zählt",
        body: "Die Kündigung sollte vor Beginn der Kündigungsfrist beim Arbeitgeber eintreffen. Das Absendedatum allein genügt für den Fristnachweis in der Regel nicht.",
      },
      {
        title: "Vertrag und GAV können abweichen",
        body: "Kündigungsfristen hängen unter anderem von Probezeit, Dienstjahren und vertraglichen Regeln ab. Befristete Verträge enden häufig ohne ordentliche Kündigung, sofern nichts anderes vereinbart ist.",
      },
    ],
    faqs: [
      {
        question: "Wie muss ich meinen Arbeitsvertrag kündigen?",
        answer:
          "Kündigen Sie eindeutig und rechtzeitig auf den vertraglich zulässigen Termin. Eine schriftliche, unterschriebene Kündigung mit Zustellnachweis ist besonders sinnvoll, wenn der Vertrag Schriftform verlangt.",
      },
      {
        question: "Welche Kündigungsfrist gilt für meinen Job?",
        answer:
          "Prüfen Sie zuerst Arbeitsvertrag, Personalreglement und GAV. Fehlt eine abweichende Regel, richtet sich die Frist in der Regel nach Probezeit und Dauer des Arbeitsverhältnisses.",
      },
      {
        question: "Muss ich meine Eigenkündigung begründen?",
        answer:
          "Bei einer ordentlichen Kündigung müssen Arbeitnehmerinnen und Arbeitnehmer normalerweise keinen Grund nennen. Ein kurzer Dank kann den professionellen Ton wahren, ist aber freiwillig.",
      },
      {
        question: "Kann episto auch um ein Arbeitszeugnis bitten?",
        answer:
          "Ja. episto kann die Bitte um ein qualifiziertes Arbeitszeugnis und eine schriftliche Bestätigung des Austrittsdatums direkt in die Kündigung aufnehmen.",
      },
    ],
    related: ["abo-kuendigen", "einschreiben-online", "brief-an-behoerde"],
  },
  {
    slug: "versicherung-kuendigen",
    category: "Kündigung",
    metaTitle: "Versicherung kündigen – Brief, Frist & Versand",
    metaDescription:
      "Zusatz-, Hausrat- oder Haftpflichtversicherung korrekt kündigen: Police, Frist und Versicherungsjahr prüfen. episto schreibt und versendet den Brief sicher.",
    h1: "Versicherung kündigen: Police fristgerecht beenden",
    quickAnswer:
      "Wenn Sie eine Versicherung kündigen, prüfen Sie Police und Versicherungsbedingungen auf Laufzeit, Kündigungsfrist und Ende des Versicherungsjahres. Nennen Sie Policennummer und gewünschten Termin und lassen Sie sich die Auflösung bestätigen. Bei einem Wechsel sollte die neue Deckung vorher gesichert sein. episto formuliert Ihre Kündigung und versendet sie nachweisbar.",
    steps: [
      {
        title: "Police und Bedingungen lesen",
        text: "Prüfen Sie Vertragsdauer, Versicherungsjahr, Kündigungsfrist und mögliche besondere Kündigungsrechte in Police und Allgemeinen Versicherungsbedingungen.",
      },
      {
        title: "Neue Deckung abstimmen",
        text: "Wenn der Schutz weiter nötig ist, holen Sie zuerst eine verbindliche Aufnahmebestätigung der neuen Versicherung ein.",
      },
      {
        title: "Kündigung erstellen",
        text: "Nennen Sie Versicherungsart, Policennummer und Endtermin. episto formuliert daraus eine klare, formelle Kündigung.",
      },
      {
        title: "Rechtzeitig zustellen",
        text: "Planen Sie den Postweg ein und bewahren Sie Versand- und Kündigungsbestätigung auf. episto versendet auf Wunsch als Einschreiben.",
      },
    ],
    checklist: [
      "Name und Adresse der versicherten Person",
      "Versicherungsgesellschaft und Empfängeradresse",
      "Policen- oder Vertragsnummer",
      "Versicherungsart und gewünschtes Enddatum",
      "Bitte um schriftliche Bestätigung",
    ],
    notes: [
      {
        title: "Versicherungsjahr ist nicht immer Kalenderjahr",
        body: "Das Vertragsende kann von Police zu Police variieren. Prüfen Sie deshalb das konkrete Versicherungsjahr und die Kündigungsfrist statt pauschal vom 31. Dezember auszugehen.",
      },
      {
        title: "Zusatz- und Grundversicherung trennen",
        body: "Für Krankenzusatzversicherungen gelten andere Regeln als für die obligatorische Grundversicherung. Kündigen Sie eine Zusatzversicherung erst, wenn eine gewünschte neue Deckung bestätigt ist.",
      },
    ],
    faqs: [
      {
        question: "Wie kann ich meine Versicherung kündigen?",
        answer:
          "Prüfen Sie Police und Versicherungsbedingungen, nennen Sie Policennummer und Endtermin und senden Sie die Kündigung so früh, dass sie innerhalb der vereinbarten Frist eintrifft.",
      },
      {
        question: "Wann endet das Versicherungsjahr?",
        answer:
          "Das Versicherungsjahr entspricht nicht zwingend dem Kalenderjahr. Das massgebende Datum finden Sie in der Police, der letzten Prämienrechnung oder den Versicherungsbedingungen.",
      },
      {
        question: "Kann ich nach einem Schadenfall kündigen?",
        answer:
          "Je nach Versicherungsart und Bedingungen kann nach einem erledigten Schadenfall ein besonderes Kündigungsrecht bestehen. Prüfen Sie dafür die Police und reagieren Sie innerhalb der dort genannten Frist.",
      },
      {
        question: "Muss ich eine neue Versicherung vor der Kündigung haben?",
        answer:
          "Wenn Sie den Schutz weiterhin benötigen, ist das sehr empfehlenswert. Besonders bei Zusatzversicherungen ist eine neue Aufnahme nicht garantiert; vermeiden Sie deshalb eine unbeabsichtigte Deckungslücke.",
      },
    ],
    related: ["krankenkasse-kuendigen", "abo-kuendigen", "einschreiben-online"],
  },
  {
    slug: "handyabo-kuendigen",
    category: "Kündigung",
    metaTitle: "Handyabo kündigen – Vorlage, Frist & Versand",
    metaDescription:
      "Handy- oder Internetabo korrekt kündigen: Mindestlaufzeit, Frist, Rufnummer und Gerätegebühren prüfen. episto schreibt und versendet die Kündigung sicher.",
    h1: "Handyabo kündigen: Frist, Rufnummer und Wechsel im Griff",
    quickAnswer:
      "Wenn Sie ein Handyabo kündigen, prüfen Sie Mindestvertragsdauer, Kündigungsfrist und mögliche Restkosten für Geräte oder Rabatte. Geben Sie Kunden- und Rufnummer sowie den gewünschten Endtermin an. Bei einem Anbieterwechsel sollte die Rufnummernportierung abgestimmt sein. episto formuliert Ihre Kündigung und versendet sie für Sie.",
    steps: [
      {
        title: "Vertragslaufzeit prüfen",
        text: "Kontrollieren Sie Mindestdauer, Kündigungsfrist, Verlängerung und mögliche Gebühren bei vorzeitiger Auflösung in Vertrag oder Kundenkonto.",
      },
      {
        title: "Wechsel und Nummer planen",
        text: "Klären Sie mit dem neuen Anbieter, ob und wann Ihre Rufnummer portiert wird. Kündigen Sie nicht doppelt, wenn der neue Anbieter den Wechsel übernimmt.",
      },
      {
        title: "Kündigung formulieren",
        text: "Nennen Sie Kunden-, Vertrags- und Rufnummer sowie den gewünschten Termin. episto erstellt einen eindeutigen Kündigungsbrief.",
      },
      {
        title: "Bestätigung kontrollieren",
        text: "Prüfen Sie das bestätigte Enddatum, offene Gerätezahlungen und Rückgabepflichten. Bewahren Sie Versand- und Anbieterbestätigung auf.",
      },
    ],
    checklist: [
      "Vollständiger Name und Rechnungsadresse",
      "Kunden- und Vertragsnummer",
      "Betroffene Mobil- oder Festnetznummer",
      "Gewünschter Kündigungstermin",
      "Hinweis zur Rufnummernportierung und Bestätigungswunsch",
    ],
    notes: [
      {
        title: "Mindestlaufzeit und Restkosten",
        body: "Eine Kündigung vor Ablauf der Mindestdauer kann Kosten auslösen. Prüfen Sie auch Raten für ein Gerät, gewährte Rabatte und allfällige Rückgabepflichten.",
      },
      {
        title: "Portierung mit neuem Anbieter abstimmen",
        body: "Wer die Rufnummer behalten möchte, sollte den Wechselprozess zuerst mit dem neuen Anbieter klären. Eine unkoordinierte Kündigung kann die Portierung erschweren.",
      },
    ],
    faqs: [
      {
        question: "Wie kann ich mein Handyabo kündigen?",
        answer:
          "Prüfen Sie Laufzeit und Kündigungsfrist, nennen Sie Kunden- und Rufnummer und kündigen Sie auf den nächstmöglichen Termin. Verlangen Sie eine Bestätigung mit Enddatum.",
      },
      {
        question: "Kann ich mein Handyabo vorzeitig beenden?",
        answer:
          "Das hängt vom Vertrag ab. Häufig werden bei einer vorzeitigen Auflösung Restgebühren, Gerätebeträge oder entfallende Rabatte fällig; lassen Sie sich die Kosten vorab beziffern.",
      },
      {
        question: "Wie behalte ich meine Handynummer?",
        answer:
          "Beauftragen Sie den neuen Anbieter mit der Portierung und stimmen Sie den Termin ab. Klären Sie, ob er die Kündigung übernimmt, bevor Sie selbst ein Schreiben versenden.",
      },
      {
        question: "Was kann ich bei Streit mit dem Anbieter tun?",
        answer:
          "Reklamieren Sie zuerst schriftlich beim Anbieter und dokumentieren Sie Vertrag, Rechnungen und Antworten. Bleibt der Konflikt ungelöst, kommt häufig die Schlichtungsstelle ombudscom infrage.",
      },
    ],
    related: ["abo-kuendigen", "beschwerde-schreiben", "einschreiben-online"],
  },
  {
    slug: "fitnessabo-kuendigen",
    category: "Kündigung",
    metaTitle: "Fitnessabo kündigen – Brief, Frist & Versand",
    metaDescription:
      "Fitnessabo korrekt kündigen: Laufzeit, Verlängerung, Frist und Sonderfälle prüfen. episto formuliert und versendet Ihre Kündigung sicher und bequem per Post.",
    h1: "Fitnessabo kündigen: Mitgliedschaft fristgerecht beenden",
    quickAnswer:
      "Wenn Sie ein Fitnessabo kündigen, prüfen Sie Vertrag und AGB auf Mindestlaufzeit, automatische Verlängerung, Kündigungsfrist und verlangte Form. Nennen Sie Mitgliedsnummer und gewünschten Endtermin. Krankheit oder Umzug führen nicht automatisch zur Vertragsauflösung; oft gelten besondere Bedingungen. episto formuliert Ihre Kündigung und versendet sie nachweisbar.",
    steps: [
      {
        title: "Laufzeit und Frist prüfen",
        text: "Lesen Sie Vertrag und AGB und notieren Sie Mindestlaufzeit, Verlängerungsregel, Kündigungsfrist und zulässigen Kündigungsweg.",
      },
      {
        title: "Sonderfall belegen",
        text: "Falls Sie wegen Krankheit, Umzug oder einer Leistungsänderung kündigen, prüfen Sie die Vertragsregel und legen Sie den verlangten Nachweis bei.",
      },
      {
        title: "Kündigungsbrief erstellen",
        text: "Nennen Sie Mitgliedsnummer, Standort und gewünschten Endtermin. episto formuliert das Schreiben klar und höflich.",
      },
      {
        title: "Bestätigung sichern",
        text: "Versenden Sie rechtzeitig und verlangen Sie das Vertragsende schriftlich. Bei knapper Frist empfiehlt sich ein nachweisbarer Versand.",
      },
    ],
    checklist: [
      "Name, Adresse und Geburtsdatum",
      "Mitglieds- oder Vertragsnummer",
      "Fitnesscenter und betroffener Standort",
      "Gewünschter Kündigungstermin",
      "Allfälliger Nachweis für einen besonderen Kündigungsgrund",
    ],
    notes: [
      {
        title: "Automatische Verlängerung beachten",
        body: "Fitnessverträge verlängern sich je nach AGB häufig, wenn nicht rechtzeitig gekündigt wird. Massgebend sind die Bedingungen, die beim Abschluss vereinbart wurden.",
      },
      {
        title: "Krankheit oder Umzug separat prüfen",
        body: "Ein vorzeitiges Ende ist nicht in jedem Fall geschuldet. Manche Studios sehen bei dauerhafter Krankheit oder grosser Distanz Kulanz, Pausen oder Sonderregeln mit Nachweis vor.",
      },
    ],
    faqs: [
      {
        question: "Wie kann ich mein Fitnessabo kündigen?",
        answer:
          "Prüfen Sie Vertrag und AGB, nennen Sie Mitgliedsnummer und Endtermin und senden Sie die Kündigung innerhalb der vereinbarten Frist in der verlangten Form.",
      },
      {
        question: "Kann ich wegen Krankheit vorzeitig kündigen?",
        answer:
          "Das hängt von Vertrag, Dauer der Einschränkung und den AGB ab. Häufig verlangt das Fitnesscenter ein ärztliches Zeugnis und bietet eine Auflösung oder Sistierung an.",
      },
      {
        question: "Kann ich bei einem Umzug aus dem Vertrag aussteigen?",
        answer:
          "Ein Umzug berechtigt nicht automatisch zur Kündigung. Prüfen Sie, ob die AGB eine Distanzregel enthalten, und bitten Sie andernfalls mit einem Wohnsitznachweis um Kulanz.",
      },
      {
        question: "Was mache ich, wenn das Studio die Kündigung nicht bestätigt?",
        answer:
          "Fragen Sie schriftlich nach und legen Sie Ihren Versandnachweis bei. Bei knappen Fristen oder strittiger Zustellung kann ein Einschreiben zusätzlichen Beweis schaffen.",
      },
    ],
    related: ["abo-kuendigen", "einschreiben-online", "beschwerde-schreiben"],
  },
  {
    slug: "beschwerde-schreiben",
    category: "Reklamation",
    metaTitle: "Beschwerde schreiben – Vorlage für die Schweiz",
    metaDescription:
      "Eine sachliche Beschwerde schreiben, Forderung klar nennen und Belege beifügen. episto formuliert und versendet Ihren Reklamationsbrief – auch als Einschreiben.",
    h1: "Beschwerde schreiben: sachlich, klar und überzeugend",
    quickAnswer:
      "Wenn Sie eine Beschwerde schreiben, schildern Sie den Vorfall chronologisch, nennen Sie Vertrag, Bestellung oder Rechnung und formulieren Sie eine konkrete Lösung. Belegen Sie Ihre Darstellung mit relevanten Unterlagen und setzen Sie bei Bedarf eine angemessene Antwortfrist. episto macht daraus einen professionellen Beschwerdebrief und versendet ihn für Sie.",
    steps: [
      {
        title: "Sachverhalt ordnen",
        text: "Notieren Sie Datum, Beteiligte, versprochene Leistung und was tatsächlich passiert ist. Trennen Sie überprüfbare Fakten von Ihrer Bewertung.",
      },
      {
        title: "Lösung festlegen",
        text: "Entscheiden Sie, was Sie konkret erwarten: Korrektur, Ersatz, Rückzahlung, Erklärung oder eine andere angemessene Lösung.",
      },
      {
        title: "Beschwerde verfassen",
        text: "Bleiben Sie höflich und bestimmt, nennen Sie Belege und setzen Sie bei Bedarf eine realistische Antwortfrist. episto strukturiert den Brief.",
      },
      {
        title: "Versand dokumentieren",
        text: "Fügen Sie nur nötige Kopien bei und bewahren Sie Schreiben und Versandnachweis auf. Bei wichtigen Forderungen ist ein Einschreiben sinnvoll.",
      },
    ],
    checklist: [
      "Vollständige Absender- und Empfängeradresse",
      "Klarer Betreff mit Kunden-, Bestell- oder Rechnungsnummer",
      "Chronologische und sachliche Schilderung",
      "Konkrete gewünschte Lösung und Antwortfrist",
      "Relevante Belege als Kopie oder PDF",
    ],
    notes: [
      {
        title: "Fakten statt Vorwürfe",
        body: "Eine präzise Chronologie, konkrete Daten und nachvollziehbare Belege wirken meist stärker als pauschale Vorwürfe oder emotionale Formulierungen.",
      },
      {
        title: "Eskalationsweg prüfen",
        body: "Viele Branchen kennen Ombuds- oder Schlichtungsstellen. Häufig müssen Sie zuerst erfolglos direkt beim Unternehmen reklamiert haben und Ihre Korrespondenz belegen können.",
      },
    ],
    faqs: [
      {
        question: "Wie kann ich eine wirksame Beschwerde schreiben?",
        answer:
          "Beschreiben Sie den Sachverhalt knapp und chronologisch, nennen Sie Referenzen und Belege und verlangen Sie eine konkrete, angemessene Lösung innerhalb einer realistischen Frist.",
      },
      {
        question: "Wie formuliere ich eine Beschwerde höflich, aber bestimmt?",
        answer:
          "Verwenden Sie neutrale Tatsachen, vermeiden Sie persönliche Angriffe und schreiben Sie klar, welche Korrektur Sie erwarten. Ein ruhiger Ton erhöht die Chance auf eine konstruktive Antwort.",
      },
      {
        question: "Welche Belege sollte ich beifügen?",
        answer:
          "Geeignet sind etwa Vertrag, Bestellbestätigung, Rechnung, Fotos und bisherige Korrespondenz. Versenden Sie grundsätzlich Kopien und bewahren Sie Originale bei sich auf.",
      },
      {
        question: "Muss eine Beschwerde per Einschreiben versendet werden?",
        answer:
          "Nein, nicht immer. Bei hohen Beträgen, laufenden Fristen oder einer möglichen Eskalation ist ein nachweisbarer Versand jedoch häufig sinnvoll.",
      },
    ],
    related: ["einsprache-erheben", "mahnung-schreiben", "einschreiben-online"],
  },
  {
    slug: "mahnung-schreiben",
    category: "Forderung",
    metaTitle: "Mahnung schreiben – Zahlung wirksam einfordern",
    metaDescription:
      "Eine klare Mahnung mit Rechnungsbezug, offenem Betrag und neuer Zahlungsfrist schreiben. episto formuliert und versendet Ihren Brief – auch als Einschreiben.",
    h1: "Mahnung schreiben: offene Zahlung professionell einfordern",
    quickAnswer:
      "Wenn Sie eine Mahnung schreiben, nennen Sie Rechnung, offenen Betrag, ursprüngliche Fälligkeit und eine neue angemessene Zahlungsfrist. Formulieren Sie sachlich, geben Sie die Zahlungsverbindung an und kündigen Sie weitere Schritte nur an, wenn Sie diese prüfen und umsetzen wollen. episto erstellt Ihre Mahnung und versendet sie nachweisbar.",
    steps: [
      {
        title: "Forderung kontrollieren",
        text: "Prüfen Sie Vertrag, Rechnung, Fälligkeit, bisherige Zahlungen und die korrekte Adresse der Schuldnerin oder des Schuldners.",
      },
      {
        title: "Neue Frist bestimmen",
        text: "Setzen Sie ein konkretes, angemessenes Zahlungsdatum und entscheiden Sie, ob Sie zunächst freundlich erinnern oder bereits formell mahnen.",
      },
      {
        title: "Mahnung verfassen",
        text: "Führen Sie Betrag, Rechnungsnummer, Fälligkeit und Zahlungsangaben klar auf. episto formuliert das Schreiben professionell und bestimmt.",
      },
      {
        title: "Versand und Reaktion festhalten",
        text: "Dokumentieren Sie Versand, Zahlungseingang und Antworten. Bei einer letzten Mahnung oder grösseren Forderung empfiehlt sich ein Einschreiben.",
      },
    ],
    checklist: [
      "Vollständige Namen und Adressen beider Parteien",
      "Rechnungsnummer, Rechnungsdatum und Leistung",
      "Offener Betrag und ursprüngliche Fälligkeit",
      "Konkrete neue Zahlungsfrist",
      "IBAN oder andere eindeutige Zahlungsangaben",
    ],
    notes: [
      {
        title: "Verzug hängt von der Fälligkeit ab",
        body: "Ob eine Mahnung nötig ist, um die zahlungspflichtige Person in Verzug zu setzen, hängt unter anderem davon ab, ob ein bestimmter Zahlungstermin vereinbart war. Prüfen Sie den Einzelfall.",
      },
      {
        title: "Gebühren und Zinsen nicht pauschal erfinden",
        body: "Mahngebühren sollten vertraglich vereinbart und angemessen sein. Verzugszins und weitere Kosten hängen von Vereinbarung und Rechtslage ab; führen Sie nur nachvollziehbare Beträge auf.",
      },
    ],
    faqs: [
      {
        question: "Wie muss ich eine Mahnung schreiben?",
        answer:
          "Nennen Sie die konkrete Rechnung, den offenen Betrag, die Fälligkeit und ein neues Zahlungsdatum. Ergänzen Sie Zahlungsangaben und bitten Sie um Rückmeldung, falls bereits bezahlt wurde.",
      },
      {
        question: "Welche Zahlungsfrist soll ich in der Mahnung setzen?",
        answer:
          "Die Frist sollte realistisch und als konkretes Datum angegeben sein. Was angemessen ist, hängt von Betrag, bisherigem Kontakt und den Umständen der Forderung ab.",
      },
      {
        question: "Darf ich Mahngebühren und Verzugszins verlangen?",
        answer:
          "Das ist nicht automatisch in jeder Höhe zulässig. Prüfen Sie Vertrag, AGB und die konkrete Rechtslage und weisen Sie nur Beträge aus, die nachvollziehbar begründet sind.",
      },
      {
        question: "Wann sollte ich eine Mahnung per Einschreiben senden?",
        answer:
          "Ein Einschreiben ist besonders bei einer letzten Zahlungsaufforderung, hohen Beträgen oder einer später möglichen Betreibung sinnvoll, weil Sie den Versand dokumentieren können.",
      },
    ],
    related: ["einschreiben-online", "beschwerde-schreiben", "brief-online-versenden"],
  },
  {
    slug: "einsprache-erheben",
    category: "Fristbrief",
    metaTitle: "Einsprache erheben – Frist & Brief für die Schweiz",
    metaDescription:
      "Einsprache gegen Rechnung, Entscheid oder Verfügung erheben: Frist, zuständige Stelle, Begründung und Belege prüfen. episto erstellt den Brief korrekt.",
    h1: "Einsprache erheben: fristgerecht und nachvollziehbar reagieren",
    quickAnswer:
      "Wenn Sie Einsprache erheben, prüfen Sie zuerst, welches Rechtsmittel zulässig ist, welche Stelle zuständig ist und wann die Frist endet. Bezeichnen Sie den angefochtenen Entscheid genau, stellen Sie einen klaren Antrag und begründen Sie ihn mit Belegen. Bei Rechnungen genügt häufig ein schriftlicher Einwand. episto formuliert und versendet Ihr Schreiben.",
    steps: [
      {
        title: "Rechtsmittel und Frist prüfen",
        text: "Lesen Sie Entscheid, Verfügung oder Rechnung vollständig. Eine Rechtsmittelbelehrung nennt häufig Verfahren, zuständige Stelle, Form und Frist.",
      },
      {
        title: "Antrag und Gründe ordnen",
        text: "Halten Sie fest, was geändert oder aufgehoben werden soll und welche Tatsachen, Unterlagen oder Berechnungen Ihren Standpunkt stützen.",
      },
      {
        title: "Schreiben verfassen",
        text: "Bezeichnen Sie das Dokument mit Datum und Aktenzeichen und formulieren Sie Antrag und Begründung klar. episto strukturiert den Brief.",
      },
      {
        title: "Fristgerecht einreichen",
        text: "Unterschreiben Sie das Schreiben, fügen Sie Belege bei und versenden Sie es nachweisbar an die richtige Stelle. Bewahren Sie eine vollständige Kopie auf.",
      },
    ],
    checklist: [
      "Zuständige Empfänger- oder Rechtsmittelstelle",
      "Datum, Aktenzeichen und Bezeichnung des Entscheids",
      "Klarer Antrag: was soll geändert werden?",
      "Nachvollziehbare Begründung mit Belegen",
      "Datum, Unterschrift und fristgerechter Versandnachweis",
    ],
    notes: [
      {
        title: "Nicht jedes Schreiben heisst Einsprache",
        body: "Je nach Dokument kann Einsprache, Beschwerde, Rekurs oder ein einfacher Einwand vorgesehen sein. Verwenden Sie das Verfahren und die Stelle aus der Rechtsmittelbelehrung.",
      },
      {
        title: "Fristen sofort sichern",
        body: "Rechtsmittelfristen können kurz sein und lassen sich häufig nicht verlängern. Prüfen Sie Beginn, Ende und formelle Anforderungen sofort nach Erhalt des Dokuments.",
      },
    ],
    faqs: [
      {
        question: "Wie kann ich Einsprache erheben?",
        answer:
          "Befolgen Sie die Rechtsmittelbelehrung, bezeichnen Sie den angefochtenen Entscheid, stellen Sie einen klaren Antrag und reichen Sie Begründung, Unterschrift und Belege fristgerecht bei der zuständigen Stelle ein.",
      },
      {
        question: "Wie lange ist die Einsprachefrist?",
        answer:
          "Die Frist hängt vom Verfahren und der Behörde ab. Massgebend sind das anwendbare Verfahren und die Rechtsmittelbelehrung auf dem konkreten Entscheid; prüfen Sie diese sofort.",
      },
      {
        question: "Kann ich gegen eine falsche Rechnung Einsprache machen?",
        answer:
          "Bei einer privaten Rechnung handelt es sich meist nicht um eine formelle Einsprache, sondern um einen schriftlichen Einwand oder eine Beanstandung. Nennen Sie die bestrittenen Positionen und Ihre Gründe.",
      },
      {
        question: "Reicht ein kurzer Brief ohne Begründung?",
        answer:
          "Das hängt von den Verfahrensregeln ab und kann riskant sein. Reichen Sie nach Möglichkeit einen klaren Antrag und eine nachvollziehbare Begründung samt Belegen innerhalb der Frist ein.",
      },
    ],
    related: ["brief-an-behoerde", "beschwerde-schreiben", "einschreiben-online"],
  },
  {
    slug: "mietzins-senken",
    category: "Mietrecht",
    metaTitle: "Mietzins senken – Senkungsbegehren schreiben",
    metaDescription:
      "Mietzinssenkung wegen tieferem Referenzzinssatz verlangen: Grundlage, Termin und Fristen prüfen. episto schreibt Ihr Begehren und versendet es per Post.",
    h1: "Mietzins senken: Senkungsbegehren korrekt stellen",
    quickAnswer:
      "Wer den Mietzins senken will, vergleicht den Referenzzinssatz, auf dem der aktuelle Mietzins beruht, mit dem heute massgebenden Stand. Besteht grundsätzlich ein Anspruch, stellen Sie der Vermieterschaft ein schriftliches Senkungsbegehren auf den nächstmöglichen Kündigungstermin. Weitere Kostenfaktoren können die Reduktion beeinflussen. episto formuliert und versendet Ihr Begehren.",
    steps: [
      {
        title: "Ausgangslage bestimmen",
        text: "Prüfen Sie Mietvertrag und letzte Mietzinsanpassung. Dort ist häufig vermerkt, welcher Referenzzinssatz dem aktuellen Nettomietzins zugrunde liegt.",
      },
      {
        title: "Anspruch grob berechnen",
        text: "Vergleichen Sie den damaligen mit dem aktuellen Referenzzinssatz und berücksichtigen Sie mögliche Gegenfaktoren wie Teuerung oder allgemeine Kostensteigerungen.",
      },
      {
        title: "Senkungsbegehren verfassen",
        text: "Verlangen Sie die Anpassung des Nettomietzinses auf den nächstmöglichen Termin und bitten Sie um eine nachvollziehbare Berechnung. episto erstellt den Brief.",
      },
      {
        title: "Antwort und Fristen überwachen",
        text: "Versenden Sie möglichst als Einschreiben und notieren Sie das Versanddatum. Prüfen Sie eine Ablehnung oder Gegenrechnung rechtzeitig.",
      },
    ],
    checklist: [
      "Vollständige Adresse der Mietparteien und Vermieterschaft",
      "Adresse des Mietobjekts",
      "Aktueller Nettomietzins",
      "Massgebender bisheriger und aktueller Referenzzinssatz",
      "Verlangter Anpassungstermin und Bitte um Bestätigung",
    ],
    notes: [
      {
        title: "Der Referenzzinssatz ist massgebend",
        body: "Für laufende Mietverhältnisse zählt der hypothekarische Referenzzinssatz, nicht direkt der Leitzins der Nationalbank. Ausgangspunkt ist meist der Stand bei Vertragsabschluss oder letzter Anpassung.",
      },
      {
        title: "Antwort- und Schlichtungsfristen beachten",
        body: "Die Vermieterschaft muss in der Regel innert 30 Tagen antworten. Bei Ablehnung oder ausbleibender Antwort gelten kurze Fristen für den Gang an die Schlichtungsbehörde; prüfen Sie diese umgehend.",
      },
    ],
    faqs: [
      {
        question: "Wie kann ich meinen Mietzins senken?",
        answer:
          "Prüfen Sie den für Ihren Mietzins massgebenden Referenzzinssatz und stellen Sie der Vermieterschaft schriftlich ein begründetes Senkungsbegehren auf den nächstmöglichen Kündigungstermin.",
      },
      {
        question: "Führt jeder tiefere Referenzzinssatz zu einer Mietzinssenkung?",
        answer:
          "Nicht zwingend. Entscheidend ist der Stand, auf dem Ihr aktueller Mietzins beruht; zudem kann die Vermieterschaft je nach Fall Teuerung oder Kostensteigerungen gegenrechnen.",
      },
      {
        question: "Ab wann gilt die Mietzinssenkung?",
        answer:
          "Eine Senkung wirkt in der Regel nicht rückwirkend, sondern frühestens auf einen zulässigen künftigen Kündigungstermin. Senden Sie das Begehren deshalb rechtzeitig vor Beginn der Kündigungsfrist.",
      },
      {
        question: "Was tun, wenn die Vermieterschaft ablehnt?",
        answer:
          "Prüfen Sie Begründung und Berechnung sofort. Wenn Sie nicht einverstanden sind oder keine Antwort erhalten, können Sie innert der massgebenden Frist die zuständige Schlichtungsbehörde anrufen.",
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
    category: "Behördenbrief",
    metaTitle: "Brief an Behörde schreiben & online versenden",
    metaDescription:
      "Einen klaren Brief an Amt, Gemeinde oder Verwaltung schreiben: Aktenzeichen, Antrag, Frist und Belege richtig aufführen. episto hilft beim sicheren Versand.",
    h1: "Brief an Behörde schreiben: klar, vollständig und fristgerecht",
    quickAnswer:
      "Wenn Sie einen Brief an eine Behörde schreiben, nennen Sie die zuständige Stelle, Ihre Personalien und ein vorhandenes Aktenzeichen. Formulieren Sie Ihr Anliegen oder Ihren Antrag eindeutig, begründen Sie ihn knapp und fügen Sie verlangte Belege bei. Beachten Sie Fristen und Formvorgaben. episto erstellt und versendet Ihren Behördenbrief.",
    steps: [
      {
        title: "Zuständigkeit klären",
        text: "Prüfen Sie, welches Amt oder welche Gemeindeabteilung Ihr Anliegen bearbeitet und ob ein Formular oder ein bestimmter Einreichungsweg vorgeschrieben ist.",
      },
      {
        title: "Unterlagen zusammentragen",
        text: "Halten Sie Aktenzeichen, relevante Daten, frühere Schreiben und verlangte Nachweise bereit. Verwenden Sie gut lesbare Kopien.",
      },
      {
        title: "Anliegen formulieren",
        text: "Schreiben Sie klar, was Sie beantragen oder wissen möchten, und ordnen Sie die wichtigsten Gründe. episto bringt Ihr Anliegen in eine professionelle Form.",
      },
      {
        title: "Fristgerecht einreichen",
        text: "Unterschreiben Sie, kontrollieren Sie die Beilagen und wählen Sie bei laufenden Fristen einen nachweisbaren Versand. Bewahren Sie eine vollständige Kopie auf.",
      },
    ],
    checklist: [
      "Vollständiger Name, Adresse und Kontaktangaben",
      "Korrekte Behörde und zuständige Abteilung",
      "Akten-, Dossier- oder Referenznummer",
      "Klares Anliegen mit Begründung",
      "Datum, Unterschrift und bezeichnete Beilagen",
    ],
    notes: [
      {
        title: "Formular kann Pflicht sein",
        body: "Für gewisse Gesuche, Meldungen oder Rechtsmittel verlangen Bund, Kanton oder Gemeinde ein offizielles Formular oder einen bestimmten digitalen Kanal. Prüfen Sie die Vorgaben vor dem Versand.",
      },
      {
        title: "Frist und Zustellung dokumentieren",
        body: "Bei Verfügungen und laufenden Verfahren können kurze Fristen gelten. Beachten Sie die Rechtsmittelbelehrung und bewahren Sie Aufgabe- oder Empfangsnachweise auf.",
      },
    ],
    faqs: [
      {
        question: "Wie kann ich einen Brief an eine Behörde schreiben?",
        answer:
          "Nennen Sie zuständige Stelle, Personalien und Aktenzeichen, formulieren Sie einen eindeutigen Antrag und begründen Sie ihn mit den nötigen Daten und Belegen.",
      },
      {
        question: "Wie finde ich die richtige Behörde?",
        answer:
          "Prüfen Sie das erhaltene Schreiben, die Website Ihrer Gemeinde oder Ihres Kantons oder fragen Sie bei der Verwaltung nach. Eine falsche Zustellung kann bei Fristen riskant sein.",
      },
      {
        question: "Braucht ein Behördenbrief eine Unterschrift?",
        answer:
          "Bei formellen Gesuchen und Rechtsmitteln ist eine Unterschrift häufig erforderlich. Beachten Sie die konkrete Verfahrens- oder Formularvorgabe der zuständigen Stelle.",
      },
      {
        question: "Soll ich den Brief an das Amt per Einschreiben senden?",
        answer:
          "Bei einer wichtigen Frist oder einem formellen Antrag ist ein nachweisbarer Versand oft sinnvoll. Entscheidend bleibt, dass das Schreiben rechtzeitig bei der richtigen Stelle eingereicht wird.",
      },
    ],
    related: ["einsprache-erheben", "einschreiben-online", "brief-online-versenden"],
  },
  {
    slug: "brief-online-versenden",
    category: "Versand",
    metaTitle: "Brief online versenden – Druck & Schweizer Post",
    metaDescription:
      "Brief online schreiben und über die Schweizer Post versenden lassen – ohne Drucker und Poststellenbesuch. episto übernimmt Formulierung, Druck und Versand.",
    h1: "Brief online versenden – ohne Drucker oder Poststellenbesuch",
    quickAnswer:
      "Wer einen Brief online versenden möchte, erfasst Inhalt und Empfänger digital, prüft das fertige Schreiben und beauftragt Druck, Kuvertierung und Postaufgabe. Je nach Anliegen wählen Sie Standardpost oder Einschreiben. So sparen Sie Drucker und Weg zur Poststelle. Mit episto erledigen Sie alles online in wenigen Minuten.",
    steps: [
      {
        title: "Anliegen eingeben",
        text: "Beschreiben Sie, an wen Sie schreiben und was Sie erreichen möchten. episto formuliert daraus einen passenden, professionellen Brief.",
      },
      {
        title: "Brief prüfen",
        text: "Kontrollieren und bearbeiten Sie Inhalt, Absender, Empfänger, Datum und allfällige Beilagen vor der Freigabe.",
      },
      {
        title: "Versandart wählen",
        text: "Wählen Sie Standardbrief oder Einschreiben passend zu Frist, Bedeutung und gewünschtem Nachweis. Der Preis wird vor der Zahlung angezeigt.",
      },
      {
        title: "Druck und Versand übergeben",
        text: "episto übermittelt Ihr Schreiben der Schweizer Post, die es druckt, kuvertiert und zustellt. Sie müssen weder drucken noch zur Poststelle gehen.",
      },
    ],
    checklist: [
      "Vollständige Absenderadresse",
      "Korrekte Schweizer Empfängeradresse",
      "Klarer Betreff und geprüfter Briefinhalt",
      "Allfällige Beilagen als PDF",
      "Passende Versandart: Standard oder Einschreiben",
    ],
    notes: [
      {
        title: "Einschreiben bei wichtigen Fristen",
        body: "Für Kündigungen, Einsprachen oder andere wichtige Erklärungen ist ein Einschreiben häufig sinnvoll. Es dokumentiert Aufgabe und Zustellung besser als ein Standardbrief.",
      },
      {
        title: "Adresse vor Freigabe prüfen",
        body: "episto versendet an Empfängeradressen in der Schweiz. Kontrollieren Sie Name, Strasse, Hausnummer, PLZ und Ort sorgfältig, bevor Sie den Auftrag bestätigen.",
      },
    ],
    faqs: [
      {
        question: "Wie kann ich einen Brief online versenden?",
        answer:
          "Sie geben Inhalt und Adresse digital ein, prüfen den fertigen Brief und wählen die Versandart. episto übernimmt Druck, Kuvertierung und Übergabe an die Schweizer Post.",
      },
      {
        question: "Brauche ich dafür einen Drucker oder Briefmarken?",
        answer:
          "Nein. Sie erstellen und bezahlen den Brief online; episto kümmert sich um Papier, Druck, Couvert, Frankierung und Postaufgabe.",
      },
      {
        question: "Kann ich den Brief als Einschreiben senden?",
        answer:
          "Ja. Wählen Sie vor der Zahlung die Option «Einschreiben», wenn Sie einen Nachweis über Aufgabe und Zustellung benötigen.",
      },
      {
        question: "Kann ich Beilagen mitversenden?",
        answer:
          "Ja. Relevante Beilagen können Sie in der Regel als PDF hinzufügen. Prüfen Sie vor der Freigabe, ob alle Seiten vollständig und gut lesbar sind.",
      },
    ],
    related: ["einschreiben-online", "brief-an-behoerde", "beschwerde-schreiben"],
  },
  {
    slug: "nebenkostenabrechnung-pruefen",
    category: "Mietrecht",
    metaTitle: "Nebenkostenabrechnung prüfen & Einwand schreiben",
    metaDescription:
      "Nebenkostenabrechnung prüfen, Belege verlangen und unklare Positionen schriftlich beanstanden. episto formuliert und versendet Ihren Einwand per Schweizer Post.",
    h1: "Nebenkostenabrechnung prüfen und Unstimmigkeiten beanstanden",
    quickAnswer:
      "Wenn Sie eine Nebenkostenabrechnung prüfen, vergleichen Sie Abrechnungsperiode, vertraglich vereinbarte Kostenarten, Akontozahlungen und Verteilschlüssel. Verlangen Sie bei Unklarheiten eine detaillierte Aufstellung und Einsicht in die Belege. Beanstanden Sie konkrete Positionen schriftlich, statt die ganze Rechnung pauschal abzulehnen. episto formuliert und versendet Ihren Einwand.",
    steps: [
      {
        title: "Mietvertrag vergleichen",
        text: "Prüfen Sie, welche Nebenkosten separat vereinbart sind und ob Sie Akontobeiträge, eine Pauschale oder einzelne Kosten direkt bezahlen.",
      },
      {
        title: "Abrechnung nachrechnen",
        text: "Kontrollieren Sie Zeitraum, Objekt, Akontozahlungen, Gesamtkosten, Verteilschlüssel und den daraus resultierenden Saldo.",
      },
      {
        title: "Belege und Erklärung verlangen",
        text: "Bitten Sie bei auffälligen Positionen um eine nachvollziehbare Erläuterung und Einsicht in Rechnungen oder Abrechnungsgrundlagen.",
      },
      {
        title: "Einwand konkret versenden",
        text: "Bezeichnen Sie strittige Positionen und Ihre Fragen präzise. episto formuliert daraus einen sachlichen Brief an die Vermieterschaft oder Verwaltung.",
      },
    ],
    checklist: [
      "Mietvertrag und vereinbarte Nebenkostenarten",
      "Abrechnungsperiode und betroffenes Mietobjekt",
      "Geleistete Akontozahlungen",
      "Beanstandete Positionen und Beträge",
      "Bitte um Belegeinsicht, Erklärung und korrigierte Abrechnung",
    ],
    notes: [
      {
        title: "Nur vereinbarte Nebenkosten separat",
        body: "Nebenkosten müssen im Mietvertrag grundsätzlich konkret vereinbart sein, damit sie zusätzlich zum Nettomietzins verlangt werden können. Allgemeine Sammelbegriffe können Fragen aufwerfen.",
      },
      {
        title: "Belegeinsicht schafft Klarheit",
        body: "Mietende können in der Regel Einsicht in die der Abrechnung zugrunde liegenden Belege verlangen. Stellen Sie die Anfrage zeitnah und nennen Sie die unklaren Positionen.",
      },
    ],
    faqs: [
      {
        question: "Wie kann ich meine Nebenkostenabrechnung prüfen?",
        answer:
          "Vergleichen Sie die Kostenarten mit dem Mietvertrag und kontrollieren Sie Zeitraum, Akontozahlungen, Verteilschlüssel und Saldo. Verlangen Sie für unklare Beträge Belege und Erläuterungen.",
      },
      {
        question: "Darf ich Belege zur Nebenkostenabrechnung einsehen?",
        answer:
          "Ja, Mietende können in der Regel Einsicht in die zugrunde liegenden Belege verlangen. Vereinbaren Sie mit Vermieterschaft oder Verwaltung, wie und wo die Einsicht erfolgt.",
      },
      {
        question: "Welche Nebenkosten darf die Vermieterschaft verrechnen?",
        answer:
          "Separat verrechnet werden dürfen grundsätzlich die im Mietvertrag konkret vereinbarten, mit dem Gebrauch der Mietsache zusammenhängenden Nebenkosten. Unterhalt und Verwaltung gehören nicht beliebig dazu.",
      },
      {
        question: "Muss ich eine strittige Nachzahlung sofort begleichen?",
        answer:
          "Ignorieren Sie die Rechnung nicht. Beanstanden Sie konkrete Positionen umgehend schriftlich und klären Sie, wie mit unbestrittenen und bestrittenen Beträgen bis zur Prüfung umzugehen ist.",
      },
    ],
    related: ["mietzins-senken", "beschwerde-schreiben", "einschreiben-online"],
  },
  {
    slug: "rechtsvorschlag-erheben",
    category: "Betreibung",
    metaTitle: "Rechtsvorschlag erheben – Frist und Brief",
    metaDescription:
      "Gegen einen Zahlungsbefehl Rechtsvorschlag erheben: Frist von 10 Tagen, Form und Wirkung prüfen. episto formuliert Ihren Rechtsvorschlag und versendet ihn.",
    h1: "Rechtsvorschlag erheben: Zahlungsbefehl bestreiten",
    quickAnswer:
      "Wer einen Zahlungsbefehl des Betreibungsamts erhält und die Forderung nicht anerkennt, kann innert 10 Tagen seit Zustellung Rechtsvorschlag erheben. Der Rechtsvorschlag muss nicht begründet werden und stoppt die Betreibung vorläufig. Die Gläubigerin muss dann den Weg über Rechtsöffnung oder Klage gehen. episto formuliert Ihren Rechtsvorschlag.",
    steps: [
      {
        title: "Zahlungsbefehl und Frist prüfen",
        text: "Notieren Sie das Zustelldatum des Zahlungsbefehls. Die Frist für den Rechtsvorschlag beträgt 10 Tage ab Zustellung – verpassen Sie sie nicht.",
      },
      {
        title: "Form wählen",
        text: "Der Rechtsvorschlag kann mündlich oder schriftlich beim Betreibungsamt erklärt werden. Schriftlich mit Nachweis ist am sichersten; einen teilweisen Rechtsvorschlag müssen Sie beziffern.",
      },
      {
        title: "Rechtsvorschlag verfassen",
        text: "Geben Sie Betreibungsnummer, Betreibungsamt und die Parteien an und erklären Sie klar, dass Sie Rechtsvorschlag erheben. episto erstellt den Brief.",
      },
      {
        title: "Fristgerecht einreichen",
        text: "Versenden Sie den Rechtsvorschlag so, dass er das Betreibungsamt innert Frist erreicht – am besten als Einschreiben. Bewahren Sie den Versandbeleg auf.",
      },
    ],
    checklist: [
      "Vollständige Adresse und Angaben der betriebenen Person",
      "Zuständiges Betreibungsamt und Betreibungsnummer",
      "Zustelldatum des Zahlungsbefehls",
      "Erklärung, dass Rechtsvorschlag erhoben wird (ganz oder teilweise)",
      "Datum und Unterschrift",
    ],
    notes: [
      {
        title: "Frist von 10 Tagen (Art. 74 SchKG)",
        body: "Der Rechtsvorschlag ist innert 10 Tagen seit Zustellung des Zahlungsbefehls zu erklären. Wird die Frist verpasst, kann die Betreibung fortgesetzt werden; eine spätere Erklärung ist nur ausnahmsweise möglich.",
      },
      {
        title: "Wirkung und weiteres Vorgehen",
        body: "Der Rechtsvorschlag muss nicht begründet werden und hält die Betreibung an. Die Gläubigerin kann anschliessend Rechtsöffnung verlangen oder Klage einreichen. Ein Rechtsvorschlag bedeutet nicht, dass keine Forderung besteht.",
      },
    ],
    faqs: [
      {
        question: "Wie erhebe ich Rechtsvorschlag?",
        answer:
          "Erklären Sie innert 10 Tagen seit Zustellung des Zahlungsbefehls gegenüber dem Betreibungsamt – mündlich oder schriftlich – dass Sie Rechtsvorschlag erheben. Eine Begründung ist nicht nötig.",
      },
      {
        question: "Wie lange habe ich Zeit?",
        answer:
          "Die Frist beträgt 10 Tage ab Zustellung des Zahlungsbefehls. Massgebend ist der Eingang beim Betreibungsamt, nicht das Datum Ihres Briefs.",
      },
      {
        question: "Muss ich den Rechtsvorschlag begründen?",
        answer:
          "Nein. Der Rechtsvorschlag muss nicht begründet werden. Sie können ihn ganz oder – unter Angabe des anerkannten Betrags – teilweise erheben.",
      },
      {
        question: "Was passiert nach dem Rechtsvorschlag?",
        answer:
          "Die Betreibung wird vorläufig gestoppt. Die Gläubigerin muss die Betreibung mit Rechtsöffnung oder Klage fortsetzen, wenn sie an der Forderung festhält.",
      },
    ],
    related: ["einsprache-erheben", "mahnung-schreiben", "brief-an-behoerde"],
  },
  {
    slug: "mietmangel-melden",
    category: "Mietrecht",
    metaTitle: "Mietmangel melden – Mängelrüge schreiben",
    metaDescription:
      "Einen Mangel in der Mietwohnung rügen und Behebung verlangen: beschreiben, Frist setzen, Rechte prüfen. episto schreibt Ihre Mängelrüge und versendet sie.",
    h1: "Mietmangel melden: Mängel rügen und Frist setzen",
    quickAnswer:
      "Wer in der Mietwohnung einen Mangel feststellt, den die Vermieterschaft zu vertreten hat, meldet ihn möglichst rasch schriftlich und verlangt die Behebung innert angemessener Frist. Je nach Schwere kommen weitere Rechte wie eine Mietzinsherabsetzung in Betracht. episto formuliert Ihre Mängelrüge und versendet sie.",
    steps: [
      {
        title: "Mangel dokumentieren",
        text: "Halten Sie Art und Ort des Mangels fest sowie seit wann er besteht. Fotos mit Datum helfen als Nachweis.",
      },
      {
        title: "Behebung verlangen und Frist setzen",
        text: "Fordern Sie die Vermieterschaft schriftlich auf, den Mangel innert angemessener Frist zu beheben, und beschreiben Sie ihn konkret.",
      },
      {
        title: "Mängelrüge verfassen",
        text: "Beschreiben Sie den Mangel, verlangen Sie die Behebung und behalten Sie sich weitere Rechte vor. episto erstellt den Brief.",
      },
      {
        title: "Reaktion überwachen",
        text: "Versenden Sie möglichst als Einschreiben und notieren Sie das Datum. Reagiert die Vermieterschaft nicht, prüfen Sie weitere Schritte.",
      },
    ],
    checklist: [
      "Vollständige Adresse der Miet- und Vermieterparteien",
      "Adresse des Mietobjekts",
      "Genaue Beschreibung des Mangels und seit wann er besteht",
      "Verlangte Behebung und angemessene Frist",
      "Vorbehalt weiterer Mängelrechte, Datum und Unterschrift",
    ],
    notes: [
      {
        title: "Recht auf Mängelbeseitigung (Art. 259 OR)",
        body: "Für Mängel, die nicht Sie zu vertreten haben, können Sie von der Vermieterschaft die Behebung verlangen. Melden Sie Mängel rasch; bei verspäteter Meldung können Nachteile entstehen.",
      },
      {
        title: "Weitere Rechte bei Mängeln",
        body: "Je nach Schwere kommen Mietzinsherabsetzung, Schadenersatz oder – unter besonderen Voraussetzungen – die Hinterlegung des Mietzinses in Betracht. Die Hinterlegung ist an strenge Formvorschriften gebunden; prüfen Sie diese vorher.",
      },
    ],
    faqs: [
      {
        question: "Wie melde ich einen Mangel in der Mietwohnung?",
        answer:
          "Beschreiben Sie den Mangel schriftlich, verlangen Sie die Behebung innert angemessener Frist und behalten Sie sich weitere Rechte vor. Versenden Sie die Rüge möglichst mit Nachweis.",
      },
      {
        question: "Bis wann muss ich einen Mangel melden?",
        answer:
          "Melden Sie Mängel möglichst rasch nach Entdeckung. Eine verspätete Meldung kann Ihre Ansprüche schmälern, besonders wenn dadurch ein grösserer Schaden entsteht.",
      },
      {
        question: "Kann ich den Mietzins wegen eines Mangels kürzen?",
        answer:
          "Bei erheblichen Mängeln kann eine Mietzinsherabsetzung in Betracht kommen. Verlangen Sie zuerst die Behebung; Herabsetzung und weitere Schritte prüfen Sie je nach Fall.",
      },
      {
        question: "Darf ich den Mietzins einfach zurückbehalten?",
        answer:
          "Nicht ohne Weiteres. Ein eigenmächtiges Zurückbehalten ist riskant. Die Hinterlegung des Mietzinses ist nur unter strengen Voraussetzungen und Formvorschriften zulässig.",
      },
    ],
    related: ["mietzins-senken", "nebenkostenabrechnung-pruefen", "wohnung-kuendigen"],
  },
  {
    slug: "arbeitszeugnis-korrigieren",
    category: "Arbeitsrecht",
    metaTitle: "Arbeitszeugnis korrigieren – Korrektur verlangen",
    metaDescription:
      "Ein unrichtiges Arbeitszeugnis korrigieren lassen: Punkte benennen, Korrektur verlangen, Frist setzen. episto formuliert Ihr Schreiben und versendet es.",
    h1: "Arbeitszeugnis korrigieren: Korrektur richtig verlangen",
    quickAnswer:
      "Wer ein unrichtiges, unvollständiges oder mehrdeutig formuliertes Arbeitszeugnis erhält, kann von der Arbeitgeberschaft eine Korrektur verlangen. Ein Zeugnis muss wahr und wohlwollend sein und darf keine versteckten Abwertungen enthalten. Benennen Sie die strittigen Punkte konkret und schlagen Sie eine Formulierung vor. episto formuliert Ihr Korrekturschreiben.",
    steps: [
      {
        title: "Zeugnis prüfen",
        text: "Lesen Sie das Zeugnis genau und markieren Sie unrichtige, unvollständige oder missverständliche Stellen sowie fehlende Aufgaben.",
      },
      {
        title: "Korrektur konkret benennen",
        text: "Halten Sie fest, was falsch ist und wie es richtig lauten soll. Belege wie Aufgabenlisten oder frühere Beurteilungen helfen.",
      },
      {
        title: "Korrekturschreiben verfassen",
        text: "Verlangen Sie die Anpassung der genannten Punkte innert angemessener Frist und schlagen Sie Formulierungen vor. episto erstellt den Brief.",
      },
      {
        title: "Frist und Antwort überwachen",
        text: "Versenden Sie möglichst als Einschreiben. Reagiert die Arbeitgeberschaft nicht oder ablehnend, prüfen Sie weitere Schritte.",
      },
    ],
    checklist: [
      "Vollständige Angaben zu Arbeitnehmer- und Arbeitgeberschaft",
      "Funktion und Dauer des Arbeitsverhältnisses",
      "Konkret bezeichnete strittige Stellen im Zeugnis",
      "Gewünschte Korrektur oder Formulierungsvorschlag",
      "Angemessene Frist, Datum und Unterschrift",
    ],
    notes: [
      {
        title: "Anspruch auf ein wahres, wohlwollendes Zeugnis (Art. 330a OR)",
        body: "Sie haben Anspruch auf ein Zeugnis über Art und Dauer des Arbeitsverhältnisses und auf Wunsch über Leistung und Verhalten. Es muss wahr und wohlwollend sein; unklare oder abwertende Codes sind unzulässig.",
      },
      {
        title: "Nicht zu lange warten",
        body: "Verlangen Sie die Korrektur zeitnah. Ansprüche aus dem Arbeitsverhältnis können verjähren; zudem wird eine späte Beanstandung schwieriger durchzusetzen.",
      },
    ],
    faqs: [
      {
        question: "Kann ich mein Arbeitszeugnis korrigieren lassen?",
        answer:
          "Ja. Ist das Zeugnis unrichtig, unvollständig oder mehrdeutig, können Sie eine Korrektur verlangen. Benennen Sie die Punkte konkret und schlagen Sie eine richtige Formulierung vor.",
      },
      {
        question: "Worauf habe ich Anspruch?",
        answer:
          "Auf ein wahres und wohlwollendes Zeugnis über Art und Dauer der Anstellung sowie – auf Wunsch – über Leistung und Verhalten. Versteckte Abwertungen sind nicht zulässig.",
      },
      {
        question: "Bis wann kann ich eine Korrektur verlangen?",
        answer:
          "Verlangen Sie die Korrektur möglichst rasch. Ansprüche können mit der Zeit verjähren, und eine späte Beanstandung ist schwieriger zu belegen.",
      },
      {
        question: "Was, wenn die Arbeitgeberschaft die Korrektur ablehnt?",
        answer:
          "Prüfen Sie die Begründung. Bleibt die Arbeitgeberschaft untätig oder ablehnend, können Sie den Anspruch nötigenfalls gerichtlich geltend machen.",
      },
    ],
    related: ["arbeitsvertrag-kuendigen", "beschwerde-schreiben", "brief-an-behoerde"],
  },
];
