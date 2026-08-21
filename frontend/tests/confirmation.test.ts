import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import {
  PAYMENT_SUCCESS_STATES,
  PAYMENT_FAILURE_STATES,
} from "../src/hooks/use-payment-status";

// ---------------------------------------------------------------------------
// Payment status constants
// ---------------------------------------------------------------------------

describe("PAYMENT_SUCCESS_STATES", () => {
  it("includes captured only", () => {
    expect(PAYMENT_SUCCESS_STATES).toContain("captured");
    expect(PAYMENT_SUCCESS_STATES).not.toContain("authorized");
  });

  it("does not include failure states", () => {
    expect(PAYMENT_SUCCESS_STATES).not.toContain("failed");
    expect(PAYMENT_SUCCESS_STATES).not.toContain("cancelled");
  });
});

describe("PAYMENT_FAILURE_STATES", () => {
  it("includes failed and cancelled", () => {
    expect(PAYMENT_FAILURE_STATES).toContain("failed");
    expect(PAYMENT_FAILURE_STATES).toContain("cancelled");
  });

  it("does not include success states", () => {
    expect(PAYMENT_FAILURE_STATES).not.toContain("authorized");
    expect(PAYMENT_FAILURE_STATES).not.toContain("captured");
  });
});

// ---------------------------------------------------------------------------
// Confirmation page i18n keys — all 4 locales must define them
// ---------------------------------------------------------------------------

import enCH from "../src/messages/en-CH.json";
import deCH from "../src/messages/de-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const confirmationPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx"),
  "utf8",
);

const REQUIRED_CONFIRMATION_KEYS = [
  "title",
  "subtitle",
  "queuedSubtitle",
  "submittedSubtitle",
  "acceptedSubtitle",
  "rejectedSubtitle",
  "unknownSubtitle",
  "verifying",
  "verificationFailed",
  "verificationFailedSubtitle",
  "retryVerification",
  "paymentFailed",
  "paymentFailedSubtitle",
  "backToCheckout",
  "orderReference",
  "copied",
  "copyReference",
  "dispatchTitle",
  "whatHappensNext",
  "stepPayment",
  "stepPaymentDetail",
  "stepSubmitted",
  "stepSubmittedDetail",
  "stepProcessing",
  "stepProcessingDetail",
  "stepUpdates",
  "stepUpdatesDetail",
  "downloadReceipt",
  "viewLetter",
  "sendAnother",
  "stateQueued",
  "stateSubmitted",
  "stateAccepted",
  "stateRejected",
  "stateUnknown",
  "emailNoticeEyebrow",
  "emailNotice",
  "emailNoticeDetail",
  "stickyCtaLabel",
] as const;

const locales = [
  { name: "en-CH", data: enCH },
  { name: "de-CH", data: deCH },
  { name: "fr-CH", data: frCH },
  { name: "it-CH", data: itCH },
] as const;

const EXPECTED_EMAIL_NOTICE_COPY = {
  "en-CH": {
    emailNoticeEyebrow: "Payment receipt",
    emailNotice: "A payment receipt has been sent to your email",
    emailNoticeDetail: "You'll also receive a dispatch email if the status changes.",
  },
  "de-CH": {
    emailNoticeEyebrow: "Zahlungsbeleg",
    emailNotice: "Ein Zahlungsbeleg wurde an Ihre E-Mail-Adresse gesendet",
    emailNoticeDetail:
      "Sie erhalten auch eine Versand-E-Mail, wenn sich der Status ändert.",
  },
  "fr-CH": {
    emailNoticeEyebrow: "Reçu de paiement",
    emailNotice: "Un reçu de paiement a été envoyé à votre adresse e-mail",
    emailNoticeDetail: "Vous recevrez aussi un e-mail d'envoi si le statut change.",
  },
  "it-CH": {
    emailNoticeEyebrow: "Ricevuta di pagamento",
    emailNotice: "Una ricevuta di pagamento è stata inviata al tuo indirizzo e-mail",
    emailNoticeDetail: "Riceverai anche un'e-mail di spedizione se lo stato cambia.",
  },
} as const;

describe("confirmation i18n keys", () => {
  for (const locale of locales) {
    describe(locale.name, () => {
      const confirmation = (locale.data as Record<string, Record<string, string>>)[
        "confirmation"
      ];

      it("has a confirmation section", () => {
        expect(confirmation).toBeDefined();
      });

      for (const key of REQUIRED_CONFIRMATION_KEYS) {
        it(`has key "${key}"`, () => {
          expect(confirmation[key]).toBeDefined();
          expect(typeof confirmation[key]).toBe("string");
          expect(confirmation[key].length).toBeGreaterThan(0);
        });
      }

      it("uses the approved payment receipt email notice copy", () => {
        expect(confirmation.emailNoticeEyebrow).toBe(
          EXPECTED_EMAIL_NOTICE_COPY[locale.name].emailNoticeEyebrow,
        );
        expect(confirmation.emailNotice).toBe(
          EXPECTED_EMAIL_NOTICE_COPY[locale.name].emailNotice,
        );
        expect(confirmation.emailNoticeDetail).toBe(
          EXPECTED_EMAIL_NOTICE_COPY[locale.name].emailNoticeDetail,
        );
      });
    });
  }

  it("all locales define the same set of keys", () => {
    const enKeys = Object.keys(
      (enCH as Record<string, Record<string, string>>)["confirmation"],
    ).sort();
    for (const locale of [deCH, frCH, itCH]) {
      const keys = Object.keys(
        (locale as Record<string, Record<string, string>>)["confirmation"],
      ).sort();
      expect(keys).toEqual(enKeys);
    }
  });
});

describe("confirmation page regressions", () => {
  it("uses shared action primitives instead of hardcoded CTA classes", () => {
    expect(confirmationPageSource).toContain("ActionLink");
    expect(confirmationPageSource).toContain("getAppButtonClassName");
    expect(confirmationPageSource).not.toContain("bg-zinc-950 px-6 py-3");
  });

  it("uses shared status badges and panel surfaces for confirmation chrome", () => {
    expect(confirmationPageSource).toContain("StatusBadge");
    expect(confirmationPageSource).toContain("app-panel");
  });

  it("keeps confirmation timeline states readable in dark mode without duplicate icon imports", () => {
    expect(confirmationPageSource).not.toContain("HelpCircle as HelpCircleIcon");
    expect(confirmationPageSource).toContain(
      "dark:bg-emerald-500/15 dark:text-emerald-300",
    );
    expect(confirmationPageSource).toContain("dark:bg-zinc-800 dark:text-zinc-500");
    expect(confirmationPageSource).toContain("text-zinc-400 dark:text-zinc-500");
  });

  it("keeps only one bottom action and removes the floating send-another button", () => {
    expect(confirmationPageSource).not.toContain("stickyCtaLabel");
    expect(confirmationPageSource).not.toContain("fixed inset-x-4 bottom-4");
    expect(confirmationPageSource).toContain('href="/draft/new?fresh=1"');
    expect(confirmationPageSource).toContain('{t("sendAnother")}');
  });

  // The fulfillment route was once dropped from the backend, leaving this page
  // polling a 404 and hanging forever on the "verifying" spinner. A persistent
  // failure must surface an explicit error with a retry, never spin indefinitely.
  it("renders an explicit error + retry state instead of hanging on a failed poll", () => {
    expect(confirmationPageSource).toContain("fulfillment.isError");
    expect(confirmationPageSource).toContain("fulfillment.refetch()");
    expect(confirmationPageSource).toContain('{t("verificationFailed")}');
    expect(confirmationPageSource).toContain('{t("retryVerification")}');
  });
});
