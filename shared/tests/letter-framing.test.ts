import { describe, expect, it } from "vitest";
import {
  getLetterFraming,
  stripLetterFramingDocument,
  stripLetterFramingText,
} from "../src/letter-framing.js";

describe("getLetterFraming", () => {
  it("returns Swiss defaults for supported locales", () => {
    expect(getLetterFraming("de-CH")).toEqual({
      salutation: "Sehr geehrte Damen und Herren",
      closing: "Freundliche Grüsse",
    });
    expect(getLetterFraming("fr-CH")).toEqual({
      salutation: "Madame, Monsieur",
      closing: "Veuillez agréer, Madame, Monsieur, mes salutations distinguées",
    });
  });

  it("falls back by language family before defaulting to en-CH", () => {
    expect(getLetterFraming("de-DE")).toEqual({
      salutation: "Sehr geehrte Damen und Herren",
      closing: "Freundliche Grüsse",
    });
    expect(getLetterFraming("es-ES")).toEqual({
      salutation: "Dear Sir or Madam",
      closing: "Yours faithfully",
    });
  });

  it("strips system-managed framing from plain text bodies", () => {
    expect(
      stripLetterFramingText("Dear Sir or Madam,\n\nPlease cancel the contract.\n\nYours faithfully", "en-CH"),
    ).toBe("Please cancel the contract.");
  });

  it("strips system-managed framing from document blocks", () => {
    const stripped = stripLetterFramingDocument(
      {
        version: "1.0",
        blocks: [
          { type: "paragraph", text: "Dear Sir or Madam,", style: "Normal" },
          { type: "paragraph", text: "Please cancel the contract.", style: "Normal" },
          { type: "paragraph", text: "Yours faithfully", style: "Normal" },
        ],
      },
      "en-CH",
    );

    expect(stripped.blocks).toEqual([
      { type: "paragraph", text: "Please cancel the contract.", style: "Normal" },
    ]);
  });
});
