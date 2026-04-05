import type { DraftLetter } from "@swiss-mail/shared";
import { getDraftWorkspaceState } from "./workspace-state";

export const DRAFT_WORKSPACE_STEPS = [
  { id: "01", slug: "intake", routeSuffix: "", titleKey: "stepIntake" },
  { id: "02", slug: "sender", routeSuffix: "/sender", titleKey: "stepSender" },
  { id: "03", slug: "recipient", routeSuffix: "/recipient", titleKey: "stepRecipient" },
  { id: "04", slug: "body", routeSuffix: "/body", titleKey: "stepEditor" },
  { id: "05", slug: "attachments", routeSuffix: "/attachments", titleKey: "stepAttachments" },
  { id: "06", slug: "subject", routeSuffix: "/subject", titleKey: "stepSubject" },
  { id: "07", slug: "logistics", routeSuffix: "/logistics", titleKey: "stepLogistics" },
] as const;

export type DraftWorkspaceStepSlug = (typeof DRAFT_WORKSPACE_STEPS)[number]["slug"];
type DraftWorkspaceProgressDraft = Pick<
  DraftLetter,
  "body" | "metadata" | "recipientProfileId" | "senderProfileId" | "subject"
>;
const DEFAULT_UNLOCKED_STEP_INDEX = 1;
const LAST_DRAFT_WORKSPACE_STEP_INDEX = DRAFT_WORKSPACE_STEPS.length - 1;

export function isDraftWorkspaceStepSlug(value: string): value is DraftWorkspaceStepSlug {
  return DRAFT_WORKSPACE_STEPS.some((step) => step.slug === value);
}

export function clampDraftWorkspaceStepIndex(stepIndex: number): number {
  return Math.min(Math.max(stepIndex, 0), LAST_DRAFT_WORKSPACE_STEP_INDEX);
}

export function getDraftWorkspaceStepIndex(stepSlug?: DraftWorkspaceStepSlug): number {
  if (!stepSlug || stepSlug === "intake") {
    return 0;
  }

  return clampDraftWorkspaceStepIndex(
    DRAFT_WORKSPACE_STEPS.findIndex((step) => step.slug === stepSlug),
  );
}

export function getDraftWorkspacePath(
  draftId: string,
  stepSlug?: DraftWorkspaceStepSlug,
): string {
  const step =
    DRAFT_WORKSPACE_STEPS[getDraftWorkspaceStepIndex(stepSlug)] ?? DRAFT_WORKSPACE_STEPS[0];

  return `/draft/${draftId}${step.routeSuffix}`;
}

export function getDraftWorkspaceStepSlugFromPathname(
  pathname: string,
): DraftWorkspaceStepSlug | undefined {
  const lastPathSegment = pathname.split("/").filter(Boolean).at(-1);
  return lastPathSegment && isDraftWorkspaceStepSlug(lastPathSegment)
    ? lastPathSegment
    : undefined;
}

export function resolveDraftWorkspaceStepSlug(
  pathname: string,
  stepSlug?: DraftWorkspaceStepSlug,
): DraftWorkspaceStepSlug {
  return stepSlug ?? getDraftWorkspaceStepSlugFromPathname(pathname) ?? "intake";
}

export function getNextDraftWorkspaceStep(
  currentStepIndex: number,
): DraftWorkspaceStepSlug | undefined {
  return DRAFT_WORKSPACE_STEPS[Math.min(currentStepIndex + 1, DRAFT_WORKSPACE_STEPS.length - 1)]
    ?.slug;
}

export function getPreviousDraftWorkspaceStep(
  currentStepIndex: number,
): DraftWorkspaceStepSlug | undefined {
  if (currentStepIndex <= 0) {
    return undefined;
  }

  return DRAFT_WORKSPACE_STEPS[Math.max(currentStepIndex - 1, 0)]?.slug;
}

export function getDraftWorkspaceStepSlugByIndex(stepIndex: number): DraftWorkspaceStepSlug {
  return DRAFT_WORKSPACE_STEPS[clampDraftWorkspaceStepIndex(stepIndex)]?.slug ?? "intake";
}

function normalizeUnlockedStepIndex(value: unknown): number | undefined {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= DEFAULT_UNLOCKED_STEP_INDEX &&
    value <= LAST_DRAFT_WORKSPACE_STEP_INDEX
    ? value
    : undefined;
}

function inferDraftWorkspaceUnlockedStepIndex(
  draft: DraftWorkspaceProgressDraft | null | undefined,
): number {
  if (!draft) {
    return DEFAULT_UNLOCKED_STEP_INDEX;
  }

  let furthestUnlockedStepIndex = DEFAULT_UNLOCKED_STEP_INDEX;

  if (draft.senderProfileId) {
    furthestUnlockedStepIndex = 2;
  }

  if (draft.recipientProfileId) {
    furthestUnlockedStepIndex = 3;
  }

  if (draft.body?.trim()) {
    furthestUnlockedStepIndex = 4;
  }

  if (draft.subject?.trim()) {
    furthestUnlockedStepIndex = 6;
  }

  return furthestUnlockedStepIndex;
}

export function getDraftWorkspaceUnlockedStepIndex(
  draft: DraftWorkspaceProgressDraft | null | undefined,
): number {
  const workspaceState = getDraftWorkspaceState(draft?.metadata);
  const explicitUnlockIndex = normalizeUnlockedStepIndex(workspaceState.furthestUnlockedStepIndex);
  const inferredUnlockIndex = inferDraftWorkspaceUnlockedStepIndex(draft);

  return Math.max(explicitUnlockIndex ?? DEFAULT_UNLOCKED_STEP_INDEX, inferredUnlockIndex);
}

export function isDraftWorkspaceStepLocked(
  stepSlug: DraftWorkspaceStepSlug,
  furthestUnlockedStepIndex: number,
): boolean {
  return getDraftWorkspaceStepIndex(stepSlug) > furthestUnlockedStepIndex;
}
