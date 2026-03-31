export interface BodyShortcutDefinition {
  id: string;
  labelKey: string;
  promptKey: string;
  requiresAttachments?: boolean;
  category: "content" | "refinement";
}

const PRIMARY_BODY_SHORTCUTS: readonly BodyShortcutDefinition[] = [
  {
    id: "formal",
    labelKey: "bodyQuickActionFormal",
    promptKey: "bodyQuickActionFormalPrompt",
    category: "refinement",
  },
  {
    id: "shorter",
    labelKey: "bodyQuickActionShorter",
    promptKey: "bodyQuickActionShorterPrompt",
    category: "refinement",
  },
  {
    id: "firmer",
    labelKey: "bodyQuickActionFirmer",
    promptKey: "bodyQuickActionFirmerPrompt",
    category: "refinement",
  },
  {
    id: "deadline",
    labelKey: "bodyQuickActionDeadline",
    promptKey: "bodyQuickActionDeadlinePrompt",
    category: "content",
  },
] as const;

const PRIMARY_FIRST_DRAFT_SHORTCUTS: readonly BodyShortcutDefinition[] = [
  {
    id: "confirmation",
    labelKey: "bodyQuickActionConfirmation",
    promptKey: "bodyQuickActionConfirmationPrompt",
    category: "content",
  },
  {
    id: "deadline",
    labelKey: "bodyQuickActionDeadline",
    promptKey: "bodyQuickActionDeadlinePrompt",
    category: "content",
  },
] as const;

const OVERFLOW_BODY_SHORTCUTS: readonly BodyShortcutDefinition[] = [
  {
    id: "softer",
    labelKey: "bodyQuickActionSofter",
    promptKey: "bodyQuickActionSofterPrompt",
    category: "content",
  },
  {
    id: "direct",
    labelKey: "bodyQuickActionDirect",
    promptKey: "bodyQuickActionDirectPrompt",
    category: "refinement",
  },
  {
    id: "opening",
    labelKey: "bodyQuickActionOpening",
    promptKey: "bodyQuickActionOpeningPrompt",
    category: "refinement",
  },
  {
    id: "closing",
    labelKey: "bodyQuickActionClosing",
    promptKey: "bodyQuickActionClosingPrompt",
    category: "refinement",
  },
  {
    id: "confirmation",
    labelKey: "bodyQuickActionConfirmation",
    promptKey: "bodyQuickActionConfirmationPrompt",
    category: "content",
  },
  {
    id: "attachments",
    labelKey: "bodyQuickActionAttachments",
    promptKey: "bodyQuickActionAttachmentsPrompt",
    requiresAttachments: true,
    category: "content",
  },
] as const;

const OVERFLOW_FIRST_DRAFT_SHORTCUTS: readonly BodyShortcutDefinition[] = [
  {
    id: "attachments",
    labelKey: "bodyQuickActionAttachments",
    promptKey: "bodyQuickActionAttachmentsPrompt",
    requiresAttachments: true,
    category: "content",
  },
] as const;

export function getBodyShortcutDefinitions(options: {
  hasAttachments: boolean;
  hasDraftBody: boolean;
}): {
  primary: readonly BodyShortcutDefinition[];
  overflow: readonly BodyShortcutDefinition[];
} {
  const primarySource = options.hasDraftBody
    ? PRIMARY_BODY_SHORTCUTS
    : PRIMARY_FIRST_DRAFT_SHORTCUTS;
  const overflowSource = options.hasDraftBody
    ? OVERFLOW_BODY_SHORTCUTS
    : OVERFLOW_FIRST_DRAFT_SHORTCUTS;

  return {
    primary: primarySource,
    overflow: overflowSource.filter(
      (shortcut) => !shortcut.requiresAttachments || options.hasAttachments,
    ),
  };
}
