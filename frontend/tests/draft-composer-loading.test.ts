import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DraftComposer } from "../src/components/product/draft-flow/draft-composer";

describe("draft composer loading affordance", () => {
  it("shows the spinner without the arrow while sending", () => {
    const markup = renderToStaticMarkup(
      createElement(DraftComposer, {
        placeholder: "Refine",
        value: "Tighten the closing",
        isSending: true,
      }),
    );

    expect(markup).toContain("animate-spin");
    expect(markup).not.toContain("lucide-arrow-up");
  });
});
