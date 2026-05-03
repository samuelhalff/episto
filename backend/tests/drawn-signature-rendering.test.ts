import { describe, expect, it } from "vitest";
import { LETTER_COLORS } from "@episto/shared";

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
    expect(markup).toContain('mask-type="alpha"');
    expect(markup).toMatch(/mask id="signature-mask-[a-f0-9]+"/);
    expect(markup).toMatch(/mask="url\(#signature-mask-[a-f0-9]+\)"/);
  });

  it("preserves jpeg signatures inside the svg wrapper", () => {
    const markup = buildBlueSignatureSvgMarkup({
      mimeType: "image/jpeg",
      base64: "ZmFrZWpwZWc=",
    });

    expect(markup).toContain("data:image/jpeg;base64,ZmFrZWpwZWc=");
  });

  it("builds a utf-8 svg response buffer", () => {
    const response = buildBlueSignatureSvgResponse({
      mimeType: "image/png",
      base64: "ZmFrZQ==",
    });

    expect(Buffer.isBuffer(response)).toBe(true);
    expect(response.toString("utf8")).toContain(LETTER_COLORS.signatureDrawnInk);
    expect(response.toString("utf8")).toContain("<svg");
  });
});
