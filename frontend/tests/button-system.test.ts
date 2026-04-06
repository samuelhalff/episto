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
const menuTriggerSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/layout/MenuTriggerButton.tsx"),
  "utf8",
);
const stepOverlaySource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/StepOverlay.tsx"),
  "utf8",
);
const promptShortcutSheetSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/PromptShortcutSheet.tsx"),
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

  it("routes menu open and close triggers through the shared secondary action tokens", () => {
    expect(menuTriggerSource).toContain("getAppButtonClassName");
    expect(menuTriggerSource).toContain('variant: "secondary"');
    expect(menuTriggerSource).not.toContain("action-primary");
  });

  it("uses secondary styling for dismissive hide actions in the draft workspace", () => {
    expect(stepOverlaySource).toContain("SecondaryButton");
    expect(stepOverlaySource).toContain('<SecondaryButton leadingVisual="hide" onClick={requestClose} hideIcon>');
    expect(promptShortcutSheetSource).toContain(
      '<SecondaryButton leadingVisual="hide" onClick={() => onOpenChange(false)} hideIcon>',
    );
    expect(stepOverlaySource).not.toContain('<PrimaryButton onClick={requestClose} hideIcon>');
  });

  it("renders hide and back secondary actions with different leading icons", () => {
    expect(cardsSource).toContain('leadingVisual?: "back" | "hide" | "none"');
    expect(cardsSource).toContain('leadingVisual = "back"');
    expect(cardsSource).toContain('leadingVisual === "hide"');
    expect(cardsSource).toContain("<ArrowLeft className=\"h-4 w-4\" />");
    expect(cardsSource).toContain("<X className=\"h-4 w-4\" />");
    expect(cardsSource).toContain(
      'leadingIcon={!disabled && !loading ? leadingIcon : null}',
    );
  });
});
