export interface LetterFraming {
  salutation: string;
  closing: string;
}

import type { DocumentModel } from "./document-response.ts";

const DE_CH_LETTER_FRAMING: LetterFraming = {
  salutation: "Sehr geehrte Damen und Herren",
  closing: "Freundliche Grüsse",
};

const FR_CH_LETTER_FRAMING: LetterFraming = {
  salutation: "Madame, Monsieur",
  closing: "Veuillez agréer, Madame, Monsieur, mes salutations distinguées",
};

const IT_CH_LETTER_FRAMING: LetterFraming = {
  salutation: "Gentili Signore e Signori",
  closing: "Distinti saluti",
};

const EN_CH_LETTER_FRAMING: LetterFraming = {
  salutation: "Dear Sir or Madam",
  closing: "Yours faithfully",
};

const LETTER_FRAMING_BY_LOCALE: Record<string, LetterFraming> = {
  "de-CH": DE_CH_LETTER_FRAMING,
  "fr-CH": FR_CH_LETTER_FRAMING,
  "it-CH": IT_CH_LETTER_FRAMING,
  "en-CH": EN_CH_LETTER_FRAMING,
};

const GENERIC_CLOSING_PATTERNS = [
  /^thank you for your (attention|consideration|understanding)\.?$/i,
  /^best regards\.?$/i,
  /^kind regards\.?$/i,
];

export function getLetterFraming(locale?: string | null): LetterFraming {
  if (!locale) {
    return EN_CH_LETTER_FRAMING;
  }

  const directMatch = LETTER_FRAMING_BY_LOCALE[locale];
  if (directMatch) {
    return directMatch;
  }

  if (locale.startsWith("de")) {
    return DE_CH_LETTER_FRAMING;
  }

  if (locale.startsWith("fr")) {
    return FR_CH_LETTER_FRAMING;
  }

  if (locale.startsWith("it")) {
    return IT_CH_LETTER_FRAMING;
  }

  return EN_CH_LETTER_FRAMING;
}

/**
 * Plain body text as a document model — one block per paragraph.
 *
 * Four copies of this lived in the renderer, the PDF-access bundle, the AI
 * stream, and the preview, and all four put the entire body in a single
 * paragraph. `stripLetterFramingDocument` can only remove a salutation or
 * closing that is its own leading or trailing block, so a body that opened with
 * "Sehr geehrte Damen und Herren" printed it twice — once from the body, once
 * from the frame the template adds around it. One implementation, so the
 * framing strip works everywhere a fallback is needed.
 */
export function documentFromPlainText(body: string | null | undefined): DocumentModel {
  const text = body ?? "";
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return {
    version: "1.0",
    blocks: (paragraphs.length > 0 ? paragraphs : [text]).map((paragraph) => ({
      type: "paragraph",
      text: paragraph,
      style: "Normal",
    })),
  };
}

export function stripLetterFramingText(text: string, locale?: string | null): string {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  trimLeadingSalutation(paragraphs, locale);
  trimTrailingClosing(paragraphs, locale);

  return paragraphs.join("\n\n").trim();
}

export function stripLetterFramingDocument(
  document: DocumentModel,
  locale?: string | null,
): DocumentModel {
  const blocks = [...document.blocks];

  trimEdgeBlankParagraphs(blocks);
  while (isFramingParagraph(blocks[0], locale, "salutation")) {
    blocks.shift();
    trimEdgeBlankParagraphs(blocks);
  }

  while (isFramingParagraph(blocks.at(-1), locale, "closing")) {
    blocks.pop();
    trimEdgeBlankParagraphs(blocks);
  }

  return {
    version: document.version,
    blocks,
  };
}

function trimLeadingSalutation(paragraphs: string[], locale?: string | null) {
  while (paragraphs[0] && isSalutationParagraph(paragraphs[0], locale)) {
    paragraphs.shift();
  }
}

function trimTrailingClosing(paragraphs: string[], locale?: string | null) {
  while (paragraphs.length > 0 && isClosingParagraph(paragraphs.at(-1) ?? "", locale)) {
    paragraphs.pop();
  }
}

function trimEdgeBlankParagraphs(blocks: DocumentModel["blocks"]) {
  while (isBlankParagraph(blocks[0])) {
    blocks.shift();
  }

  while (isBlankParagraph(blocks.at(-1))) {
    blocks.pop();
  }
}

function isBlankParagraph(block: DocumentModel["blocks"][number] | undefined): boolean {
  return block?.type === "paragraph" && block.text.trim().length === 0;
}

function isFramingParagraph(
  block: DocumentModel["blocks"][number] | undefined,
  locale: string | null | undefined,
  kind: "salutation" | "closing",
): boolean {
  if (!block || block.type !== "paragraph") {
    return false;
  }

  return kind === "salutation"
    ? isSalutationParagraph(block.text, locale)
    : isClosingParagraph(block.text, locale);
}

function isSalutationParagraph(text: string, locale?: string | null): boolean {
  const normalized = normalizeFramingText(text);
  return normalized === normalizeFramingText(getLetterFraming(locale).salutation);
}

function isClosingParagraph(text: string, locale?: string | null): boolean {
  const normalized = normalizeFramingText(text);
  if (normalized === normalizeFramingText(getLetterFraming(locale).closing)) {
    return true;
  }

  return GENERIC_CLOSING_PATTERNS.some((pattern) => pattern.test(text.trim()));
}

function normalizeFramingText(text: string): string {
  return text
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[,:;.!]+$/g, "")
    .toLocaleLowerCase();
}
