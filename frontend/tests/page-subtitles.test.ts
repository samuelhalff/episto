import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import deCH from "../src/messages/de-CH.json";
import enCH from "../src/messages/en-CH.json";
import frCH from "../src/messages/fr-CH.json";
import itCH from "../src/messages/it-CH.json";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const homePageSource = readFileSync(path.join(repoRoot, "frontend/src/app/[locale]/page.tsx"), "utf8");
const homepageHeroSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/HomepageHero.tsx"),
  "utf8",
);
const helpPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/help/page.tsx"),
  "utf8",
);
const pricingPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/pricing/page.tsx"),
  "utf8",
);
const newDraftPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/new/page.tsx"),
  "utf8",
);
const intakeStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/IntakeStep.tsx"),
  "utf8",
);
const senderStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/SenderStep.tsx"),
  "utf8",
);
const recipientStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/RecipientStep.tsx"),
  "utf8",
);
const attachmentsStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/AttachmentsStep.tsx"),
  "utf8",
);
const subjectStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/SubjectStep.tsx"),
  "utf8",
);
const logisticsStepSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/LogisticsStep.tsx"),
  "utf8",
);
const reviewPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/review/page.tsx"),
  "utf8",
);
const checkoutPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx"),
  "utf8",
);
const confirmationPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx"),
  "utf8",
);

const locales = [
  { name: "en-CH", data: enCH },
  { name: "de-CH", data: deCH },
  { name: "fr-CH", data: frCH },
  { name: "it-CH", data: itCH },
] as const;

const MAIN_PAGE_SUBTITLE_PATHS = [
  { label: "pricing page", path: ["pricing", "subtitle"] },
  { label: "help page", path: ["help", "subtitle"] },
  { label: "draft entry", path: ["draft", "entrySubtitle"] },
  { label: "intake step", path: ["draft", "intakeSubtitle"] },
  { label: "sender step", path: ["draft", "senderDetailsSubtitle"] },
  { label: "recipient step", path: ["draft", "recipientDetailsSubtitle"] },
  { label: "attachments step", path: ["draft", "attachmentsStepSubtitle"] },
  { label: "subject step", path: ["draft", "subjectLineSubtitle"] },
  { label: "logistics step", path: ["draft", "logisticsSubtitle"] },
  { label: "review page", path: ["review", "subtitle"] },
  { label: "checkout page", path: ["checkout", "checkoutIntro"] },
  { label: "confirmation queued", path: ["confirmation", "queuedSubtitle"] },
  { label: "confirmation submitted", path: ["confirmation", "submittedSubtitle"] },
  { label: "confirmation accepted", path: ["confirmation", "acceptedSubtitle"] },
  { label: "confirmation rejected", path: ["confirmation", "rejectedSubtitle"] },
  { label: "confirmation unknown", path: ["confirmation", "unknownSubtitle"] },
  { label: "confirmation payment failed", path: ["confirmation", "paymentFailedSubtitle"] },
] as const;

function getNestedString(
  source: Record<string, unknown>,
  pathSegments: readonly string[],
): string | undefined {
  let current: unknown = source;

  for (const segment of pathSegments) {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : undefined;
}

function getWordCount(value: string): number {
  return value.match(/\p{L}[\p{L}\p{N}'’.-]*/gu)?.length ?? 0;
}

describe("main page subtitle wiring", () => {
  it("uses the dedicated short subtitle keys on the main product pages", () => {
    expect(homePageSource).toContain("<HomepageHero />");
    expect(homepageHeroSource).toContain('{t("homepage.hero.subtitle")}');
    expect(pricingPageSource).toContain('subtitle={t("subtitle")}');
    expect(helpPageSource).toContain('{t("subtitle")}');
    expect(newDraftPageSource).toContain('{td("entrySubtitle")}');
    expect(intakeStepSource).toContain('subtitle={t("intakeSubtitle")}');
    expect(senderStepSource).toContain('subtitle={t("senderDetailsSubtitle")}');
    expect(recipientStepSource).toContain('subtitle={t("recipientDetailsSubtitle")}');
    expect(attachmentsStepSource).toContain('subtitle={t("attachmentsStepSubtitle")}');
    expect(subjectStepSource).toContain('subtitle={t("subjectLineSubtitle")}');
    expect(logisticsStepSource).toContain('subtitle={t("logisticsSubtitle")}');
    expect(reviewPageSource).toContain('{t("subtitle")}');
    expect(checkoutPageSource).toContain('{t("checkoutIntro")}');
    expect(confirmationPageSource).toContain('subtitle: t("queuedSubtitle")');
    expect(confirmationPageSource).toContain('subtitle: t("submittedSubtitle")');
    expect(confirmationPageSource).toContain('subtitle: t("acceptedSubtitle")');
    expect(confirmationPageSource).toContain('subtitle: t("rejectedSubtitle")');
    expect(confirmationPageSource).toContain('subtitle: t("unknownSubtitle")');
    expect(confirmationPageSource).toContain('{payment.data?.failureReason ?? t("paymentFailedSubtitle")}');
  });
});

describe("main page subtitles", () => {
  for (const locale of locales) {
    describe(locale.name, () => {
      for (const subtitle of MAIN_PAGE_SUBTITLE_PATHS) {
        it(`${subtitle.label} stays within 3-4 words`, () => {
          const value = getNestedString(
            locale.data as Record<string, unknown>,
            subtitle.path,
          );

          expect(value).toBeDefined();
          expect(getWordCount(value ?? "")).toBeGreaterThanOrEqual(3);
          expect(getWordCount(value ?? "")).toBeLessThanOrEqual(4);
        });
      }
    });
  }
});

describe("confirmation fallback subtitles", () => {
  it("keeps rejected and payment-failed fallbacks short but action-oriented", () => {
    expect(enCH.confirmation.rejectedSubtitle).toBe("We'll review manually");
    expect(enCH.confirmation.paymentFailedSubtitle).toBe("Return to checkout");

    expect(deCH.confirmation.rejectedSubtitle).toBe("Wir prüfen manuell");
    expect(deCH.confirmation.paymentFailedSubtitle).toBe("Zur Kasse zurück");

    expect(frCH.confirmation.rejectedSubtitle).toBe("Nous vérifions manuellement");
    expect(frCH.confirmation.paymentFailedSubtitle).toBe("Retour au paiement");

    expect(itCH.confirmation.rejectedSubtitle).toBe("Ora verifichiamo manualmente");
    expect(itCH.confirmation.paymentFailedSubtitle).toBe("Torna alla cassa");
  });
});
