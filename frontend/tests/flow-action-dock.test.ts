import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

const srcDir = path.resolve(__dirname, "../src");

describe("FlowActionDock usage", () => {
  it("review page uses FlowActionDock", () => {
    const src = fs.readFileSync(
      path.join(srcDir, "app/[locale]/draft/[draftId]/review/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("<FlowActionDock");
  });

  it("checkout page uses FlowActionDock", () => {
    const src = fs.readFileSync(
      path.join(srcDir, "app/[locale]/draft/[draftId]/checkout/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("<FlowActionDock");
    expect(src).toContain("pb-[calc(11rem+env(safe-area-inset-bottom))]");
  });

  it("StripePaymentForm uses FlowActionDock", () => {
    const src = fs.readFileSync(
      path.join(srcDir, "components/product/StripePaymentForm.tsx"),
      "utf-8",
    );
    expect(src).toContain("<FlowActionDock");
  });
});

describe("FlowActionDock desktopSticky support", () => {
  it("FlowActionDock component accepts a desktopSticky prop", () => {
    const src = fs.readFileSync(
      path.join(srcDir, "components/product/FlowActionDock.tsx"),
      "utf-8",
    );
    expect(src).toContain("desktopSticky");
  });

  it("FlowActionDock desktop sticky mode includes a bottom offset so dock is not flush to viewport edge", () => {
    const src = fs.readFileSync(
      path.join(srcDir, "components/product/FlowActionDock.tsx"),
      "utf-8",
    );
    // Must have a lg:bottom-N class (e.g. lg:bottom-6) for the sticky offset
    expect(src).toMatch(/lg:bottom-\d/);
  });

  it("checkout page passes desktopSticky to FlowActionDock", () => {
    const src = fs.readFileSync(
      path.join(srcDir, "app/[locale]/draft/[draftId]/checkout/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("desktopSticky");
  });

  it("StripePaymentForm passes desktopSticky to FlowActionDock", () => {
    const src = fs.readFileSync(
      path.join(srcDir, "components/product/StripePaymentForm.tsx"),
      "utf-8",
    );
    expect(src).toContain("desktopSticky");
  });

  it("review page now opts into desktopSticky so the desktop CTA stays visible", () => {
    const src = fs.readFileSync(
      path.join(srcDir, "app/[locale]/draft/[draftId]/review/page.tsx"),
      "utf-8",
    );
    expect(src).toContain("desktopSticky");
  });
});
