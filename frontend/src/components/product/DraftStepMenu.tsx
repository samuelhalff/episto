"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import type { DraftLetter } from "@swiss-mail/shared";
import { useTranslations } from "next-intl";

import { useMediaQuery } from "../../hooks/use-media-query";
import { useRouter } from "../../i18n/navigation";
import { StepOverlay } from "./draft-flow/StepOverlay";
import {
  DRAFT_WORKSPACE_STEPS,
  getDraftWorkspacePath,
  getDraftWorkspaceUnlockedStepIndex,
} from "./draft-flow/steps";
import { ActionButton } from "./ActionButton";

interface DraftStepMenuProps {
  draftId: string;
  draft: Pick<
    DraftLetter,
    "body" | "metadata" | "recipientProfileId" | "senderProfileId" | "subject"
  >;
  buttonClassName?: string;
  fullWidth?: boolean;
}

export function DraftStepMenu({
  draftId,
  draft,
  buttonClassName,
  fullWidth = false,
}: DraftStepMenuProps) {
  const t = useTranslations("draft");
  const router = useRouter();
  const isCompactViewport = useMediaQuery("(max-width: 1023px)");
  const [isOpen, setIsOpen] = useState(false);
  const furthestUnlockedStepIndex = getDraftWorkspaceUnlockedStepIndex(draft);

  return (
    <>
      <ActionButton
        variant="secondary"
        fullWidth={fullWidth}
        className={buttonClassName ?? ""}
        leadingIcon={<Layers className="h-4 w-4 shrink-0" />}
        onClick={() => setIsOpen(true)}
      >
        {t("stepsTitle")}
      </ActionButton>

      {isOpen ? (
        <StepOverlay
          currentStep={furthestUnlockedStepIndex}
          furthestUnlockedStepIndex={furthestUnlockedStepIndex}
          isCompactViewport={isCompactViewport}
          steps={DRAFT_WORKSPACE_STEPS.map((step) => ({
            id: step.id,
            title: t(step.titleKey),
          }))}
          onClose={() => setIsOpen(false)}
          onSelect={(idx) => {
            const selectedStep = DRAFT_WORKSPACE_STEPS[idx];
            if (!selectedStep) {
              return;
            }

            router.push(getDraftWorkspacePath(draftId, selectedStep.slug));
          }}
        />
      ) : null}
    </>
  );
}
