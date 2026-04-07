import {
  DRAFT_WORKSPACE_STEPS,
  getDraftWorkspacePath,
  isDraftWorkspaceStepSlug,
  type DraftWorkspaceStepSlug,
} from "../components/product/draft-flow/steps";

export type CustomerFlowStep = DraftWorkspaceStepSlug | "review" | "checkout";

export const CUSTOMER_FLOW_STEPS: CustomerFlowStep[] = [
  ...DRAFT_WORKSPACE_STEPS.map((s) => s.slug),
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

  const previousStep = CUSTOMER_FLOW_STEPS[index - 1];
  if (previousStep === undefined) {
    return null;
  }
  return previousStep;
}

export function getNextCustomerFlowStep(
  currentStep: CustomerFlowStep,
): CustomerFlowStep | null {
  const index = CUSTOMER_FLOW_STEPS.indexOf(currentStep);
  if (index === -1 || index >= CUSTOMER_FLOW_STEPS.length - 1) {
    return null;
  }

  const nextStep = CUSTOMER_FLOW_STEPS[index + 1];
  if (nextStep === undefined) {
    return null;
  }
  return nextStep;
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
