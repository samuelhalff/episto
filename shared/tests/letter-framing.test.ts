import { describe, expect, it } from "vitest";
import {
  documentFromPlainText,
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
      stripLetterFramingText(
        "Dear Sir or Madam,\n\nPlease cancel the contract.\n\nYours faithfully",
        "en-CH",
      ),
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

describe("documentFromPlainText", () => {
  it("splits a plain body into one block per paragraph", () => {
    const doc = documentFromPlainText("First para.\n\nSecond para.");

    expect(doc.blocks).toEqual([
      { type: "paragraph", text: "First para.", style: "Normal" },
      { type: "paragraph", text: "Second para.", style: "Normal" },
    ]);
  });

  /**
   * The reason this helper exists. A single-block fallback hid the salutation
   * and closing inside the body block, where the framing strip cannot see them
   * — so the rendered letter greeted the recipient twice and signed off twice.
   */
  it("produces blocks the framing strip can actually remove", () => {
    const stripped = stripLetterFramingDocument(
      documentFromPlainText(
        "Sehr geehrte Damen und Herren\n\nHiermit kündige ich den Vertrag.\n\nFreundliche Grüsse",
      ),
      "de-CH",
    );

    expect(stripped.blocks).toEqual([
      { type: "paragraph", text: "Hiermit kündige ich den Vertrag.", style: "Normal" },
    ]);
  });

  it("keeps a single-paragraph body intact", () => {
    expect(documentFromPlainText("Just one line.").blocks).toHaveLength(1);
  });

  it("returns one empty block for an empty body rather than nothing to render", () => {
    expect(documentFromPlainText(null).blocks).toEqual([
      { type: "paragraph", text: "", style: "Normal" },
    ]);
  });
});
