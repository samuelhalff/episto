import type { DraftWorkspaceStepSlug } from "./steps";

export interface DraftWorkspaceStepShellProps {
  draftId: string;
  onStepClick: () => void;
  isStepMenuOpen?: boolean;
  isCompactViewport?: boolean;
  isNavigating?: boolean;
  onPrevious?: (() => void) | undefined;
  previousStepLabel?: string | undefined;
  onInputFocusChange?: (focused: boolean) => void;
  beginNavigation?: () => void;
  navigateToStep?: (step: DraftWorkspaceStepSlug) => void;
}

export interface DraftWorkspacePreviewToggleProps {
  onTogglePreview?: (() => void) | undefined;
  isPreviewPanelVisible?: boolean | undefined;
}
