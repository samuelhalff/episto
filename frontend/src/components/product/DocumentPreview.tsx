"use client";

import { Fragment, type CSSProperties, type ReactNode } from "react";
import type { DocumentBlock, DocumentModel, InlineSpan, ListItem } from "@episto/shared";
import { documentFromPlainText } from "@episto/shared/letter-framing";
import {
  LETTER_COLORS,
  LETTER_LAYOUT_PT,
  mmToPageCqw,
  ptToPageCqw,
} from "@episto/shared";

type DocumentPreviewVariant = "default" | "letter";

export function DocumentPreview({
  document,
  variant = "default",
}: {
  document: DocumentModel;
  variant?: DocumentPreviewVariant;
}) {
  const isLetter = variant === "letter";

  return (
    <div
      className={isLetter ? "grid" : "space-y-4 text-zinc-700 dark:text-zinc-200"}
      style={isLetter ? { rowGap: mmToPageCqw(4) } : undefined}
    >
      {document.blocks.map((block, index) => (
        <Fragment key={`${block.type}-${index}`}>{renderBlock(block, variant)}</Fragment>
      ))}
    </div>
  );
}

function renderBlock(block: DocumentBlock, variant: DocumentPreviewVariant) {
  const isLetter = variant === "letter";

  if (block.type === "paragraph") {
    const className = paragraphClassName(block.style, block.alignment, variant);
    const style: CSSProperties = {
      marginTop: block.spacingBefore ? `${block.spacingBefore}pt` : undefined,
      marginBottom: block.spacingAfter ? `${block.spacingAfter}pt` : undefined,
      paddingLeft: block.indentation ? `${block.indentation}pt` : undefined,
      ...paragraphStyle(block.style, variant),
    };

    if (block.style === "Heading 1") {
      return (
        <h1 className={className} style={style}>
          {renderInlineText(block.text, block.spans ?? [])}
        </h1>
      );
    }

    if (block.style === "Heading 2") {
      return (
        <h2 className={className} style={style}>
          {renderInlineText(block.text, block.spans ?? [])}
        </h2>
      );
    }

    if (block.style === "Heading 3") {
      return (
        <h3 className={className} style={style}>
          {renderInlineText(block.text, block.spans ?? [])}
        </h3>
      );
    }

    return (
      <p className={className} style={style}>
        {renderInlineText(block.text, block.spans ?? [])}
      </p>
    );
  }

  if (block.type === "list") {
    const ListTag = block.listType === "numbered" ? "ol" : "ul";
    return (
      <ListTag
        className={isLetter ? "" : "ml-6 space-y-2 text-zinc-700 dark:text-zinc-200"}
        style={
          isLetter
            ? {
                marginLeft: "2.6cqw",
                display: "grid",
                rowGap: mmToPageCqw(1.5),
                fontSize: ptToPageCqw(LETTER_LAYOUT_PT.body),
                lineHeight: 1.55,
              }
            : undefined
        }
      >
        {block.items.map((item, index) => (
          <ListItemPreview key={`${item.text}-${index}`} item={item} variant={variant} />
        ))}
      </ListTag>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        className={`w-full border-collapse text-left${isLetter ? "" : " text-zinc-700 dark:text-zinc-200"}`}
        style={isLetter ? { fontSize: ptToPageCqw(LETTER_LAYOUT_PT.table) } : undefined}
      >
        <thead>
          <tr
            className={isLetter ? "" : "bg-zinc-100 dark:bg-zinc-800"}
            style={isLetter ? { background: LETTER_COLORS.tableHeaderBg } : undefined}
          >
            {block.headers.map((header) => (
              <th
                key={header}
                className={
                  isLetter
                    ? ""
                    : "border border-zinc-300 font-semibold text-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                }
                style={
                  isLetter
                    ? {
                        padding: `${mmToPageCqw(1.2)} ${mmToPageCqw(1.8)}`,
                        border: `1px solid ${LETTER_COLORS.tableBorder}`,
                        fontWeight: 600,
                      }
                    : undefined
                }
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className={
                    isLetter
                      ? "align-top"
                      : "border border-zinc-300 align-top dark:border-zinc-700"
                  }
                  style={
                    isLetter
                      ? {
                          padding: `${mmToPageCqw(1.2)} ${mmToPageCqw(1.8)}`,
                          border: `1px solid ${LETTER_COLORS.tableBorder}`,
                        }
                      : undefined
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListItemPreview({
  item,
  variant,
}: {
  item: ListItem;
  variant: DocumentPreviewVariant;
}) {
  const isLetter = variant === "letter";

  return (
    <li
      className={isLetter ? "" : "text-zinc-700 dark:text-zinc-200"}
      style={
        isLetter
          ? {
              lineHeight: 1.55,
              fontSize: ptToPageCqw(LETTER_LAYOUT_PT.body),
            }
          : undefined
      }
    >
      <span>{renderInlineText(item.text, item.spans ?? [])}</span>
      {item.children && item.children.length > 0 ? (
        <ul
          className={isLetter ? "" : "ml-6 mt-2 space-y-2"}
          style={
            isLetter
              ? {
                  marginLeft: "2.6cqw",
                  marginTop: mmToPageCqw(1.5),
                  display: "grid",
                  rowGap: mmToPageCqw(1.5),
                }
              : undefined
          }
        >
          {item.children.map((child, index) => (
            <ListItemPreview
              key={`${child.text}-${index}`}
              item={child}
              variant={variant}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function paragraphClassName(
  style: string,
  alignment: string | undefined,
  variant: DocumentPreviewVariant,
): string {
  const isLetter = variant === "letter";
  const classes = ["whitespace-pre-wrap"];
  if (!isLetter) classes.push("text-zinc-700", "dark:text-zinc-200");

  if (style === "Heading 1") {
    if (!isLetter) classes.push("font-bold", "text-zinc-900", "dark:text-zinc-50");
    if (variant === "default") classes.push("text-2xl");
  } else if (style === "Heading 2") {
    if (!isLetter) classes.push("font-bold", "text-zinc-900", "dark:text-zinc-50");
    if (variant === "default") classes.push("text-xl");
  } else if (style === "Heading 3") {
    if (!isLetter) classes.push("font-semibold", "text-zinc-900", "dark:text-zinc-100");
    if (variant === "default") classes.push("text-lg");
  } else if (variant === "default") {
    classes.push("text-sm", "leading-7");
  }

  if (alignment === "center") classes.push("text-center");
  else if (alignment === "right") classes.push("text-right");
  else if (alignment === "justify") classes.push("text-justify");

  return classes.join(" ");
}

function paragraphStyle(
  style: string,
  variant: DocumentPreviewVariant,
): CSSProperties | undefined {
  if (variant !== "letter") {
    return undefined;
  }

  if (style === "Heading 1") {
    return {
      fontSize: ptToPageCqw(LETTER_LAYOUT_PT.heading1),
      fontWeight: 700,
      margin: `${mmToPageCqw(2)} 0 ${mmToPageCqw(4)} 0`,
    };
  }

  if (style === "Heading 2") {
    return {
      fontSize: ptToPageCqw(LETTER_LAYOUT_PT.heading2),
      fontWeight: 700,
      margin: `${mmToPageCqw(2)} 0 ${mmToPageCqw(3)} 0`,
    };
  }

  if (style === "Heading 3") {
    return {
      fontSize: ptToPageCqw(LETTER_LAYOUT_PT.heading3),
      fontWeight: 700,
      margin: `${mmToPageCqw(1)} 0 ${mmToPageCqw(2)} 0`,
    };
  }

  return {
    fontSize: ptToPageCqw(LETTER_LAYOUT_PT.body),
    lineHeight: 1.55,
  };
}

function renderInlineText(text: string, spans: InlineSpan[]) {
  if (spans.length === 0) {
    return text;
  }

  const sorted = [...spans].sort((a, b) => a.start - b.start || a.end - b.end);
  const nodes: ReactNode[] = [];
  let cursor = 0;

  sorted.forEach((span, index) => {
    if (span.start > cursor) {
      nodes.push(
        <Fragment key={`plain-${index}-${cursor}`}>
          {text.slice(cursor, span.start)}
        </Fragment>,
      );
    }

    let content: React.ReactNode = text.slice(span.start, span.end);
    if (span.bold) content = <strong>{content}</strong>;
    if (span.italic) content = <em>{content}</em>;
    if (span.underline) content = <u>{content}</u>;
    nodes.push(<Fragment key={`span-${index}`}>{content}</Fragment>);
    cursor = span.end;
  });

  if (cursor < text.length) {
    nodes.push(<Fragment key={`tail-${cursor}`}>{text.slice(cursor)}</Fragment>);
  }

  return nodes;
}

// Re-exported so preview call sites keep their existing import; the one
// implementation lives in shared so the framing strip behaves identically in
// the preview and in the PDF.
export { documentFromPlainText as fallbackDocument };
