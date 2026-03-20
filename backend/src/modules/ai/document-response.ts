import {
  AiDocumentMetadataSchema,
  DOCUMENT_RESPONSE_VERSION,
  ModelResponseSchema,
  cleanListItemText,
  createPlainTextDocument,
  flattenDocumentModel,
  type AiDocumentMetadata,
  type DocumentBlock,
  type DocumentModel,
  type InlineSpan,
  type ListItem,
  type ModelResponse,
  type ParagraphBlock,
  type StructuredEditOperation,
} from "@swiss-mail/shared";
import { z } from "zod";

export interface ParseModelResponseOptions {
  expectedMode?: "plain_text" | "structured_edit" | "rich_content";
  allowPlainTextFallback?: boolean;
  compatibilityMode?: "plain_text_only" | "detect_pseudo_structure";
}

export interface ParsedModelResponse {
  ok: boolean;
  mode: ModelResponse["mode"];
  response: ModelResponse | null;
  warnings: string[];
  errors: string[];
}

export interface AppliedDocumentResult {
  mode: "plain_text" | "structured_edit" | "rich_content";
  summary?: string | undefined;
  body: string;
  document: DocumentModel;
  operationsApplied: string[];
  warnings: string[];
  metadata: AiDocumentMetadata;
}

const codeFencePattern = /^```(?:json)?\s*([\s\S]*?)```$/i;

export function parseModelResponse(
  raw: string,
  options: ParseModelResponseOptions = {},
): ParsedModelResponse {
  const warnings: string[] = [];
  const errors: string[] = [];
  const trimmed = raw.trim();
  const sanitized = stripCodeFences(trimmed);

  try {
    const parsedJson = JSON.parse(sanitized) as unknown;
    const parsedResponse = ModelResponseSchema.safeParse(parsedJson);
    if (parsedResponse.success) {
      return {
        ok: true,
        mode: parsedResponse.data.mode,
        response: parsedResponse.data,
        warnings,
        errors,
      };
    }

    errors.push(parsedResponse.error.issues.map((issue) => issue.message).join("; "));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Invalid JSON response");
  }

  if (options.compatibilityMode === "detect_pseudo_structure") {
    const heuristicResponse = maybeInterpretPseudoStructuredText(trimmed);
    if (heuristicResponse) {
      warnings.push("Fell back to compatibility heuristic for pseudo-structured text.");
      return {
        ok: true,
        mode: "structured_edit",
        response: heuristicResponse,
        warnings,
        errors,
      };
    }
  }

  if (options.allowPlainTextFallback ?? true) {
    if (options.expectedMode === "structured_edit") {
      warnings.push("Expected structured response but received invalid JSON; falling back to plain text.");
    }

    return {
      ok: true,
      mode: "plain_text",
      response: {
        mode: "plain_text",
        version: DOCUMENT_RESPONSE_VERSION,
        summary: "Plain-text fallback",
        plainText: {
          text: trimmed,
        },
      },
      warnings,
      errors,
    };
  }

  return {
    ok: false,
    mode: "invalid",
    response: null,
    warnings,
    errors,
  };
}

export function validateModelResponse(response: unknown): ModelResponse {
  return ModelResponseSchema.parse(response);
}

export function determineResponseMode(response: ModelResponse): ModelResponse["mode"] {
  return response.mode;
}

export function applyStructuredEdit(
  response: ModelResponse,
  currentDocument?: DocumentModel,
): AppliedDocumentResult {
  const mode = determineResponseMode(response);
  const warnings: string[] = [];

  if (mode === "rich_content") {
    throw new Error("Rich content responses are not enabled for this pipeline.");
  }

  if (mode === "invalid") {
    throw new Error("Invalid model response mode cannot be applied.");
  }

  if (mode === "plain_text") {
    const document = createPlainTextDocument(response.plainText?.text ?? "");
    return buildAppliedResult({
      mode,
      response,
      document,
      operationsApplied: ["plain_text"],
      warnings,
    });
  }

  const baseDocument = cloneDocument(currentDocument ?? emptyDocument());
  let workingDocument: DocumentModel = baseDocument;
  const operationsApplied: string[] = [];

  for (const operation of response.structuredEdit?.operations ?? []) {
    workingDocument = dispatchDocumentOperation(workingDocument, operation, warnings);
    operationsApplied.push(operation.type);
  }

  return buildAppliedResult({
    mode,
    response,
    document: workingDocument,
    operationsApplied,
    warnings,
  });
}

export function dispatchDocumentOperation(
  document: DocumentModel,
  operation: StructuredEditOperation,
  _warnings: string[] = [],
): DocumentModel {
  switch (operation.type) {
    case "replace_text": {
      return createPlainTextDocument(operation.text ?? "");
    }

    case "insert_text": {
      return appendBlocks(document, createPlainTextDocument(operation.text ?? "").blocks);
    }

    case "insert_paragraph": {
      return appendBlocks(document, [toParagraphBlock(operation)]);
    }

    case "insert_paragraphs": {
      return appendBlocks(document, (operation.paragraphs ?? []).map(toParagraphBlock));
    }

    case "replace_with_blocks": {
      return {
        version: DOCUMENT_RESPONSE_VERSION,
        blocks: cloneBlocks(operation.blocks ?? []),
      };
    }

    case "make_numbered_list":
    case "make_bulleted_list": {
      const items = (operation.items ?? []).map(normalizeListItem);
      return appendBlocks(document, [
        {
          type: "list",
          listType: operation.type === "make_numbered_list" ? "numbered" : "bulleted",
          restartNumbering: operation.restartNumbering,
          items,
        },
      ]);
    }

    case "insert_table": {
      if (!operation.table) {
        throw new Error("insert_table requires a table payload");
      }

      return appendBlocks(document, [
        {
          type: "table",
          headers: [...operation.table.headers],
          rows: operation.table.rows.map((row) => [...row]),
        },
      ]);
    }

    case "apply_style": {
      const paragraphIndex = operation.paragraphIndex ?? findLastParagraphIndex(document.blocks);
      if (paragraphIndex === -1) {
        throw new Error("apply_style requires an existing paragraph target");
      }

      const nextBlocks = cloneBlocks(document.blocks);
      const target = nextBlocks[paragraphIndex];
      if (!target || target.type !== "paragraph") {
        throw new Error("apply_style can only target a paragraph block");
      }

      target.style = operation.style ?? target.style;
      target.alignment = operation.alignment ?? target.alignment;
      return {
        version: DOCUMENT_RESPONSE_VERSION,
        blocks: nextBlocks,
      };
    }

    case "apply_inline_formatting": {
      const paragraphIndex = operation.paragraphIndex ?? findLastParagraphIndex(document.blocks);
      if (paragraphIndex === -1) {
        throw new Error("apply_inline_formatting requires an existing paragraph target");
      }

      const nextBlocks = cloneBlocks(document.blocks);
      const target = nextBlocks[paragraphIndex];
      if (!target || target.type !== "paragraph") {
        throw new Error("apply_inline_formatting can only target a paragraph block");
      }

      target.spans = validateInlineSpans(operation.text ?? target.text, operation.spans ?? target.spans ?? []);
      if (operation.text) {
        target.text = operation.text;
      }
      return {
        version: DOCUMENT_RESPONSE_VERSION,
        blocks: nextBlocks,
      };
    }

  }
}

function buildAppliedResult(args: {
  mode: "plain_text" | "structured_edit";
  response: ModelResponse;
  document: DocumentModel;
  operationsApplied: string[];
  warnings: string[];
}): AppliedDocumentResult {
  const document = sanitizeDocument(args.document);
  const metadata = AiDocumentMetadataSchema.parse({
    schemaVersion: DOCUMENT_RESPONSE_VERSION,
    mode: args.mode,
    summary: args.response.summary,
    document,
    operationsApplied: args.operationsApplied,
    warnings: args.warnings,
  });

  const result: AppliedDocumentResult = {
    mode: args.mode,
    body: flattenDocumentModel(document),
    document,
    operationsApplied: args.operationsApplied,
    warnings: args.warnings,
    metadata,
  };

  if (args.response.summary) {
    result.summary = args.response.summary;
  }

  return result;
}

function maybeInterpretPseudoStructuredText(raw: string): ModelResponse | null {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return null;

  const allBullets = lines.every((line) => /^[-*•]\s+/.test(line));
  if (allBullets) {
    return {
      mode: "structured_edit",
      version: DOCUMENT_RESPONSE_VERSION,
      summary: "Compatibility heuristic: pseudo bulleted list",
      structuredEdit: {
        target: { scope: "selection" },
        operations: [
          {
            type: "make_bulleted_list",
            items: lines.map((line) => ({ text: cleanListItemText(line), level: 1 })),
          },
        ],
      },
    };
  }

  const allNumbered = lines.every((line) => /^\d+[.)]\s+/.test(line));
  if (allNumbered) {
    return {
      mode: "structured_edit",
      version: DOCUMENT_RESPONSE_VERSION,
      summary: "Compatibility heuristic: pseudo numbered list",
      structuredEdit: {
        target: { scope: "selection" },
        operations: [
          {
            type: "make_numbered_list",
            items: lines.map((line) => ({ text: cleanListItemText(line), level: 1 })),
          },
        ],
      },
    };
  }

  return null;
}

function stripCodeFences(text: string): string {
  const match = text.match(codeFencePattern);
  return match?.[1]?.trim() ?? text;
}

interface ParagraphInput {
  text?: string | undefined;
  style?: ParagraphBlock["style"] | undefined;
  alignment?: ParagraphBlock["alignment"] | undefined;
  spacingBefore?: number | undefined;
  spacingAfter?: number | undefined;
  indentation?: number | undefined;
  spans?: InlineSpan[] | undefined;
}

function toParagraphBlock(input: ParagraphInput): ParagraphBlock {
  return {
    type: "paragraph",
    text: input.text ?? "",
    style: input.style ?? "Normal",
    alignment: input.alignment,
    spacingBefore: input.spacingBefore,
    spacingAfter: input.spacingAfter,
    indentation: input.indentation,
    spans: validateInlineSpans(input.text ?? "", input.spans ?? []),
  };
}

function normalizeListItem(item: ListItem): ListItem {
  return {
    text: cleanListItemText(item.text),
    level: item.level,
    spans: validateInlineSpans(item.text, item.spans ?? []),
    children: item.children?.map(normalizeListItem),
  };
}

function sanitizeDocument(document: DocumentModel): DocumentModel {
  return {
    version: DOCUMENT_RESPONSE_VERSION,
    blocks: document.blocks.map((block) => {
      if (block.type === "paragraph") {
        return toParagraphBlock(block);
      }

      if (block.type === "list") {
        return {
          ...block,
          items: block.items.map(normalizeListItem),
        };
      }

      return {
        ...block,
        headers: [...block.headers],
        rows: block.rows.map((row) => [...row]),
      };
    }),
  };
}

function validateInlineSpans(text: string, spans: InlineSpan[]): InlineSpan[] {
  return spans.map((span) => {
    if (span.end > text.length) {
      throw new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: `Inline span end ${span.end} exceeds text length ${text.length}`,
          path: ["end"],
        },
      ]);
    }

    return { ...span };
  });
}

function appendBlocks(document: DocumentModel, blocks: DocumentBlock[]): DocumentModel {
  return {
    version: DOCUMENT_RESPONSE_VERSION,
    blocks: [...cloneBlocks(document.blocks), ...cloneBlocks(blocks)],
  };
}

function emptyDocument(): DocumentModel {
  return {
    version: DOCUMENT_RESPONSE_VERSION,
    blocks: [],
  };
}

function cloneDocument(document: DocumentModel): DocumentModel {
  return {
    version: document.version,
    blocks: cloneBlocks(document.blocks),
  };
}

function cloneBlocks(blocks: DocumentBlock[]): DocumentBlock[] {
  return blocks.map((block) => {
    if (block.type === "paragraph") {
      return { ...block, spans: block.spans?.map((span) => ({ ...span })) };
    }

    if (block.type === "list") {
      return {
        ...block,
        items: block.items.map(cloneListItem),
      };
    }

    return {
      ...block,
      headers: [...block.headers],
      rows: block.rows.map((row) => [...row]),
    };
  });
}

function cloneListItem(item: ListItem): ListItem {
  return {
    ...item,
    spans: item.spans?.map((span) => ({ ...span })),
    children: item.children?.map(cloneListItem),
  };
}

function findLastParagraphIndex(blocks: DocumentBlock[]): number {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    if (blocks[index]?.type === "paragraph") {
      return index;
    }
  }

  return -1;
}
