import { describe, expect, it } from "vitest";
import { LETTER_COLORS } from "@swiss-mail/shared";

import {
  buildBlueSignatureSvgMarkup,
  buildBlueSignatureSvgResponse,
} from "../src/modules/rendering/drawn-signature.js";

describe("drawn signature rendering", () => {
  it("wraps png signatures in a blue svg mask", () => {
    const markup = buildBlueSignatureSvgMarkup({
      mimeType: "image/png",
      base64: "ZmFrZQ==",
    });

    expect(markup).toContain(LETTER_COLORS.signatureDrawnInk);
    expect(markup).toContain("data:image/png;base64,ZmFrZQ==");
  });

  it("preserves jpeg signatures inside the svg wrapper", () => {
    const markup = buildBlueSignatureSvgMarkup({
      mimeType: "image/jpeg",
      base64: "ZmFrZWpwZWc=",
    });

    expect(markup).toContain("data:image/jpeg;base64,ZmFrZWpwZWc=");
  });
});
