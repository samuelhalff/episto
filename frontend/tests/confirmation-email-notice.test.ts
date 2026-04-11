// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { ConfirmationEmailNotice } from "../src/components/product/ConfirmationEmailNotice";

describe("ConfirmationEmailNotice", () => {
  it("renders the payment receipt notice with clear hierarchy", () => {
    const { container } = render(
      React.createElement(ConfirmationEmailNotice, {
        eyebrow: "Payment receipt",
        title: "A payment receipt has been sent to your email",
        detail: "You'll also receive a dispatch email if the status changes.",
      }),
    );

    const root = container.firstElementChild as HTMLElement | null;

    expect(root).toBeTruthy();
    expect(root?.className).toContain("rounded-3xl");
    expect(root?.className).toContain("px-5");
    expect(root?.className).toContain("py-4");
    expect(root?.className).toContain("text-left");

    expect(screen.getByText("Payment receipt")).toBeTruthy();
    expect(
      screen.getByText("A payment receipt has been sent to your email"),
    ).toBeTruthy();
    expect(
      screen.getByText("You'll also receive a dispatch email if the status changes."),
    ).toBeTruthy();
  });
});
