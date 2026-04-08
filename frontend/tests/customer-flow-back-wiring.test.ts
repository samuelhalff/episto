import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const workspaceSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/components/product/draft-flow/DraftWorkspaceClient.tsx",
  ),
  "utf8",
);
const reviewSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/review/page.tsx"),
  "utf8",
);
const reviewReadySource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/review/ReviewPageReady.tsx"),
  "utf8",
);
const checkoutSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/[draftId]/checkout/page.tsx"),
  "utf8",
);
const confirmationSource = readFileSync(
  path.join(
    repoRoot,
    "frontend/src/app/[locale]/draft/[draftId]/confirmation/page.tsx",
  ),
  "utf8",
);

describe("customer flow back wiring", () => {
  it("uses the shared customer-flow helper instead of page-local back routes", () => {
    expect(workspaceSource).toContain('from "../../../lib/customer-flow"');
    expect(reviewReadySource).toContain('from "../../../lib/customer-flow"');
    expect(checkoutSource).toContain('from "../../../../../lib/customer-flow"');
    expect(confirmationSource).toContain('from "../../../../../lib/customer-flow"');

    expect(reviewReadySource).toContain('router.push(getCustomerFlowPath(draftId, "logistics"))');
    expect(reviewSource).not.toContain("router.push(`/draft/${draftId}`)");

    expect(checkoutSource).toContain("const backToReviewHref =");
    expect(checkoutSource).toContain('getCustomerFlowBackPath(draftId, "checkout")');
    expect(confirmationSource).toContain('getCustomerFlowPath(draftId, "checkout")');
  });
});
