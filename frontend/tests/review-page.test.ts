import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const reviewPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/review/page.tsx"),
  "utf8",
);

describe("review page regressions", () => {
  it("keeps the quote hook above the early loading return", () => {
    expect(reviewPageSource.indexOf("const quote = useDispatchQuote")).toBeGreaterThan(
      -1,
    );
    expect(reviewPageSource.indexOf("if (draft.isLoading)")).toBeGreaterThan(-1);
    expect(reviewPageSource.indexOf("const quote = useDispatchQuote")).toBeLessThan(
      reviewPageSource.indexOf("if (draft.isLoading)"),
    );
  });

  it("renders snapshot-backed preview fields instead of mixing in live prepared draft data", () => {
    expect(reviewPageSource).toContain("previewData?.subject ?? draftData?.subject");
    expect(reviewPageSource).toContain("previewData?.body ?? draftData?.body");
    expect(reviewPageSource).toContain(
      "previewData?.enclosureNote ?? draftData?.enclosureNote",
    );
    expect(reviewPageSource).toContain(
      'previewData?.deliveryType ?? draftData?.deliveryType ?? "standard"',
    );
    expect(reviewPageSource).toContain(
      "previewData?.attachmentCount ?? attachments.length",
    );
  });

  it("does not request a live quote while the reviewed snapshot is still rendering", () => {
    expect(reviewPageSource).toContain('!["reviewed", "rendering"].includes');
    expect(reviewPageSource).toContain('allComplete ? t("pricingPending")');
  });

  it("blocks the payment CTA until a live quote exists", () => {
    expect(reviewPageSource).toContain("const canProceedToPayment =");
    expect(reviewPageSource).toContain("Boolean(quote.data)");
    expect(reviewPageSource).toContain("quoteErrorMessage");
  });

  it("disables the nested preview chrome on the review page", () => {
    expect(reviewPageSource).toContain("showHeader={false}");
  });

  it("restores the draft step menu in the review footer", () => {
    expect(reviewPageSource).toContain("<DraftStepMenu");
  });

  it("uses the shared action button primitives for review footer actions", () => {
    expect(reviewPageSource).toContain("ActionButton");
  });

  it("labels the footer back action by destination instead of generic editing copy", () => {
    expect(reviewPageSource).toContain('t("backToDraft")');
    expect(reviewPageSource).not.toContain('t("backToEditing")');
  });

  it("transitions draft back to fields_complete before navigating to workspace", () => {
    expect(reviewPageSource).toContain("useTransitionDraft");
    expect(reviewPageSource).toContain('{ status: "fields_complete" }');
    expect(reviewPageSource).toContain("handleBackToDraft");
  });
});
