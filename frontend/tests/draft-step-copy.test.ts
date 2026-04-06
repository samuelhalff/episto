import { describe, expect, it } from "vitest";

import de from "../src/messages/de-CH.json";
import en from "../src/messages/en-CH.json";
import fr from "../src/messages/fr-CH.json";
import itLocale from "../src/messages/it-CH.json";

describe("draft step CTA copy", () => {
  it("keeps the bottom primary actions short on narrow viewports", () => {
    expect(en.draft.continueToSender).toBe("Next: sender");
    expect(en.draft.continueToRecipient).toBe("Next: recipient");
    expect(en.draft.continueToContent).toBe("Next: content");
    expect(en.draft.continueToAttachments).toBe("Next: attachments");
    expect(en.draft.continueToSubject).toBe("Next: subject");
    expect(en.draft.continueToLogistics).toBe("Next: delivery");
    expect(en.draft.continueToReview).toBe("Next: review");
    expect(en.checkout.continueToPayment).toBe("Next: payment");

    expect(de.draft.continueToSender).toBe("Weiter: Absender");
    expect(de.draft.continueToRecipient).toBe("Weiter: Empfänger");
    expect(de.draft.continueToContent).toBe("Weiter: Text");
    expect(de.draft.continueToAttachments).toBe("Weiter: Beilagen");
    expect(de.draft.continueToSubject).toBe("Weiter: Betreff");
    expect(de.draft.continueToLogistics).toBe("Weiter: Versand");
    expect(de.draft.continueToReview).toBe("Weiter: Prüfung");
    expect(de.checkout.continueToPayment).toBe("Weiter: Zahlung");

    expect(fr.draft.continueToSender).toBe("Suivant : expéditeur");
    expect(fr.draft.continueToRecipient).toBe("Suivant : destinataire");
    expect(fr.draft.continueToContent).toBe("Suivant : contenu");
    expect(fr.draft.continueToAttachments).toBe("Suivant : pièces jointes");
    expect(fr.draft.continueToSubject).toBe("Suivant : objet");
    expect(fr.draft.continueToLogistics).toBe("Suivant : envoi");
    expect(fr.draft.continueToReview).toBe("Suivant : vérification");
    expect(fr.checkout.continueToPayment).toBe("Suivant : paiement");

    expect(itLocale.draft.continueToSender).toBe("Avanti: mittente");
    expect(itLocale.draft.continueToRecipient).toBe("Avanti: destinatario");
    expect(itLocale.draft.continueToContent).toBe("Avanti: contenuto");
    expect(itLocale.draft.continueToAttachments).toBe("Avanti: allegati");
    expect(itLocale.draft.continueToSubject).toBe("Avanti: oggetto");
    expect(itLocale.draft.continueToLogistics).toBe("Avanti: spedizione");
    expect(itLocale.draft.continueToReview).toBe("Avanti: verifica");
    expect(itLocale.checkout.continueToPayment).toBe("Avanti: pagamento");
  });

  it("keeps back and pay buttons compact in the flow action dock", () => {
    expect(en.review.backToDraft).toBe("Back");
    expect(en.checkout.backToReview).toBe("Back");
    expect(en.checkout.sendMyLetter).toBe("Pay");

    expect(de.review.backToDraft).toBe("Zurück");
    expect(de.checkout.backToReview).toBe("Zurück");
    expect(de.checkout.sendMyLetter).toBe("Bezahlen");

    expect(fr.review.backToDraft).toBe("Retour");
    expect(fr.checkout.backToReview).toBe("Retour");
    expect(fr.checkout.sendMyLetter).toBe("Payer");

    expect(itLocale.review.backToDraft).toBe("Indietro");
    expect(itLocale.checkout.backToReview).toBe("Indietro");
    expect(itLocale.checkout.sendMyLetter).toBe("Paga");
  });
});
