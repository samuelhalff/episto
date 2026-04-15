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
        encryption: "Encrypted and stored securely",
        noAccount: "Start without an account",
      },
      "de-CH": {
        postal: "Versand in der Schweiz",
        privacy: "Ihre Angaben bleiben privat",
        encryption: "Verschlüsselt und sicher gespeichert",
        noAccount: "Ohne Konto starten",
      },
      "fr-CH": {
        postal: "Envoi postal en Suisse",
        privacy: "Vos données restent privées",
        encryption: "Données chiffrées et stockées en sécurité",
        noAccount: "Commencez sans compte",
      },
      "it-CH": {
        postal: "Spedizione postale in Svizzera",
        privacy: "I Suoi dati restano riservati",
        encryption: "Crittografato e conservato in sicurezza",
        noAccount: "Iniziare senza account",
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
        "marketing.homepage.hero.title": "Formal letters, ready to send",
        "marketing.homepage.hero.subtitle":
          "Draft, review, and prepare your letter for postal delivery in Switzerland.",
        "marketing.homepage.hero.proof":
          "No account needed · Exact total before payment · Your details stay private",
        "marketing.homepage.howItWorks.steps.send.body":
          "Approve the total, pay securely, and we prepare your letter for dispatch.",
        "marketing.homepage.confidence.cards.review.body":
          "Check the wording, addresses, and attachments before you pay or send.",
        "marketing.homepage.confidence.cards.privacy.title":
          "Price and process stay clear",
      },
      "de-CH": {
        "marketing.homepage.hero.badge": "Für wichtige Briefe gemacht",
        "marketing.homepage.hero.title": "Formelle Briefe, bereit für den Versand",
        "marketing.homepage.hero.subtitle":
          "Beschreiben Sie Ihr Anliegen, prüfen Sie den Entwurf und geben Sie Ihren Brief erst frei, wenn alles stimmt.",
        "marketing.homepage.hero.proof":
          "Kein Konto nötig · Genauer Total vor der Zahlung · Ihre Angaben bleiben privat",
        "marketing.homepage.howItWorks.steps.send.body":
          "Bestätigen Sie den Total, bezahlen Sie sicher und wir bereiten Ihren Brief für den Versand vor.",
        "marketing.homepage.confidence.cards.review.body":
          "Prüfen Sie Formulierungen, Adressen und Beilagen, bevor Sie bezahlen oder den Brief versenden.",
      },
      "fr-CH": {
        "marketing.homepage.hero.badge": "Pensé pour les courriers importants",
        "marketing.homepage.hero.title": "Des courriers formels, prêts à l’envoi",
        "marketing.homepage.hero.subtitle":
          "Expliquez votre situation, relisez le projet, puis préparez votre courrier pour l’envoi postal en Suisse.",
        "marketing.homepage.hero.proof":
          "Sans compte · Total exact avant paiement · Vos données restent privées",
        "marketing.homepage.howItWorks.steps.send.body":
          "Validez le montant, payez en toute sécurité, puis nous préparons votre courrier pour l’envoi.",
        "marketing.homepage.confidence.cards.review.body":
          "Relisez le texte, les adresses et les pièces jointes avant de payer ou de lancer l’envoi.",
        "marketing.homepage.confidence.eyebrow": "Pourquoi utiliser Episto",
        "marketing.homepage.useCases.intro":
          "On y a recours lorsque le sujet est important et qu’un simple message ne suffit plus.",
      },
      "it-CH": {
        "marketing.homepage.hero.badge": "Pensato per lettere importanti",
        "marketing.homepage.hero.title": "Lettere formali, pronte per la spedizione",
        "marketing.homepage.hero.subtitle":
          "Rediga, verifichi e prepari la Sua lettera per la spedizione postale in Svizzera.",
        "marketing.homepage.hero.proof":
          "Senza account · Totale esatto prima del pagamento · I Suoi dati restano riservati",
        "marketing.homepage.howItWorks.steps.send.body":
          "Confermi il totale, paghi in modo sicuro e prepariamo la Sua lettera per la spedizione.",
        "marketing.homepage.confidence.cards.review.body":
          "Verifichi testo, indirizzi e allegati prima di pagare o spedire.",
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
