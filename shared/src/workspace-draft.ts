import { z } from "zod";
import { RecipientCompanySearchResult } from "./contracts/index.ts";

const WORKSPACE_DRAFT_KEY = "workspaceDraft";

export const SenderDraftFormSchema = z.object({
  fullName: z.string().default(""),
  addressLine1: z.string().default(""),
  postalCode: z.string().default(""),
  city: z.string().default(""),
});

export const RecipientDraftFormSchema = z.object({
  isCompany: z.boolean().default(false),
  showManual: z.boolean().default(false),
  fullName: z.string().default(""),
  companyName: z.string().default(""),
  selectedCompany: RecipientCompanySearchResult.nullable().default(null),
  addressLine1: z.string().default(""),
  postalCode: z.string().default(""),
  city: z.string().default(""),
});

/**
 * Slugs of the landing templates that may seed a draft. Service guides are absent
 * on purpose — they never seed. This is the canonical list; the frontend landing
 * routes are asserted against it so the two cannot drift.
 */
export const DRAFT_TEMPLATE_SLUGS = [
  "wohnung-kuendigen",
  "krankenkasse-kuendigen",
  "abo-kuendigen",
  "arbeitsvertrag-kuendigen",
  "versicherung-kuendigen",
  "handyabo-kuendigen",
  "fitnessabo-kuendigen",
  "beschwerde-schreiben",
  "mahnung-schreiben",
  "einsprache-erheben",
  "mietzins-senken",
  "brief-an-behoerde",
  "nebenkostenabrechnung-pruefen",
  "rechtsvorschlag-erheben",
  "mietmangel-melden",
  "arbeitszeugnis-korrigieren",
] as const;

export type DraftTemplateSlug = (typeof DRAFT_TEMPLATE_SLUGS)[number];

/**
 * Curated guidance copied from a landing template when a draft is seeded via
 * ?template=<slug>. Used by the assistant only as FRAMING (what to ask / whether
 * the letter is complete) — never as facts about the user. Treated as untrusted
 * input by the backend regardless (it re-sanitizes + caps before use).
 *
 * `slug` is constrained to the known templates so an arbitrary slug is not even
 * representable. This is fail-safe rather than fail-hard: getDraftWorkspaceState
 * safeParses templateContext on its own, so an unrecognized slug drops just the
 * template context and leaves the rest of the workspace state untouched.
 */
export const TemplateContextSchema = z.object({
  slug: z.enum(DRAFT_TEMPLATE_SLUGS),
  checklist: z.array(z.string()).default([]),
  considerations: z.array(z.string()).default([]),
});

export type TemplateContext = z.infer<typeof TemplateContextSchema>;

export const DraftWorkspaceStateSchema = z.object({
  intakeInput: z.string().optional(),
  senderForm: SenderDraftFormSchema.optional(),
  recipientForm: RecipientDraftFormSchema.optional(),
  bodyRefineInput: z.string().optional(),
  furthestUnlockedStepIndex: z.number().int().min(1).max(6).optional(),
  templateContext: TemplateContextSchema.optional(),
});

export type SenderDraftFormState = z.infer<typeof SenderDraftFormSchema>;
export type RecipientDraftFormState = z.infer<typeof RecipientDraftFormSchema>;
export type DraftWorkspaceState = z.infer<typeof DraftWorkspaceStateSchema>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function parseUnlockIndex(value: unknown): number | undefined {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 6
    ? value
    : undefined;
}

function parseSenderForm(value: unknown): SenderDraftFormState | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return SenderDraftFormSchema.parse({
    fullName: asString(value.fullName),
    addressLine1: asString(value.addressLine1),
    postalCode: asString(value.postalCode),
    city: asString(value.city),
  });
}

function parseRecipientForm(value: unknown): RecipientDraftFormState | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const selectedCompany = RecipientCompanySearchResult.safeParse(value.selectedCompany);

  return RecipientDraftFormSchema.parse({
    isCompany: asBoolean(value.isCompany),
    showManual: asBoolean(value.showManual),
    fullName: asString(value.fullName),
    companyName: asString(value.companyName),
    selectedCompany: selectedCompany.success ? selectedCompany.data : null,
    addressLine1: asString(value.addressLine1),
    postalCode: asString(value.postalCode),
    city: asString(value.city),
  });
}

export function getDraftWorkspaceState(metadata: unknown): DraftWorkspaceState {
  if (!isRecord(metadata)) {
    return {};
  }

  const workspaceDraft = metadata[WORKSPACE_DRAFT_KEY];
  if (!isRecord(workspaceDraft)) {
    return {};
  }

  const nextState: DraftWorkspaceState = {};
  const senderForm = parseSenderForm(workspaceDraft.senderForm);
  const recipientForm = parseRecipientForm(workspaceDraft.recipientForm);

  if (typeof workspaceDraft.intakeInput === "string") {
    nextState.intakeInput = workspaceDraft.intakeInput;
  }

  if (senderForm) {
    nextState.senderForm = senderForm;
  }

  if (recipientForm) {
    nextState.recipientForm = recipientForm;
  }

  if (typeof workspaceDraft.bodyRefineInput === "string") {
    nextState.bodyRefineInput = workspaceDraft.bodyRefineInput;
  }

  const furthestUnlockedStepIndex = parseUnlockIndex(
    workspaceDraft.furthestUnlockedStepIndex,
  );
  if (furthestUnlockedStepIndex !== undefined) {
    nextState.furthestUnlockedStepIndex = furthestUnlockedStepIndex;
  }

  const templateContext = TemplateContextSchema.safeParse(workspaceDraft.templateContext);
  if (templateContext.success) {
    nextState.templateContext = templateContext.data;
  }

  return nextState;
}

export function mergeDraftWorkspaceState(
  metadata: unknown,
  patch: Partial<
    Record<
      keyof DraftWorkspaceState,
      DraftWorkspaceState[keyof DraftWorkspaceState] | null
    >
  >,
): Record<string, unknown> {
  const nextMetadata = isRecord(metadata) ? { ...metadata } : {};
  const currentState = getDraftWorkspaceState(metadata);
  const nextState: DraftWorkspaceState = { ...currentState };

  for (const [key, value] of Object.entries(patch) as Array<
    [keyof DraftWorkspaceState, DraftWorkspaceState[keyof DraftWorkspaceState] | null]
  >) {
    if (value === null) {
      delete nextState[key];
      continue;
    }

    (nextState as Record<keyof DraftWorkspaceState, unknown>)[key] = value;
  }

  if (Object.keys(nextState).length === 0) {
    delete nextMetadata[WORKSPACE_DRAFT_KEY];
    return nextMetadata;
  }

  nextMetadata[WORKSPACE_DRAFT_KEY] = nextState;
  return nextMetadata;
}
