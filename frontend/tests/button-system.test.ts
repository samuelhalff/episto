import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppButton } from "../src/components/ui/app-button";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const actionButtonSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/ActionButton.tsx"),
  "utf8",
);
const cardsSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/cards.tsx"),
  "utf8",
);
const globalsCssSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/globals.css"),
  "utf8",
);

describe("shared button system", () => {
  it("renders a disabled loading button with a spinner affordance", () => {
    const markup = renderToStaticMarkup(
      createElement(
        AppButton,
        {
          loading: true,
          variant: "primary",
        },
        "Save",
      ),
    );

    expect(markup).toContain("disabled");
    expect(markup).toContain("animate-spin");
  });

  it("routes product button families through the shared primitive", () => {
    expect(actionButtonSource).toContain('from "../ui/app-button"');
    expect(cardsSource).toContain('from "../../ui/app-button"');
  });

  it("keeps shared warning and destructive button tokens available in globals", () => {
    expect(globalsCssSource).toContain(".btn-warning");
    expect(globalsCssSource).toContain(".btn-destructive");
    expect(globalsCssSource).toContain(".btn-ghost");
  });
});
