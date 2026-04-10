"use client";

import { createContext, useContext, type ReactNode } from "react";

interface StepInfo {
  id: string;
  title: string;
}

interface StepNavContextValue {
  steps: StepInfo[];
  currentStep: number;
  furthestUnlockedStepIndex: number;
  onStepSelect: (index: number) => void;
}

const StepNavContext = createContext<StepNavContextValue | null>(null);

export function StepNavProvider({
  children,
  ...value
}: StepNavContextValue & { children: ReactNode }) {
  return (
    <StepNavContext.Provider value={value}>{children}</StepNavContext.Provider>
  );
}

export function useStepNav(): StepNavContextValue | null {
  return useContext(StepNavContext);
}

// ---------------------------------------------------------------------------
// Preview panel context — consumed by DraftShell header for a global toggle
// ---------------------------------------------------------------------------

interface PreviewPanelContextValue {
  isVisible: boolean;
  onToggle: () => void;
}

const PreviewPanelContext = createContext<PreviewPanelContextValue | null>(null);

export function PreviewPanelProvider({
  children,
  ...value
}: PreviewPanelContextValue & { children: ReactNode }) {
  return (
    <PreviewPanelContext.Provider value={value}>{children}</PreviewPanelContext.Provider>
  );
}

export function usePreviewPanel(): PreviewPanelContextValue | null {
  return useContext(PreviewPanelContext);
}
