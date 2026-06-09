# AI Document Response Pipeline

## Purpose

Episto's AI drafting pipeline now treats model output as a machine-readable document response instead of assuming that visually formatted text is structurally meaningful.

## Modes

The backend accepts a versioned JSON response contract with these modes:

- `plain_text` — raw text only, no structural formatting
- `structured_edit` — semantic operations that become document blocks
- `rich_content` — reserved and currently rejected for safety
- `invalid` — internal failure state only

## Flow

1. Prompt templates instruct the model to return strict JSON only.
2. `parseModelResponse` validates the response against a shared Zod schema.
3. `applyStructuredEdit` converts validated operations into a structured document model.
4. The backend stores:
   - `draft.body` as a plain-text compatibility rendering
   - `draft.metadata.aiDocument` as the structured document model and applied-operation log
5. Frontend preview and PDF rendering prefer `metadata.aiDocument.document` and fall back to `draft.body` when structured metadata is unavailable.

## Safety rules

- Markdown-like bullets, headings, and pipe tables are **not** treated as native structure by default.
- Plain-text fallback remains available for backward compatibility.
- Compatibility heuristics for pseudo-lists are opt-in and disabled in the live drafting flow.
- Rich content from the model is rejected unless a dedicated, validated path is introduced later.

## Current limitation

This repository does **not** contain a Microsoft Word add-in or Office.js application layer. The current implementation therefore applies the structured pipeline to Episto's internal document model, preview renderer, and PDF renderer rather than to Word-native ranges, styles, lists, or tables.
