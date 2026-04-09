// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { ConfirmationEmailNotice } from "../src/components/product/ConfirmationEmailNotice";

describe("ConfirmationEmailNotice", () => {
  it("renders the order confirmation notice as a padded card with clear hierarchy", () => {
    const { container } = render(
      React.createElement(ConfirmationEmailNotice, {
        eyebrow: "Order confirmation",
        title: "A confirmation email has been sent to your email",
        detail: "You will receive another update if your dispatch status changes.",
      }),
    );

    const root = container.firstElementChild as HTMLElement | null;

    expect(root).toBeTruthy();
    expect(root?.className).toContain("rounded-3xl");
    expect(root?.className).toContain("px-5");
    expect(root?.className).toContain("py-4");
    expect(root?.className).toContain("text-left");

    expect(screen.getByText("Order confirmation")).toBeTruthy();
    expect(
      screen.getByText("A confirmation email has been sent to your email"),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "You will receive another update if your dispatch status changes.",
      ),
    ).toBeTruthy();
  });
});
