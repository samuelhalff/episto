"use client";

import { Fragment, type CSSProperties, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import type { DraftLetter, DocumentBlock, DocumentModel, InlineSpan, ListItem } from "@swiss-mail/shared";
import { extractAiDocumentMetadata } from "@swiss-mail/shared";

/**
 * A4-like letter preview shown beside the conversation panel
 * in the workspace and as a read-only preview on the review page.
 *
 * Renders sender, recipient, date, subject, body, and signature
 * placeholders based on the current draft data.
 */
export function LetterPreview({ draft }: { draft: DraftLetter | undefined }) {
  const t = useTranslations("draft");

  if (!draft) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const document = extractAiDocumentMetadata(draft.metadata)?.document ?? fallbackDocument(draft.body ?? "");

  return (
    <div className="mx-auto w-full max-w-[595px]">
      <div className="rounded-lg border border-gray-200 bg-white p-10 shadow-sm">
        <div className="min-h-[600px] space-y-8 text-sm text-gray-700">
          <div className="text-xs text-gray-400">
            {draft.senderProfileId ? (
              <span className="text-gray-600">&#x2709; {t("senderLabel")}</span>
            ) : (
              <span className="italic">{t("senderPlaceholder")}</span>
            )}
          </div>

          <div className="mt-6 text-gray-400">
            {draft.recipientProfileId ? (
              <span className="text-gray-600">{t("recipientLabel")}</span>
            ) : (
              <span className="italic">{t("recipientPlaceholder")}</span>
            )}
          </div>

          <div className="text-right text-xs text-gray-400">
            {new Date().toLocaleDateString(draft.locale, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>

          <div className="font-semibold text-gray-900">
            {draft.subject ?? (
              <span className="font-normal italic text-gray-400">{t("subjectPlaceholder")}</span>
            )}
          </div>

          <div className="space-y-4 leading-relaxed">
            {draft.body ? (
              <DocumentPreview document={document} />
            ) : (
              <span className="italic text-gray-400">{t("bodyPlaceholder")}</span>
            )}
          </div>

          {draft.enclosureNote && (
            <div className="border-t pt-4 text-xs text-gray-500">{draft.enclosureNote}</div>
          )}

          {draft.signatureMode && (
            <div className="pt-6 text-gray-500">
              <span className="italic">{t("signatureLabel")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DocumentPreview({ document }: { document: DocumentModel }) {
  return (
    <div className="space-y-4">
      {document.blocks.map((block, index) => (
        <Fragment key={`${block.type}-${index}`}>{renderBlock(block)}</Fragment>
      ))}
    </div>
  );
}

function renderBlock(block: DocumentBlock) {
  if (block.type === "paragraph") {
    const className = paragraphClassName(block.style, block.alignment);
    const style: CSSProperties = {
      marginTop: block.spacingBefore ? `${block.spacingBefore}pt` : undefined,
      marginBottom: block.spacingAfter ? `${block.spacingAfter}pt` : undefined,
      paddingLeft: block.indentation ? `${block.indentation}pt` : undefined,
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
      <ListTag className="ml-6 space-y-2">
        {block.items.map((item, index) => (
          <ListItemPreview key={`${item.text}-${index}`} item={item} />
        ))}
      </ListTag>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-gray-100">
            {block.headers.map((header) => (
              <th key={header} className="border border-gray-300 px-3 py-2 font-semibold text-gray-800">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`cell-${rowIndex}-${cellIndex}`} className="border border-gray-300 px-3 py-2 align-top">
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

function ListItemPreview({ item }: { item: ListItem }) {
  return (
    <li className="leading-relaxed">
      <span>{renderInlineText(item.text, item.spans ?? [])}</span>
      {item.children && item.children.length > 0 ? (
        <ul className="ml-6 mt-2 space-y-2">
          {item.children.map((child, index) => (
            <ListItemPreview key={`${child.text}-${index}`} item={child} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function paragraphClassName(
  style: string,
  alignment?: string,
): string {
  const classes = ["whitespace-pre-wrap", "text-gray-700"];
  if (style === "Heading 1") classes.push("text-2xl", "font-bold", "text-gray-900");
  else if (style === "Heading 2") classes.push("text-xl", "font-bold", "text-gray-900");
  else if (style === "Heading 3") classes.push("text-lg", "font-semibold", "text-gray-900");
  else classes.push("text-sm");

  if (alignment === "center") classes.push("text-center");
  else if (alignment === "right") classes.push("text-right");
  else if (alignment === "justify") classes.push("text-justify");

  return classes.join(" ");
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
      nodes.push(<Fragment key={`plain-${index}-${cursor}`}>{text.slice(cursor, span.start)}</Fragment>);
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

function fallbackDocument(body: string): DocumentModel {
  return {
    version: "1.0",
    blocks: [
      {
        type: "paragraph",
        text: body,
        style: "Normal",
      },
    ],
  };
}
