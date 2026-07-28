import { z } from "zod";
import { RecipientCompanySearchResult } from "./contracts/index.ts";
import { DRAFT_CONTENT_LIMITS } from "./limits.ts";

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
 * Which landing template seeded a draft (`?template=<slug>`). The slug is the
 * *only* thing that crosses the wire: display copy is looked up from the landing
 * content and the assistant's guidance from `template-guidance/`, both keyed by
 * this one validated value.
 *
 * It used to carry `checklist` and `considerations` too. Because metadata is
 * client-writable, that let the two halves disagree — the panel could say
 * "Wohnung kündigen" while the model was steered by another template's guidance.
 * Narrowing the schema makes that unrepresentable rather than merely discouraged,
 * the same tactic as dropping `metadata` from the PATCH body. Drafts written
 * under the old shape still parse: z.object strips the extra keys.
 *
 * `slug` is constrained to the known templates so an arbitrary slug is not even
 * representable. This is fail-safe rather than fail-hard: getDraftWorkspaceState
 * safeParses templateContext on its own, so an unrecognized slug drops just the
 * template context and leaves the rest of the workspace state untouched.
 */
export const TemplateContextSchema = z.object({
  slug: z.enum(DRAFT_TEMPLATE_SLUGS),
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

/**
 * A *delta* on the workspace state: only the keys the client changed, with
 * `null` meaning "remove this key". The whole-metadata form is deliberately not
 * offered on the wire. A client that merges a patch into its own render-time
 * snapshot and sends the result erases everything written since that render —
 * by a finishing AI turn, another tab, or its own in-flight autosave. Sending
 * the delta lets the server apply it to the row it holds a lock on.
 */
export const DraftWorkspacePatchSchema = z
  .object({
    intakeInput: z.string().max(DRAFT_CONTENT_LIMITS.bodyChars).nullable().optional(),
    senderForm: SenderDraftFormSchema.nullable().optional(),
    recipientForm: RecipientDraftFormSchema.nullable().optional(),
    bodyRefineInput: z.string().max(DRAFT_CONTENT_LIMITS.bodyChars).nullable().optional(),
    furthestUnlockedStepIndex: z.number().int().min(1).max(6).nullable().optional(),
    templateContext: TemplateContextSchema.nullable().optional(),
  })
  .strict();

export type DraftWorkspacePatch = z.infer<typeof DraftWorkspacePatchSchema>;

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
    // An explicit `undefined` means "not part of this patch" — zod's `.optional()`
    // materializes absent keys as undefined, and writing it through would blank
    // a key the caller never mentioned.
    if (value === undefined) {
      continue;
    }

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
