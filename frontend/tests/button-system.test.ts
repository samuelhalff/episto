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
const languageSwitcherSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/LanguageSwitcher.tsx"),
  "utf8",
);
const appToggleGroupSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/ui/app-toggle-group.tsx"),
  "utf8",
);
const inputSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/ui/input.tsx"),
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
  path.join(
    repoRoot,
    "frontend/src/components/product/draft-flow/PromptShortcutSheet.tsx",
  ),
  "utf8",
);
const siteMenuPanelSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/layout/SiteMenuPanel.tsx"),
  "utf8",
);
const marketingPrimitivesSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/marketing/primitives.tsx"),
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

  it("supports a shared desktop minimum width for reusable primary and secondary product actions", () => {
    expect(actionButtonSource).toContain("desktopMinWidth?: boolean");
    expect(actionButtonSource).toContain("lg:min-w-[10rem]");
    expect(actionButtonSource).toContain("lg:w-auto");
  });

  it("keeps shared primary, warning, and destructive button tokens available in globals", () => {
    expect(globalsCssSource).toContain(".btn-primary");
    expect(globalsCssSource).toContain(".btn-secondary");
    expect(globalsCssSource).toContain(".btn-warning");
    expect(globalsCssSource).toContain(".btn-destructive");
    expect(globalsCssSource).toContain(".btn-ghost");
  });

  it("defines yellow primary and grey secondary action tokens in globals", () => {
    expect(globalsCssSource).toContain("--action-primary-bg:");
    expect(globalsCssSource).toContain("--action-primary-hover:");
    expect(globalsCssSource).toContain("--action-secondary-bg:");
    expect(globalsCssSource).toContain("--action-secondary-border:");
    expect(globalsCssSource).toContain(
      "--action-secondary-border: rgba(24, 24, 27, 0.16);",
    );
    expect(globalsCssSource).toContain("background-color: var(--action-primary-bg);");
    expect(globalsCssSource).toContain("background-color: var(--action-secondary-bg);");
  });

  it("gives shared secondary actions an explicit neutral border", () => {
    expect(globalsCssSource).toContain(
      "border: 1px solid var(--action-secondary-border);",
    );
  });

  it("keeps the homepage hero secondary action as a dark outlined ghost button in light theme", () => {
    expect(marketingPrimitivesSource).toContain("bg-transparent");
    expect(marketingPrimitivesSource).toContain("border-zinc-950");
    expect(marketingPrimitivesSource).toContain("text-zinc-950");
    expect(marketingPrimitivesSource).toContain("hover:border-zinc-950");
    expect(marketingPrimitivesSource).toContain("hover:bg-zinc-950/[0.03]");
  });

  it("routes reusable selector pills and menu CTAs through shared action classes", () => {
    expect(appToggleGroupSource).toContain("ToggleGroupItem");
    expect(appToggleGroupSource).toContain("bg-[var(--action-choice-active-bg)]");
    expect(appToggleGroupSource).toContain("text-[var(--action-choice-active-fg)]");
    expect(languageSwitcherSource).toContain("AppToggleGroup");
    expect(siteMenuPanelSource).toContain("getAppButtonClassName");
  });

  it("uses the yellow app accent for shared shadcn input focus states", () => {
    expect(inputSource).toContain(
      "focus-visible:border-[var(--action-choice-active-border)]",
    );
    expect(inputSource).toContain(
      "focus-visible:ring-[var(--action-choice-active-border)]",
    );
    expect(inputSource).not.toContain("focus-visible:ring-zinc-300");
  });

  it("routes menu open and close triggers through the shared secondary action tokens", () => {
    expect(menuTriggerSource).toContain("getAppButtonClassName");
    expect(menuTriggerSource).toContain('variant: "secondary"');
    expect(menuTriggerSource).not.toContain("action-primary");
  });

  it("uses secondary styling for dismissive hide actions in the draft workspace", () => {
    expect(stepOverlaySource).toContain("SecondaryButton");
    expect(stepOverlaySource).toContain(
      '<SecondaryButton leadingVisual="hide" onClick={requestClose} hideIcon>',
    );
    expect(promptShortcutSheetSource).toContain(
      '<SecondaryButton leadingVisual="hide" onClick={() => onOpenChange(false)} hideIcon>',
    );
    expect(stepOverlaySource).not.toContain(
      "<PrimaryButton onClick={requestClose} hideIcon>",
    );
  });

  it("renders hide and back secondary actions with different leading icons", () => {
    expect(cardsSource).toContain('leadingVisual?: "back" | "hide" | "none"');
    expect(cardsSource).toContain('leadingVisual = "back"');
    expect(cardsSource).toContain('leadingVisual === "hide"');
    expect(cardsSource).toContain('<ArrowLeft className="h-4 w-4" />');
    expect(cardsSource).toContain('<X className="h-4 w-4" />');
    expect(cardsSource).toContain(
      "leadingIcon={!disabled && !loading ? leadingIcon : null}",
    );
  });
});
