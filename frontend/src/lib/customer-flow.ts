import {
  getDraftWorkspacePath,
  isDraftWorkspaceStepSlug,
  type DraftWorkspaceStepSlug,
} from "../components/product/draft-flow/steps";

export type CustomerFlowStep = DraftWorkspaceStepSlug | "review" | "checkout";

export const CUSTOMER_FLOW_STEPS: CustomerFlowStep[] = [
  "intake",
  "sender",
  "recipient",
  "body",
  "attachments",
  "subject",
  "logistics",
  "review",
  "checkout",
];

export function isDraftWorkspaceCustomerFlowStep(
  step: CustomerFlowStep | null,
): step is DraftWorkspaceStepSlug {
  return step !== null && isDraftWorkspaceStepSlug(step);
}

export function getPreviousCustomerFlowStep(
  currentStep: CustomerFlowStep,
): CustomerFlowStep | null {
  const index = CUSTOMER_FLOW_STEPS.indexOf(currentStep);
  if (index <= 0) {
    return null;
  }

  return CUSTOMER_FLOW_STEPS[index - 1] ?? null;
}

export function getNextCustomerFlowStep(
  currentStep: CustomerFlowStep,
): CustomerFlowStep | null {
  const index = CUSTOMER_FLOW_STEPS.indexOf(currentStep);
  if (index === -1 || index >= CUSTOMER_FLOW_STEPS.length - 1) {
    return null;
  }

  return CUSTOMER_FLOW_STEPS[index + 1] ?? null;
}

export function getCustomerFlowPath(
  draftId: string,
  step: CustomerFlowStep,
): string {
  switch (step) {
    case "review":
      return `/draft/${draftId}/review`;
    case "checkout":
      return `/draft/${draftId}/checkout`;
    default:
      return getDraftWorkspacePath(draftId, step);
  }
}

export function getCustomerFlowBackPath(
  draftId: string,
  currentStep: CustomerFlowStep,
): string | null {
  const previousStep = getPreviousCustomerFlowStep(currentStep);
  return previousStep ? getCustomerFlowPath(draftId, previousStep) : null;
}
