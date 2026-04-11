"use client";

import { Pencil, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { memo, useMemo } from "react";
import { SegmentedControl } from "./ui";
import type { EditMode } from "./bodyStepReducer";

interface BodyModeToolbarProps {
  editMode: EditMode;
  className: string;
  aiLabel: string;
  manualLabel: string;
  previewButton?: ReactNode;
  onModeChange: (mode: EditMode) => void;
}

export const BodyModeToolbar = memo(function BodyModeToolbar({
  editMode,
  className,
  aiLabel,
  manualLabel,
  previewButton,
  onModeChange,
}: BodyModeToolbarProps) {
  const modeOptions = useMemo(
    () => [
      {
        value: "ai" as const,
        label: aiLabel,
        icon: <Sparkles className="h-3 w-3" />,
      },
      {
        value: "manual" as const,
        label: manualLabel,
        icon: <Pencil className="h-3 w-3" />,
      },
    ],
    [aiLabel, manualLabel],
  );

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <SegmentedControl
            options={modeOptions}
            value={editMode}
            onChange={onModeChange}
          />
        </div>
        {previewButton ? <div className="shrink-0">{previewButton}</div> : null}
      </div>
    </div>
  );
});
