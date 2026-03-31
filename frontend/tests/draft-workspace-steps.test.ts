import { describe, expect, it } from "vitest";
import { resolveDraftWorkspaceStepSlug } from "../src/components/product/draft-flow/steps";

describe("resolveDraftWorkspaceStepSlug", () => {
  it("prefers the explicit route prop over the current pathname", () => {
    expect(
      resolveDraftWorkspaceStepSlug(
        "/en-CH/draft/9403619a-131a-41cf-b3a4-7f9b4683b3a7/recipient",
        "body",
      ),
    ).toBe("body");
  });

  it("falls back to the pathname step when no explicit step prop is provided", () => {
    expect(
      resolveDraftWorkspaceStepSlug(
        "/en-CH/draft/9403619a-131a-41cf-b3a4-7f9b4683b3a7/recipient",
      ),
    ).toBe("recipient");
  });

  it("defaults to intake when the pathname does not contain a step segment", () => {
    expect(
      resolveDraftWorkspaceStepSlug("/en-CH/draft/9403619a-131a-41cf-b3a4-7f9b4683b3a7"),
    ).toBe("intake");
  });
});
