import { describe, expect, it } from "vitest";
import {
  applyStructuredEdit,
  dispatchDocumentOperation,
  parseModelResponse,
  validateModelResponse,
} from "../src/modules/ai/document-response.js";
import { DOCUMENT_RESPONSE_VERSION, type ModelResponse } from "@swiss-mail/shared";

describe("parseModelResponse", () => {
  it("supports plain text replacement", () => {
    const parsed = parseModelResponse(
      JSON.stringify({
        mode: "plain_text",
        version: DOCUMENT_RESPONSE_VERSION,
        plainText: { text: "Replacement text" },
      }),
    );

    expect(parsed.ok).toBe(true);
    expect(parsed.mode).toBe("plain_text");
  });

  it("parses a numbered list structured response", () => {
    const parsed = parseModelResponse(
      JSON.stringify({
        mode: "structured_edit",
        version: DOCUMENT_RESPONSE_VERSION,
        structuredEdit: {
          target: { scope: "selection" },
          operations: [
            {
              type: "make_numbered_list",
              items: [
                { text: "First step", level: 1 },
                { text: "Second step", level: 1 },
              ],
            },
          ],
        },
      }),
    );

    expect(parsed.ok).toBe(true);
    expect(parsed.response?.structuredEdit?.operations[0]?.type).toBe("make_numbered_list");
  });

  it("falls back to plain text on malformed JSON", () => {
    const parsed = parseModelResponse("{not valid json", {
      expectedMode: "structured_edit",
      allowPlainTextFallback: true,
    });

    expect(parsed.ok).toBe(true);
    expect(parsed.mode).toBe("plain_text");
    expect(parsed.warnings.join(" ")).toContain("Expected structured response");
  });

  it("falls back to plain text for prose when structured output was expected", () => {
    const parsed = parseModelResponse("This is just prose, not JSON.", {
      expectedMode: "structured_edit",
      allowPlainTextFallback: true,
    });

    expect(parsed.ok).toBe(true);
    expect(parsed.response?.plainText?.text).toBe("This is just prose, not JSON.");
  });

  it("ignores invalid optional sections that do not match the selected mode", () => {
    const parsed = parseModelResponse(
      JSON.stringify({
        mode: "plain_text",
        version: DOCUMENT_RESPONSE_VERSION,
        summary: "Formal cancellation request for a Swisscom contract.",
        plainText: {
          text: "I hereby request the cancellation of my contract with Swisscom at the earliest possible date.",
        },
        structuredEdit: {
          target: { scope: "selection" },
          operations: [],
        },
      }),
    );

    expect(parsed.ok).toBe(true);
    expect(parsed.mode).toBe("plain_text");
    expect(parsed.response?.plainText?.text).toContain("cancellation of my contract");
  });

  it("keeps pseudo-list text as plain text unless compatibility mode is enabled", () => {
    const parsed = parseModelResponse("- one\n- two", {
      expectedMode: "structured_edit",
      allowPlainTextFallback: true,
      compatibilityMode: "plain_text_only",
    });

    expect(parsed.mode).toBe("plain_text");
  });

  it("can interpret pseudo-list text when compatibility mode is explicitly enabled", () => {
    const parsed = parseModelResponse("- one\n- two", {
      expectedMode: "structured_edit",
      allowPlainTextFallback: true,
      compatibilityMode: "detect_pseudo_structure",
    });

    expect(parsed.mode).toBe("structured_edit");
    expect(parsed.response?.structuredEdit?.operations[0]?.type).toBe("make_bulleted_list");
  });
});

describe("applyStructuredEdit", () => {
  it("supports bullet lists", () => {
    const result = applyStructuredEdit({
      mode: "structured_edit",
      version: DOCUMENT_RESPONSE_VERSION,
      structuredEdit: {
        target: { scope: "selection" },
        operations: [
          {
            type: "make_bulleted_list",
            items: [
              { text: "- alpha", level: 1 },
              { text: "- beta", level: 1 },
            ],
          },
        ],
      },
    });

    const list = result.document.blocks[0];
    expect(list?.type).toBe("list");
    if (list?.type === "list") {
      expect(list.items[0]?.text).toBe("alpha");
      expect(list.items[1]?.text).toBe("beta");
    }
  });

  it("supports heading paragraphs", () => {
    const result = applyStructuredEdit({
      mode: "structured_edit",
      version: DOCUMENT_RESPONSE_VERSION,
      structuredEdit: {
        target: { scope: "selection" },
        operations: [
          {
            type: "replace_with_blocks",
            blocks: [
              { type: "paragraph", text: "Introduction", style: "Heading 1" },
            ],
          },
        ],
      },
    });

    expect(result.document.blocks[0]).toMatchObject({
      type: "paragraph",
      style: "Heading 1",
      text: "Introduction",
    });
  });

  it("supports multiple paragraphs", () => {
    const result = applyStructuredEdit({
      mode: "structured_edit",
      version: DOCUMENT_RESPONSE_VERSION,
      structuredEdit: {
        target: { scope: "selection" },
        operations: [
          {
            type: "insert_paragraphs",
            paragraphs: [
              { text: "First paragraph", style: "Normal" },
              { text: "Second paragraph", style: "Normal" },
            ],
          },
        ],
      },
    });

    expect(result.document.blocks).toHaveLength(2);
    expect(result.body).toContain("First paragraph");
    expect(result.body).toContain("Second paragraph");
  });

  it("strips locale-managed salutation and closing from plain text output", () => {
    const result = applyStructuredEdit(
      {
        mode: "plain_text",
        version: DOCUMENT_RESPONSE_VERSION,
        plainText: {
          text: "Dear Sir or Madam,\n\nPlease cancel the contract.\n\nYours faithfully",
        },
      },
      undefined,
      "en-CH",
    );

    expect(result.body).toBe("Please cancel the contract.");
    expect(result.document.blocks).toHaveLength(1);
  });

  it("supports heading plus paragraph combinations", () => {
    const result = applyStructuredEdit({
      mode: "structured_edit",
      version: DOCUMENT_RESPONSE_VERSION,
      structuredEdit: {
        target: { scope: "selection" },
        operations: [
          {
            type: "replace_with_blocks",
            blocks: [
              { type: "paragraph", text: "Summary", style: "Heading 2" },
              { type: "paragraph", text: "Body copy", style: "Normal" },
            ],
          },
        ],
      },
    });

    expect(result.document.blocks).toHaveLength(2);
    expect(result.document.blocks.some((block) => block.type === "paragraph" && block.style === "Heading 2")).toBe(true);
    expect(result.document.blocks.some((block) => block.type === "paragraph" && block.text === "Body copy")).toBe(true);
  });

  it("supports real tables", () => {
    const result = applyStructuredEdit({
      mode: "structured_edit",
      version: DOCUMENT_RESPONSE_VERSION,
      structuredEdit: {
        target: { scope: "selection" },
        operations: [
          {
            type: "insert_table",
            table: {
              headers: ["A", "B"],
              rows: [["1", "2"]],
            },
          },
        ],
      },
    });

    expect(result.document.blocks[0]).toMatchObject({
      type: "table",
      headers: ["A", "B"],
    });
  });

  it("supports multi-operation structured edits", () => {
    const response: ModelResponse = {
      mode: "structured_edit",
      version: DOCUMENT_RESPONSE_VERSION,
      structuredEdit: {
        target: { scope: "selection" },
        operations: [
          {
            type: "replace_with_blocks",
            blocks: [
              { type: "paragraph", text: "Agenda", style: "Heading 1" },
            ],
          },
          {
            type: "make_bulleted_list",
            items: [
              { text: "Point one", level: 1 },
              { text: "Point two", level: 1 },
            ],
          },
        ],
      },
    };

    const result = applyStructuredEdit(response);
    expect(result.operationsApplied).toEqual(["replace_with_blocks", "make_bulleted_list"]);
    expect(result.document.blocks.map((block) => block.type)).toEqual(["paragraph", "list"]);
  });

  it("supports inline formatting spans", () => {
    const result = applyStructuredEdit({
      mode: "structured_edit",
      version: DOCUMENT_RESPONSE_VERSION,
      structuredEdit: {
        target: { scope: "selection" },
        operations: [
          {
            type: "replace_with_blocks",
            blocks: [
              {
                type: "paragraph",
                text: "Important notice",
                style: "Normal",
                spans: [{ start: 0, end: 9, bold: true }],
              },
            ],
          },
        ],
      },
    });

    expect(result.document.blocks[0]).toMatchObject({
      type: "paragraph",
      spans: [{ start: 0, end: 9, bold: true }],
    });
  });
});

describe("validation and dispatch", () => {
  it("rejects invalid operation types", () => {
    expect(() =>
      validateModelResponse({
        mode: "structured_edit",
        version: DOCUMENT_RESPONSE_VERSION,
        structuredEdit: {
          target: { scope: "selection" },
          operations: [{ type: "explode_document" }],
        },
      }),
    ).toThrowError();
  });

  it("can apply style to an existing paragraph", () => {
    const initial = applyStructuredEdit({
      mode: "plain_text",
      version: DOCUMENT_RESPONSE_VERSION,
      plainText: { text: "Paragraph body" },
    }).document;

    const updated = dispatchDocumentOperation(initial, {
      type: "apply_style",
      style: "Heading 3",
      paragraphIndex: 0,
    });

    expect(updated.blocks[0]).toMatchObject({ style: "Heading 3" });
  });
});
