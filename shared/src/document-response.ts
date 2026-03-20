import { z } from "zod";

export const DOCUMENT_RESPONSE_VERSION = "1.0" as const;

export const ResponseModeSchema = z.enum([
  "plain_text",
  "structured_edit",
  "rich_content",
  "invalid",
]);

export const TargetScopeSchema = z.enum([
  "selection",
  "paragraph",
  "document_end",
  "document_start",
  "insertion_point",
]);

export const ParagraphStyleSchema = z.enum([
  "Normal",
  "Heading 1",
  "Heading 2",
  "Heading 3",
]);

export const ParagraphAlignmentSchema = z.enum([
  "left",
  "center",
  "right",
  "justify",
]);

export const InlineFormattingSchema = z
  .object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
  })
  .strict();

export const InlineSpanSchema = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.end > value.start, {
    message: "Inline span end must be greater than start",
    path: ["end"],
  });

export const ParagraphBlockSchema = z
  .object({
    type: z.literal("paragraph"),
    text: z.string(),
    style: ParagraphStyleSchema.default("Normal"),
    alignment: ParagraphAlignmentSchema.optional(),
    spacingBefore: z.number().nonnegative().optional(),
    spacingAfter: z.number().nonnegative().optional(),
    indentation: z.number().nonnegative().optional(),
    spans: z.array(InlineSpanSchema).optional(),
  })
  .strict();

interface ListItemShape {
  text: string;
  level: number;
  spans?: InlineSpan[] | undefined;
  children?: ListItemShape[] | undefined;
}

export const ListItemSchema: z.ZodType<ListItemShape> = z.lazy(() =>
  z
    .object({
      text: z.string(),
      level: z.number().int().min(1),
      spans: z.array(InlineSpanSchema).optional(),
      children: z.array(ListItemSchema).optional(),
    })
    .strict(),
);

export const ListBlockSchema = z
  .object({
    type: z.literal("list"),
    listType: z.enum(["bulleted", "numbered"]),
    restartNumbering: z.boolean().optional(),
    items: z.array(ListItemSchema).min(1),
  })
  .strict();

export const TableBlockSchema = z
  .object({
    type: z.literal("table"),
    headers: z.array(z.string()).min(1),
    rows: z.array(z.array(z.string())),
  })
  .strict()
  .superRefine((value, ctx) => {
    value.rows.forEach((row, index) => {
      if (row.length !== value.headers.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Row ${index} does not match header count`,
          path: ["rows", index],
        });
      }
    });
  });

export const DocumentBlockSchema = z.union([
  ParagraphBlockSchema,
  ListBlockSchema,
  TableBlockSchema,
]);

export const DocumentModelSchema = z
  .object({
    version: z.literal(DOCUMENT_RESPONSE_VERSION),
    blocks: z.array(DocumentBlockSchema),
  })
  .strict();

export const StructuredParagraphInputSchema = z
  .object({
    text: z.string(),
    style: ParagraphStyleSchema.optional(),
    alignment: ParagraphAlignmentSchema.optional(),
    spacingBefore: z.number().nonnegative().optional(),
    spacingAfter: z.number().nonnegative().optional(),
    indentation: z.number().nonnegative().optional(),
    spans: z.array(InlineSpanSchema).optional(),
  })
  .strict();

export const TableInputSchema = z
  .object({
    headers: z.array(z.string()).min(1),
    rows: z.array(z.array(z.string())),
  })
  .strict()
  .superRefine((value, ctx) => {
    value.rows.forEach((row, index) => {
      if (row.length !== value.headers.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Row ${index} does not match header count`,
          path: ["rows", index],
        });
      }
    });
  });

export const StructuredEditTargetSchema = z
  .object({
    scope: TargetScopeSchema,
  })
  .strict();

export const StructuredEditOperationSchema = z
  .object({
    type: z.enum([
      "replace_text",
      "insert_text",
      "insert_paragraph",
      "insert_paragraphs",
      "replace_with_blocks",
      "apply_style",
      "make_numbered_list",
      "make_bulleted_list",
      "insert_table",
      "apply_inline_formatting",
    ]),
    text: z.string().optional(),
    style: ParagraphStyleSchema.optional(),
    alignment: ParagraphAlignmentSchema.optional(),
    formatting: InlineFormattingSchema.optional(),
    spans: z.array(InlineSpanSchema).optional(),
    paragraphs: z.array(StructuredParagraphInputSchema).optional(),
    items: z.array(ListItemSchema).optional(),
    table: TableInputSchema.optional(),
    blocks: z.array(DocumentBlockSchema).optional(),
    restartNumbering: z.boolean().optional(),
    paragraphIndex: z.number().int().nonnegative().optional(),
  })
  .strict();

export const PlainTextResponseSchema = z
  .object({
    text: z.string(),
  })
  .strict();

export const StructuredEditResponseSchema = z
  .object({
    target: StructuredEditTargetSchema,
    operations: z.array(StructuredEditOperationSchema).min(1),
  })
  .strict();

export const RichContentResponseSchema = z
  .object({
    format: z.enum(["html", "ooxml"]),
    content: z.string().min(1),
  })
  .strict();

export const ModelResponseSchema = z
  .object({
    mode: ResponseModeSchema,
    version: z.literal(DOCUMENT_RESPONSE_VERSION),
    summary: z.string().optional(),
    plainText: PlainTextResponseSchema.optional(),
    structuredEdit: StructuredEditResponseSchema.optional(),
    richContent: RichContentResponseSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.mode === "plain_text" && !value.plainText) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "plainText is required when mode is plain_text",
        path: ["plainText"],
      });
    }

    if (value.mode === "structured_edit" && !value.structuredEdit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "structuredEdit is required when mode is structured_edit",
        path: ["structuredEdit"],
      });
    }

    if (value.mode === "rich_content" && !value.richContent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "richContent is required when mode is rich_content",
        path: ["richContent"],
      });
    }
  });

export const AiDocumentMetadataSchema = z
  .object({
    schemaVersion: z.literal(DOCUMENT_RESPONSE_VERSION),
    mode: z.enum(["plain_text", "structured_edit", "rich_content"]),
    summary: z.string().optional(),
    document: DocumentModelSchema,
    operationsApplied: z.array(z.string()),
    warnings: z.array(z.string()),
  })
  .strict();

export type InlineSpan = z.infer<typeof InlineSpanSchema>;
export type ParagraphBlock = z.infer<typeof ParagraphBlockSchema>;
export type ListItem = z.infer<typeof ListItemSchema>;
export type ListBlock = z.infer<typeof ListBlockSchema>;
export type TableBlock = z.infer<typeof TableBlockSchema>;
export type DocumentBlock = z.infer<typeof DocumentBlockSchema>;
export type DocumentModel = z.infer<typeof DocumentModelSchema>;
export type StructuredEditOperation = z.infer<typeof StructuredEditOperationSchema>;
export type ModelResponse = z.infer<typeof ModelResponseSchema>;
export type AiDocumentMetadata = z.infer<typeof AiDocumentMetadataSchema>;

export function cleanListItemText(text: string): string {
  return text
    .replace(/^\s*(?:[-*•]|\d+[.)]|[a-zA-Z][.)])\s+/, "")
    .trim();
}

export function createPlainTextDocument(text: string): DocumentModel {
  const normalized = text.replace(/\r\n/g, "\n");
  const paragraphs = normalized.length === 0 ? [""] : normalized.split(/\n{2,}/);

  return {
    version: DOCUMENT_RESPONSE_VERSION,
    blocks: paragraphs.map((paragraph) => ({
      type: "paragraph" as const,
      text: paragraph,
      style: "Normal" as const,
    })),
  };
}

function flattenListItems(items: ListItem[], depth = 0, ordered = false): string[] {
  return items.flatMap((item, index) => {
    const prefix = ordered ? `${index + 1}. ` : "- ";
    const indentation = "  ".repeat(depth);
    const line = `${indentation}${prefix}${item.text}`;
    const children = item.children?.length
      ? flattenListItems(item.children, depth + 1, ordered)
      : [];
    return [line, ...children];
  });
}

export function flattenDocumentModel(document: DocumentModel): string {
  return document.blocks
    .map((block) => {
      if (block.type === "paragraph") {
        return block.text;
      }

      if (block.type === "list") {
        return flattenListItems(block.items, 0, block.listType === "numbered").join("\n");
      }

      return [block.headers.join(" | "), ...block.rows.map((row) => row.join(" | "))].join("\n");
    })
    .join("\n\n")
    .trim();
}

export function extractAiDocumentMetadata(metadata: unknown): AiDocumentMetadata | null {
  if (!metadata || typeof metadata !== "object") return null;
  const candidate = (metadata as Record<string, unknown>).aiDocument;
  const parsed = AiDocumentMetadataSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
