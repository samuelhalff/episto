// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/components/ui/app-button", () => ({
  AppButton: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) =>
    React.createElement(
      "button",
      { type: "button", onClick, disabled: Boolean(disabled) },
      children,
    ),
}));

import { ConfirmDialog } from "../src/components/product/ConfirmDialog";

function ConfirmDialogHarness({ cancelDisabled = false }: { cancelDisabled?: boolean }) {
  const [open, setOpen] = React.useState(false);

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setOpen(true),
      },
      "Open dialog",
    ),
    React.createElement(ConfirmDialog, {
      open,
      title: "Start fresh",
      description: "This will discard the current draft.",
      confirmLabel: "Start over",
      cancelLabel: "Cancel",
      onConfirm: vi.fn(),
      onCancel: () => setOpen(false),
      cancelDisabled,
    }),
  );
}

describe("confirm dialog runtime behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("uses an accessible dialog and restores focus to the trigger after cancel", async () => {
    const user = userEvent.setup();

    render(React.createElement(ConfirmDialogHarness));

    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Start fresh" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("This will discard the current draft.")).toBeTruthy();
    expect(
      document.activeElement instanceof HTMLElement &&
        dialog.contains(document.activeElement),
    ).toBe(true);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes when the user clicks the overlay", async () => {
    const user = userEvent.setup();

    render(React.createElement(ConfirmDialogHarness));

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    const overlay = document.querySelector(".overlay-surface");
    if (!(overlay instanceof HTMLElement)) {
      throw new Error("Expected dialog overlay to render.");
    }

    await user.click(overlay);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the dialog open when dismissal is disabled", async () => {
    const user = userEvent.setup();

    render(React.createElement(ConfirmDialogHarness, { cancelDisabled: true }));

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    const overlay = document.querySelector(".overlay-surface");
    if (!(overlay instanceof HTMLElement)) {
      throw new Error("Expected dialog overlay to render.");
    }

    await user.click(overlay);

    expect(screen.getByRole("dialog", { name: "Start fresh" })).toBeTruthy();
  });
});
