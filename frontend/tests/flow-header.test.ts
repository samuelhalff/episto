import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const flowHeaderSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/FlowHeader.tsx"),
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

describe("flow header actions", () => {
  it("accepts an injected header action so later flow steps keep their step controls", () => {
    expect(flowHeaderSource).toContain("headerAction?: ReactNode");
    expect(flowHeaderSource).toContain("{headerAction}");
  });

  it("keeps a step action in the review header", () => {
    expect(reviewPageSource).toContain("headerAction=");
    expect(reviewPageSource).toContain("triggerStyle=\"toolbar\"");
  });

  it("keeps checkout free of review-step navigation injected into the header", () => {
    expect(checkoutPageSource).not.toContain("headerAction=");
    expect(checkoutPageSource).not.toContain("<DraftStepMenu");
  });
});
