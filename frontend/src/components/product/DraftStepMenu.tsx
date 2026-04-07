"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import type { DraftLetter } from "@swiss-mail/shared";
import { useTranslations } from "next-intl";

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
  triggerStyle?: "footer" | "toolbar" | undefined;
}

export function DraftStepMenu({
  draftId,
  draft,
  buttonClassName,
  fullWidth = false,
  triggerStyle = "footer",
}: DraftStepMenuProps) {
  const t = useTranslations("draft");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const furthestUnlockedStepIndex = getDraftWorkspaceUnlockedStepIndex(draft);
  const isToolbarTrigger = triggerStyle === "toolbar";

  return (
    <>
      {isToolbarTrigger ? (
        <button
          type="button"
          className={[
            "app-toolbar-button min-h-11 gap-2 rounded-2xl px-3.5 py-0 text-sm font-medium",
            fullWidth ? "w-full" : "",
            buttonClassName ?? "",
          ]
            .filter(Boolean)
            .join(" ")}
          onClick={() => setIsOpen(true)}
        >
          <Layers className="h-4 w-4 shrink-0" />
          <span>{t("stepsTitle")}</span>
        </button>
      ) : (
        <ActionButton
          variant="secondary"
          fullWidth={fullWidth}
          className={buttonClassName ?? ""}
          leadingIcon={<Layers className="h-4 w-4 shrink-0" />}
          onClick={() => setIsOpen(true)}
        >
          {t("stepsTitle")}
        </ActionButton>
      )}

      {isOpen ? (
        <StepOverlay
          currentStep={furthestUnlockedStepIndex}
          furthestUnlockedStepIndex={furthestUnlockedStepIndex}
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
