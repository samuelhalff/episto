"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { DraftComposer, ComposerIconButton } from "./ui";

interface BodyComposerProps {
  value: string;
  placeholder: string;
  helperText?: string | undefined;
  isAiBusy: boolean;
  isCompactViewport?: boolean | undefined;
  isPreviewPanelVisible?: boolean | undefined;
  quickActionBadges?: ReactNode | undefined;
  showPreviewLabel: string;
  hidePreviewLabel: string;
  startDictationLabel: string;
  stopDictationLabel: string;
  unavailableTooltip?: string | undefined;
  isDictationRecording: boolean;
  isDictationSupported: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onFocusChange: (focused: boolean) => void;
  onTogglePreview: () => void;
  onToggleDictation: () => void;
}

export const BodyComposer = memo(function BodyComposer({
  value,
  placeholder,
  helperText,
  isAiBusy,
  isCompactViewport,
  isPreviewPanelVisible,
  quickActionBadges,
  showPreviewLabel,
  hidePreviewLabel,
  startDictationLabel,
  stopDictationLabel,
  unavailableTooltip,
  isDictationRecording,
  isDictationSupported,
  onChange,
  onSend,
  onFocusChange,
  onTogglePreview,
  onToggleDictation,
}: BodyComposerProps) {
  return (
    <DraftComposer
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onSend={onSend}
      onFocus={() => onFocusChange(true)}
      onBlur={() => onFocusChange(false)}
      helperText={helperText}
      isSending={isAiBusy}
      isCompactViewport={isCompactViewport}
      topBadges={quickActionBadges}
      leadingActions={
        <ComposerIconButton
          icon={isPreviewPanelVisible ? "preview-off" : "preview"}
          aria-label={isPreviewPanelVisible ? hidePreviewLabel : showPreviewLabel}
          onClick={onTogglePreview}
        />
      }
      trailingActions={
        <ComposerIconButton
          icon={isDictationRecording ? "stop" : "dictate"}
          tone="accent"
          aria-label={isDictationRecording ? stopDictationLabel : startDictationLabel}
          aria-pressed={isDictationRecording}
          title={!isDictationSupported ? unavailableTooltip : undefined}
          disabled={!isDictationSupported}
          isActive={isDictationRecording}
          pulse={isDictationRecording}
          onClick={onToggleDictation}
        />
      }
    />
  );
});
