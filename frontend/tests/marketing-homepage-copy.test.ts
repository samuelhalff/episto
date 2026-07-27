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
        postal: "No post office, printer, or stamps",
        privacy: "Your details stay private",
        encryption: "Encrypted and stored securely",
        noAccount: "Start without an account",
      },
      "de-CH": {
        postal: "Ohne Poststelle, Drucker oder Briefmarken",
        privacy: "Ihre Angaben bleiben privat",
        encryption: "Verschlüsselt und sicher gespeichert",
        noAccount: "Ohne Konto starten",
      },
      "fr-CH": {
        postal: "Sans poste, imprimante ni timbres",
        privacy: "Vos données restent privées",
        encryption: "Données chiffrées et stockées en sécurité",
        noAccount: "Commencez sans compte",
      },
      "it-CH": {
        postal: "Senza posta, stampante o francobolli",
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
        "marketing.homepage.hero.title": "Send formal letters without the post office",
        "marketing.homepage.hero.subtitle":
          "Write it online — we submit it to Swiss Post, which prints and delivers it. No printer, no stamps.",
        "marketing.homepage.hero.proof.noAccount": "No account needed",
        "marketing.homepage.hero.proof.exactTotal": "Exact total before payment",
        "marketing.homepage.hero.proof.privacy": "Your details stay private",
        "marketing.homepage.howItWorks.steps.send.body":
          "Approve the total, pay securely, and we submit your letter to Swiss Post.",
        "marketing.homepage.confidence.cards.review.body":
          "Check the wording, addresses, and attachments before you pay or send.",
        "marketing.homepage.confidence.cards.privacy.title":
          "Price and process stay clear",
      },
      "de-CH": {
        "marketing.homepage.hero.badge": "Für wichtige Briefe gemacht",
        "marketing.homepage.hero.title":
          "Formelle Briefe senden – ohne Gang zur Poststelle",
        "marketing.homepage.hero.subtitle":
          "Sie schreiben online – wir übermitteln den Brief der Schweizerischen Post, die ihn druckt und zustellt. Kein Drucker, keine Briefmarken.",
        "marketing.homepage.hero.proof.noAccount": "Kein Konto nötig",
        "marketing.homepage.hero.proof.exactTotal": "Genauer Total vor der Zahlung",
        "marketing.homepage.hero.proof.privacy": "Ihre Angaben bleiben privat",
        "marketing.homepage.howItWorks.steps.send.body":
          "Bestätigen Sie den Total, bezahlen Sie sicher und wir übermitteln Ihren Brief der Schweizerischen Post.",
        "marketing.homepage.confidence.cards.review.body":
          "Prüfen Sie Formulierungen, Adressen und Beilagen, bevor Sie bezahlen oder den Brief versenden.",
      },
      "fr-CH": {
        "marketing.homepage.hero.badge": "Pensé pour les courriers importants",
        "marketing.homepage.hero.title":
          "Envoyez des lettres formelles sans passer à la poste",
        "marketing.homepage.hero.subtitle":
          "Vous écrivez en ligne — nous transmettons la lettre à la Poste suisse, qui l’imprime et la distribue. Sans imprimante, sans timbres.",
        "marketing.homepage.hero.proof.noAccount": "Sans compte",
        "marketing.homepage.hero.proof.exactTotal": "Total exact avant paiement",
        "marketing.homepage.hero.proof.privacy": "Vos données restent privées",
        "marketing.homepage.howItWorks.steps.send.body":
          "Validez le montant, payez en toute sécurité, puis nous transmettons votre courrier à la Poste suisse.",
        "marketing.homepage.confidence.cards.review.body":
          "Relisez le texte, les adresses et les pièces jointes avant de payer ou de lancer l’envoi.",
        "marketing.homepage.confidence.eyebrow": "Pourquoi utiliser episto",
        "marketing.homepage.useCases.intro":
          "On y a recours lorsque le sujet est important et qu’un simple message ne suffit plus.",
      },
      "it-CH": {
        "marketing.homepage.hero.badge": "Pensato per lettere importanti",
        "marketing.homepage.hero.title": "Invii lettere formali senza andare alla posta",
        "marketing.homepage.hero.subtitle":
          "Lei scrive online — trasmettiamo la lettera alla Posta svizzera, che la stampa e la recapita. Senza stampante, senza francobolli.",
        "marketing.homepage.hero.proof.noAccount": "Senza account",
        "marketing.homepage.hero.proof.exactTotal": "Totale esatto prima del pagamento",
        "marketing.homepage.hero.proof.privacy": "I Suoi dati restano riservati",
        "marketing.homepage.howItWorks.steps.send.body":
          "Confermi il totale, paghi in modo sicuro e trasmettiamo la Sua lettera alla Posta svizzera.",
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
    expect(
      String(getNestedValue(messagesEn, "marketing.homepage.hero.proof.noAccount")),
    ).not.toBe("No account required");

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
