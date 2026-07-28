/**
 * Block- and inline-level HTML rendering for the letter body document model.
 *
 * Extracted from `render-template.ts` so that file stays under the 500-line
 * budget once the page furniture (fold marks, continuation header) is added.
 * Pure string work: no layout constants, no snapshot knowledge.
 */
import type { DocumentBlock, DocumentModel, InlineSpan, ListItem } from "@episto/shared";

export function renderDocumentHtml(document: DocumentModel): string {
  return document.blocks.map(renderBlockHtml).join("\n");
}

function renderBlockHtml(block: DocumentBlock): string {
  if (block.type === "paragraph") {
    const tag = paragraphTag(block.style);
    const className = paragraphClassName(block.style);
    const style = renderParagraphStyle(
      block.alignment,
      block.spacingBefore,
      block.spacingAfter,
      block.indentation,
    );
    return `<${tag} class="${className}"${style ? ` style="${style}"` : ""}>${renderInlineText(block.text, block.spans ?? [])}</${tag}>`;
  }

  if (block.type === "list") {
    const tag = block.listType === "numbered" ? "ol" : "ul";
    return `<${tag} class="letter-list">${renderListItemsHtml(block.items)}</${tag}>`;
  }

  const headerHtml = block.headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("");
  const rowsHtml = block.rows
    .map(
      (row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table class="letter-table"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

function renderListItemsHtml(items: ListItem[]): string {
  return items
    .map((item) => {
      const nested = item.children?.length
        ? `<ul class="letter-list">${renderListItemsHtml(item.children)}</ul>`
        : "";
      return `<li>${renderInlineText(item.text, item.spans ?? [])}${nested}</li>`;
    })
    .join("");
}

function renderInlineText(text: string, spans: InlineSpan[]): string {
  if (spans.length === 0) {
    return escapeHtml(text);
  }

  const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end);
  let cursor = 0;
  const segments: string[] = [];

  for (const span of sorted) {
    if (span.start > cursor) {
      segments.push(escapeHtml(text.slice(cursor, span.start)));
    }

    const content = escapeHtml(text.slice(span.start, span.end));
    const wrappers: string[] = [];
    if (span.bold) wrappers.push("strong");
    if (span.italic) wrappers.push("em");
    if (span.underline) wrappers.push("u");

    let wrapped = content;
    for (const wrapper of wrappers) {
      wrapped = `<${wrapper}>${wrapped}</${wrapper}>`;
    }
    segments.push(wrapped);
    cursor = span.end;
  }

  if (cursor < text.length) {
    segments.push(escapeHtml(text.slice(cursor)));
  }

  return segments.join("");
}

function paragraphTag(style: string): string {
  if (style === "Heading 1") return "h1";
  if (style === "Heading 2") return "h2";
  if (style === "Heading 3") return "h3";
  return "p";
}

function paragraphClassName(style: string): string {
  if (style === "Heading 1") return "letter-heading-1";
  if (style === "Heading 2") return "letter-heading-2";
  if (style === "Heading 3") return "letter-heading-3";
  return "letter-paragraph";
}

function renderParagraphStyle(
  alignment?: string,
  spacingBefore?: number,
  spacingAfter?: number,
  indentation?: number,
): string {
  const styles: string[] = [];
  if (alignment) styles.push(`text-align:${alignment}`);
  if (spacingBefore) styles.push(`margin-top:${spacingBefore}pt`);
  if (spacingAfter) styles.push(`margin-bottom:${spacingAfter}pt`);
  if (indentation) styles.push(`padding-left:${indentation}pt`);
  return styles.join(";");
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
