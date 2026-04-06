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
  });

  it("StripePaymentForm uses FlowActionDock", () => {
    const src = fs.readFileSync(
      path.join(srcDir, "components/product/StripePaymentForm.tsx"),
      "utf-8",
    );
    expect(src).toContain("<FlowActionDock");
  });
});
