// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DraftLetter } from "@episto/shared";
import { LetterPreview } from "../src/components/product/LetterPreview";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.stubGlobal("React", React);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const letterPreviewSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/LetterPreview.tsx"),
  "utf8",
);

const baseDraft: DraftLetter = {
  id: "00000000-0000-4000-8000-000000000001",
  sessionId: "00000000-0000-4000-8000-000000000002",
  status: "collecting",
  locale: "en-CH",
  deliveryType: "standard",
  signatureFlowMode: "visual",
  subject: "Cancellation",
  body: "Please cancel my contract.",
  tone: null,
  intent: null,
  enclosureNote: null,
  signatureMode: null,
  senderProfileId: null,
  recipientProfileId: null,
  signatureAssetId: null,
  estimatedPages: null,
  reviewedAt: null,
  metadata: null,
  schemaVersion: 1,
  createdAt: "2026-06-04T00:00:00.000Z",
  updatedAt: "2026-06-04T00:00:00.000Z",
};

afterEach(() => {
  cleanup();
});

describe("letter preview layout", () => {
  it("keeps the paper surface on an A4 aspect ratio before content overflow expands it", () => {
    expect(letterPreviewSource).toContain("aspect-[210/297]");
  });

  it("uses the shared letter geometry with absolute paper coordinates", () => {
    expect(letterPreviewSource).toContain("letter-layout-shell");
    expect(letterPreviewSource).toContain("sender-block");
    expect(letterPreviewSource).toContain("dispatch-line");
    expect(letterPreviewSource).toContain("recipient-block");
    expect(letterPreviewSource).toContain("right-meta");
    expect(letterPreviewSource).toContain("body-flow");
    expect(letterPreviewSource).toContain("mmToPageCqw");
    expect(letterPreviewSource).toContain("ptToPageCqw");
    expect(letterPreviewSource).toContain('containerType: "inline-size"');
    expect(letterPreviewSource).toContain('position: "absolute"');
  });

  it("uses the shared color palette for letter content", () => {
    expect(letterPreviewSource).toContain("LETTER_COLORS");
    expect(letterPreviewSource).toContain("LETTER_COLORS.text");
    expect(letterPreviewSource).toContain("LETTER_COLORS.date");
    expect(letterPreviewSource).toContain("LETTER_COLORS.signatureScript");
    expect(letterPreviewSource).toContain("LETTER_COLORS.signatureName");
    expect(letterPreviewSource).toContain("LETTER_COLORS.enclosure");
  });

  it("renders body content with the preview-specific letter sizing", () => {
    expect(letterPreviewSource).toContain('variant="letter"');
  });

  it("renders signatures as a handwritten block with a typed name underneath", () => {
    expect(letterPreviewSource).toContain("signature-script");
    expect(letterPreviewSource).toContain("signature-name");
    expect(letterPreviewSource).not.toContain('{t("signatureLabel")}');
  });

  it("prints the sender name in the sign-off area before a signature is selected", () => {
    const { container } = render(
      React.createElement(LetterPreview, {
        draft: baseDraft,
        senderProfile: {
          firstName: "Sam",
          lastName: "Sender",
          company: null,
          department: null,
          addressLine1: "Main Street 1",
          addressLine2: null,
          postalCode: "8000",
          city: "Zurich",
          country: "CH",
        },
        recipientProfile: null,
        signatureMode: null,
        signatureUrl: null,
        showHeader: false,
      }),
    );

    expect(container.querySelector(".signature-script")).toBeNull();
    expect(container.querySelector(".signature-name")?.textContent).toBe("Sam Sender");
  });
});
