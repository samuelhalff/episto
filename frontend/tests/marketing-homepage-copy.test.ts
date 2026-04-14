import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const localeMessagePaths = {
  "de-CH": path.join(repoRoot, "frontend/src/messages/de-CH.json"),
  "en-CH": path.join(repoRoot, "frontend/src/messages/en-CH.json"),
  "fr-CH": path.join(repoRoot, "frontend/src/messages/fr-CH.json"),
  "it-CH": path.join(repoRoot, "frontend/src/messages/it-CH.json"),
} as const;

type LocaleKey = keyof typeof localeMessagePaths;
type MessageTree = Record<string, unknown>;

function readJsonFile(pathname: string) {
  return JSON.parse(readFileSync(pathname, "utf8")) as MessageTree;
}

function getNestedValue(source: unknown, keyPath: string) {
  return keyPath.split(".").reduce<unknown>((value, segment) => {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    return (value as MessageTree)[segment];
  }, source);
}

function readLocaleMessages(locale: LocaleKey) {
  return readJsonFile(localeMessagePaths[locale]);
}

describe("marketing homepage locale copy", () => {
  it("uses plain-language trust strip copy across locales", () => {
    const expected: Record<string, Record<string, string>> = {
      "en-CH": {
        postal: "Sent by post in Switzerland",
        privacy: "Your details stay private",
        encryption: "Kept safe from start to finish",
        noAccount: "Start without an account",
      },
      "de-CH": {
        postal: "Per Post in der Schweiz verschickt",
        privacy: "Ihre Angaben bleiben privat",
        encryption: "Von Anfang bis Ende geschützt",
        noAccount: "Ohne Konto starten",
      },
      "fr-CH": {
        postal: "Envoyé par la poste en Suisse",
        privacy: "Vos données restent privées",
        encryption: "Protégé du début à la fin",
        noAccount: "Commencez sans compte",
      },
      "it-CH": {
        postal: "Spedita per posta in Svizzera",
        privacy: "I Suoi dati restano privati",
        encryption: "Protetta dall’inizio alla fine",
        noAccount: "Può iniziare senza conto",
      },
    };

    for (const [locale, expectedMap] of Object.entries(expected)) {
      const messages = readLocaleMessages(locale as LocaleKey);
      expect(getNestedValue(messages, "marketing.homepage.trustStrip.postal")).toBe(
        expectedMap.postal,
      );
      expect(getNestedValue(messages, "marketing.homepage.trustStrip.privacy")).toBe(
        expectedMap.privacy,
      );
      expect(getNestedValue(messages, "marketing.homepage.trustStrip.encryption")).toBe(
        expectedMap.encryption,
      );
      expect(getNestedValue(messages, "marketing.homepage.trustStrip.noAccount")).toBe(
        expectedMap.noAccount,
      );
    }
  });

  it("uses customer-friendly homepage reassurance copy across locales", () => {
    const expectedByLocale: Record<string, Record<string, string>> = {
      "en-CH": {
        "marketing.homepage.hero.badge": "Built for important letters",
        "marketing.homepage.hero.title": "Your letter, no printer or stamp needed",
        "marketing.homepage.hero.subtitle":
          "Describe what you need. We draft the first version, you review it, and we get it ready to send by post in Switzerland.",
        "marketing.homepage.hero.proof":
          "No account required · Clear total before payment · Your details stay private",
        "marketing.homepage.howItWorks.steps.send.body":
          "Approve the total, pay securely, and we get your letter ready to send.",
        "marketing.homepage.confidence.cards.review.body":
          "Check the wording, addresses, and attachments before you pay or send it.",
        "marketing.homepage.confidence.cards.privacy.title":
          "Price and process stay clear",
      },
      "de-CH": {
        "marketing.homepage.hero.badge": "Für wichtige Briefe gemacht",
        "marketing.homepage.hero.title": "Ihr Brief, ganz ohne Drucker und Briefmarke",
        "marketing.homepage.hero.subtitle":
          "Beschreiben Sie Ihr Anliegen. Wir erstellen den ersten Entwurf, Sie prüfen ihn, und wir machen ihn bereit für den Versand per Post in der Schweiz.",
        "marketing.homepage.hero.proof":
          "Kein Konto erforderlich · Klarer Total vor der Zahlung · Ihre Angaben bleiben privat",
        "marketing.homepage.howItWorks.steps.send.body":
          "Bestätigen Sie den Total, bezahlen Sie sicher und wir machen Ihren Brief versandbereit.",
        "marketing.homepage.confidence.cards.review.body":
          "Prüfen Sie Formulierungen, Adressen und Beilagen, bevor Sie bezahlen oder den Brief senden.",
      },
      "fr-CH": {
        "marketing.homepage.hero.badge": "Conçu pour les lettres importantes",
        "marketing.homepage.hero.title": "Votre lettre, sans imprimante ni timbre",
        "marketing.homepage.hero.subtitle":
          "Décrivez votre besoin. Nous rédigeons une première version, vous la relisez, puis nous la préparons pour l’envoi par la poste en Suisse.",
        "marketing.homepage.hero.proof":
          "Aucun compte requis · Total clair avant paiement · Vos données restent privées",
        "marketing.homepage.howItWorks.steps.send.body":
          "Validez le total, payez en sécurité et nous préparons votre lettre pour l’envoi.",
        "marketing.homepage.confidence.cards.review.body":
          "Vérifiez le texte, les adresses et les pièces jointes avant de payer ou d’envoyer la lettre.",
        "marketing.homepage.confidence.eyebrow": "Ce qui inspire confiance",
        "marketing.homepage.useCases.intro":
          "Les gens viennent ici quand le sujet est important et qu'un simple message ne suffit plus.",
      },
      "it-CH": {
        "marketing.homepage.hero.badge": "Pensato per lettere importanti",
        "marketing.homepage.hero.title": "La Sua lettera, senza stampante né francobollo",
        "marketing.homepage.hero.subtitle":
          "Descriva ciò di cui ha bisogno. Prepariamo una prima bozza, Lei la controlla e noi la prepariamo per l’invio per posta in Svizzera.",
        "marketing.homepage.hero.proof":
          "Nessun conto richiesto · Totale chiaro prima del pagamento · I Suoi dati restano privati",
        "marketing.homepage.howItWorks.steps.send.body":
          "Confermi il totale, paghi in modo sicuro e noi prepariamo la Sua lettera per l’invio.",
        "marketing.homepage.confidence.cards.review.body":
          "Verifichi testo, indirizzi e allegati prima di pagare o inviare la lettera.",
      },
    };

    for (const [locale, expectedMap] of Object.entries(expectedByLocale)) {
      const messages = readLocaleMessages(locale as LocaleKey);
      for (const [key, expectedValue] of Object.entries(expectedMap)) {
        expect(String(getNestedValue(messages, key))).toBe(expectedValue);
      }
    }

    const messagesEn = readLocaleMessages("en-CH");
    expect(
      String(
        getNestedValue(messagesEn, "marketing.homepage.confidence.cards.privacy.title"),
      ),
    ).not.toBe("Costs and handling stay clear");
    expect(String(getNestedValue(messagesEn, "marketing.homepage.hero.proof"))).not.toBe(
      "No account required · Clear total before payment · Privacy-conscious infrastructure",
    );

    const messagesFr = readLocaleMessages("fr-CH");
    expect(
      String(getNestedValue(messagesFr, "marketing.homepage.confidence.eyebrow")),
    ).not.toBe("Pourquoi on lui fait confiance");
    expect(
      String(getNestedValue(messagesFr, "marketing.homepage.useCases.intro")),
    ).not.toBe(
      "On vient ici quand le sujet est important et qu'un simple message ne suffit plus.",
    );
  });
});
