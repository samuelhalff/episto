import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const reviewPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/review/page.tsx"),
  "utf8",
);

const reviewReadySource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/review/ReviewPageReady.tsx"),
  "utf8",
);

const flowActionDockSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/FlowActionDock.tsx"),
  "utf8",
);

const reviewSummaryCardSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/review/ReviewSummaryCard.tsx"),
  "utf8",
);

describe("review page regressions", () => {
  it("keeps the route file as a thin shell and moves hook-heavy ready logic into ReviewPageReady", () => {
    expect(reviewPageSource).toContain("<ReviewPageReady");
    expect(reviewPageSource).not.toContain("const reviewSummaryItems = useMemo");
    expect(reviewPageSource).not.toContain("const handleProceedToPayment = useCallback");
    expect(reviewReadySource).toContain("const reviewSummaryItems = useMemo");
    expect(reviewReadySource).toContain("const handleProceedToPayment = useCallback");
  });

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
    expect(reviewReadySource).toContain("previewData?.subject ?? draftData?.subject");
    expect(reviewReadySource).toContain("previewData?.body ?? draftData?.body");
    expect(reviewReadySource).toContain(
      "previewData?.enclosureNote ?? draftData?.enclosureNote",
    );
    expect(reviewReadySource).toContain(
      'previewData?.deliveryType ?? draftData?.deliveryType ?? "standard"',
    );
    expect(reviewReadySource).toContain(
      "previewData?.attachmentCount ?? attachments.length",
    );
  });

  it("treats ready_to_sign as a prepared draft instead of a still-rendering one", () => {
    expect(reviewReadySource).toContain('["reviewed", "rendering"].includes');
    expect(reviewReadySource).not.toContain(
      '["reviewed", "rendering", "ready_to_sign"].includes',
    );
    expect(reviewReadySource).toContain(
      '["ready", "ready_to_sign", "submitted", "dispatched", "closed"].includes',
    );
    expect(reviewReadySource).toContain('allComplete ? t("pricingPending")');
  });

  it("passes review-specific loading detail copy into the shared price summary", () => {
    expect(reviewReadySource).toContain('loadingMessage={t("calculatingPriceDetail")}');
  });

  it("blocks the payment CTA until a live quote exists", () => {
    expect(reviewReadySource).toContain("useReviewPrimaryActionState");
    expect(reviewReadySource).toContain("hasQuote: Boolean(quote.data)");
    expect(reviewReadySource).toContain("hasQuoteError: quote.isError");
    expect(reviewReadySource).toContain("reviewActionState.disabled");
  });

  it("shows an explicit calculating state on the review CTA while pricing is loading", () => {
    expect(reviewReadySource).toContain("useReviewPrimaryActionState");
    expect(reviewReadySource).not.toContain(
      '{isReviewPriceCalculating ? t("calculatingPrice") : t("proceedToPayment")}',
    );
  });

  it("disables the nested preview chrome on the review page", () => {
    expect(reviewReadySource).toContain("showHeader={false}");
  });

  it("restores the draft step menu in the review footer", () => {
    expect(reviewReadySource).toContain("<DraftStepMenu");
  });

  it("uses the shared action button primitives for review footer actions", () => {
    expect(reviewReadySource).toContain("ActionButton");
  });

  it("opts the review footer actions into the shared desktop minimum width treatment", () => {
    expect(reviewReadySource).toContain("desktopMinWidth");
  });

  it("labels the footer back action by destination instead of generic editing copy", () => {
    expect(reviewReadySource).toContain('t("backToDraft")');
    expect(reviewReadySource).not.toContain('t("backToEditing")');
  });

  it("transitions draft back to collecting before navigating to workspace", () => {
    expect(reviewReadySource).toContain("useTransitionDraft");
    expect(reviewReadySource).toContain('{ status: "collecting" }');
    expect(reviewReadySource).toContain("handleBackToDraft");
  });

  it("uses shared status badge chrome for the review summary without route-local color tokens", () => {
    expect(reviewReadySource).toContain("StatusBadge");
    expect(reviewReadySource).not.toContain("bg-emerald-50");
    expect(reviewReadySource).not.toContain("bg-amber-50");
  });

  it("renders review summary status as helper text instead of a badge beside selected options", () => {
    expect(reviewSummaryCardSource).not.toContain("StatusBadge");
    expect(reviewSummaryCardSource).toContain("statusLabel ? (");
    expect(reviewSummaryCardSource).toContain("text-xs leading-5");
    expect(reviewSummaryCardSource).toContain("{statusLabel}");
  });

  it("removes redundant subject and delivery recap rows from the review summary", () => {
    expect(reviewReadySource).not.toContain('label={t("subjectLine")}');
    expect(reviewReadySource).not.toContain('label={t("deliveryTypeLabel")}');
  });

  it("keeps the review footer visible on desktop with extra bottom spacing for the content", () => {
    expect(reviewReadySource).toContain(
      "lg:pb-[calc(12rem+env(safe-area-inset-bottom))]",
    );
    expect(flowActionDockSource).toContain("desktopSticky");
    expect(reviewReadySource).toContain("<FlowActionDock");
    expect(reviewReadySource).toContain("desktopSticky");
  });

  it("uses semantic destructive text instead of route-local red shades for review errors", () => {
    expect(reviewReadySource).toContain("text-destructive");
    expect(reviewReadySource).not.toContain("text-red-700 dark:text-red-400");
  });

  it("uses stable summary row keys instead of raw address text", () => {
    expect(reviewSummaryCardSource).toContain("values.map((line, index) =>");
    expect(reviewSummaryCardSource).toContain("key={`${label}-${index}`}");
    expect(reviewSummaryCardSource).not.toContain("key={line}");
  });

  it("shows the persisted public signature choice in the review surface", () => {
    expect(reviewReadySource).not.toContain("signatureAssuranceLevel");
    expect(reviewReadySource).toContain("getPublicSignatureChoice");
    expect(reviewReadySource).toContain("signatureTiers");
    expect(reviewReadySource).toContain("StatusBadge");
  });
});
