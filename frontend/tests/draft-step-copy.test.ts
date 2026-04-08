import { describe, expect, it } from "vitest";

import de from "../src/messages/de-CH.json";
import en from "../src/messages/en-CH.json";
import fr from "../src/messages/fr-CH.json";
import itLocale from "../src/messages/it-CH.json";

describe("draft step CTA copy", () => {
  it("keeps the bottom Next actions compact", () => {
    expect(en.draft.continueToSender).toBe("Next");
    expect(en.draft.continueToRecipient).toBe("Next");
    expect(en.draft.continueToContent).toBe("Next");
    expect(en.draft.continueToAttachments).toBe("Next");
    expect(en.draft.continueToSubject).toBe("Next");
    expect(en.draft.continueToLogistics).toBe("Next");
    expect(en.draft.continueToReview).toBe("Next");

    expect(de.draft.continueToSender).toBe("Weiter");
    expect(de.draft.continueToRecipient).toBe("Weiter");
    expect(de.draft.continueToContent).toBe("Weiter");
    expect(de.draft.continueToAttachments).toBe("Weiter");
    expect(de.draft.continueToSubject).toBe("Weiter");
    expect(de.draft.continueToLogistics).toBe("Weiter");
    expect(de.draft.continueToReview).toBe("Weiter");

    expect(fr.draft.continueToSender).toBe("Suivant");
    expect(fr.draft.continueToRecipient).toBe("Suivant");
    expect(fr.draft.continueToContent).toBe("Suivant");
    expect(fr.draft.continueToAttachments).toBe("Suivant");
    expect(fr.draft.continueToSubject).toBe("Suivant");
    expect(fr.draft.continueToLogistics).toBe("Suivant");
    expect(fr.draft.continueToReview).toBe("Suivant");

    expect(itLocale.draft.continueToSender).toBe("Avanti");
    expect(itLocale.draft.continueToRecipient).toBe("Avanti");
    expect(itLocale.draft.continueToContent).toBe("Avanti");
    expect(itLocale.draft.continueToAttachments).toBe("Avanti");
    expect(itLocale.draft.continueToSubject).toBe("Avanti");
    expect(itLocale.draft.continueToLogistics).toBe("Avanti");
    expect(itLocale.draft.continueToReview).toBe("Avanti");
  });

  it("keeps the Back buttons compact in the flow action dock", () => {
    expect(en.draft.backToSender).toBe("Back");
    expect(en.draft.backToRecipient).toBe("Back");
    expect(en.draft.backToContent).toBe("Back");
    expect(en.draft.backToAttachments).toBe("Back");
    expect(en.draft.backToSubject).toBe("Back");
    expect(en.review.backToDraft).toBe("Back");
    expect(en.checkout.backToReview).toBe("Back");

    expect(de.draft.backToSender).toBe("Zurück");
    expect(de.draft.backToRecipient).toBe("Zurück");
    expect(de.draft.backToContent).toBe("Zurück");
    expect(de.draft.backToAttachments).toBe("Zurück");
    expect(de.draft.backToSubject).toBe("Zurück");
    expect(de.review.backToDraft).toBe("Zurück");
    expect(de.checkout.backToReview).toBe("Zurück");

    expect(fr.draft.backToSender).toBe("Retour");
    expect(fr.draft.backToRecipient).toBe("Retour");
    expect(fr.draft.backToContent).toBe("Retour");
    expect(fr.draft.backToAttachments).toBe("Retour");
    expect(fr.draft.backToSubject).toBe("Retour");
    expect(fr.review.backToDraft).toBe("Retour");
    expect(fr.checkout.backToReview).toBe("Retour");

    expect(itLocale.draft.backToSender).toBe("Indietro");
    expect(itLocale.draft.backToRecipient).toBe("Indietro");
    expect(itLocale.draft.backToContent).toBe("Indietro");
    expect(itLocale.draft.backToAttachments).toBe("Indietro");
    expect(itLocale.draft.backToSubject).toBe("Indietro");
    expect(itLocale.review.backToDraft).toBe("Indietro");
    expect(itLocale.checkout.backToReview).toBe("Indietro");
  });

  it("keeps the primary flow actions compact", () => {
    expect(en.review.proceedToPayment).toBe("Checkout");
    expect(en.checkout.continueToPayment).toBe("Next");
    expect(en.checkout.sendMyLetter).toBe("Pay");

    expect(de.review.proceedToPayment).toBe("Kasse");
    expect(de.checkout.continueToPayment).toBe("Weiter");
    expect(de.checkout.sendMyLetter).toBe("Bezahlen");

    expect(fr.review.proceedToPayment).toBe("Paiement");
    expect(fr.checkout.continueToPayment).toBe("Suivant");
    expect(fr.checkout.sendMyLetter).toBe("Payer");

    expect(itLocale.review.proceedToPayment).toBe("Cassa");
    expect(itLocale.checkout.continueToPayment).toBe("Avanti");
    expect(itLocale.checkout.sendMyLetter).toBe("Paga");
  });
});
