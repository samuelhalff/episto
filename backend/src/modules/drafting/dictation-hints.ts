import type { DraftRow } from "./draft.service.js";
import type { RecipientProfileRow, SenderProfileRow } from "./profile.service.js";

export const DEFAULT_SWISS_RECIPIENT_HINTS = [
  "Swiss Post",
  "Migros",
  "Coop",
  "Swisscom",
  "SBB",
  "UBS",
  "AXA",
  "CSS",
  "Helsana",
  "Suva",
] as const;

function normalizeHint(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 120);
}

function joinName(firstName: string | null | undefined, lastName: string | null | undefined) {
  return normalizeHint([firstName, lastName].filter(Boolean).join(" "));
}

function dedupeHints(hints: Iterable<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const hint of hints) {
    const normalized = normalizeHint(hint);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLocaleLowerCase("en-CH");
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(normalized);
  }

  return deduped;
}

export function collectDraftContextHints(options: {
  draft: Pick<DraftRow, "subject" | "body"> | null;
  recipient: Pick<RecipientProfileRow, "company" | "firstName" | "lastName" | "city"> | null;
  sender: Pick<SenderProfileRow, "company" | "firstName" | "lastName" | "city"> | null;
}): string[] {
  return dedupeHints([
    options.recipient?.company,
    joinName(options.recipient?.firstName, options.recipient?.lastName),
    options.recipient?.city,
    options.sender?.company,
    joinName(options.sender?.firstName, options.sender?.lastName),
    options.draft?.subject,
  ]);
}

export function mergeDictationHints(options: {
  contextHints?: Iterable<string | null | undefined>;
  canonicalHints?: Iterable<string | null | undefined>;
  maxHints?: number;
}): string[] {
  const { contextHints = [], canonicalHints = DEFAULT_SWISS_RECIPIENT_HINTS, maxHints = 24 } =
    options;

  return dedupeHints([...contextHints, ...canonicalHints]).slice(0, maxHints);
}
