"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { User } from "lucide-react";
import {
  useDraft,
  useLetterPreview,
  useSetSender,
  useUpdateDraft,
} from "@/hooks/use-api";
import { useQueuedAutosave } from "@/hooks/use-queued-autosave";
import { ApiError } from "@/lib/api";
import { captureException } from "@/lib/error-tracking";
import { DraftShell, Card, PrimaryButton } from "./ui";
import {
  AddressAutocompleteField,
  type AddressResolutionState,
} from "./AddressAutocompleteField";
import { AddressFields } from "./AddressFields";
import { showStepErrorToast } from "./step-feedback";
import { getSenderStepValidation } from "./step-validation";
import {
  getDraftWorkspaceState,
  mergeDraftWorkspaceState,
  type SenderDraftFormState,
} from "./workspace-state";
import type { DraftWorkspaceStepShellProps } from "./step-props";

function getSenderPreviewName(sender: { firstName: string; lastName: string }): string {
  return [sender.firstName, sender.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

interface StepProps extends DraftWorkspaceStepShellProps {
  onNext: () => void;
}

export function SenderStep({
  draftId,
  onNext,
  onPrevious,
  onStepClick,
  isStepMenuOpen,
  isCompactViewport,
  onInputFocusChange,
  isNavigating,
  previousStepLabel,
}: StepProps) {
  const t = useTranslations("draft");
  const draft = useDraft(draftId);
  const preview = useLetterPreview(draftId);
  const setSender = useSetSender(draftId);
  const updateDraft = useUpdateDraft(draftId);

  const [isFormFocused, setIsFormFocused] = useState(false);
  const [fullName, setFullName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [requiresAddressSelection, setRequiresAddressSelection] = useState(false);
  const [pendingAddressSelectionLabel, setPendingAddressSelectionLabel] = useState<
    string | null
  >(null);
  const hasHydratedRef = useRef(false);

  const senderForm = useMemo(
    () =>
      ({
        fullName,
        addressLine1,
        postalCode,
        city,
      }) satisfies SenderDraftFormState,
    [addressLine1, city, fullName, postalCode],
  );
  const senderAutosave = useQueuedAutosave({
    value: senderForm,
    component: "SenderStep",
    save: async (nextForm) => {
      await updateDraft.mutateAsync({
        metadata: mergeDraftWorkspaceState(draft.data?.metadata, {
          senderForm: nextForm,
        }),
      });
    },
  });

  useEffect(() => {
    if (hasHydratedRef.current) return;

    const workspaceState = getDraftWorkspaceState(draft.data?.metadata);
    const savedSenderForm = workspaceState.senderForm;

    if (savedSenderForm) {
      startTransition(() => {
        setFullName(savedSenderForm.fullName);
        setAddressLine1(savedSenderForm.addressLine1);
        setPostalCode(savedSenderForm.postalCode);
        setCity(savedSenderForm.city);
      });
      senderAutosave.markPersisted(savedSenderForm);
      hasHydratedRef.current = true;
      return;
    }

    if (preview.previewData?.sender) {
      const senderPreview = {
        fullName: getSenderPreviewName(preview.previewData.sender),
        addressLine1: preview.previewData.sender.addressLine1 ?? "",
        postalCode: preview.previewData.sender.postalCode ?? "",
        city: preview.previewData.sender.city ?? "",
      } satisfies SenderDraftFormState;

      startTransition(() => {
        setFullName(senderPreview.fullName);
        setAddressLine1(senderPreview.addressLine1);
        setPostalCode(senderPreview.postalCode);
        setCity(senderPreview.city);
      });
      senderAutosave.markPersisted(senderPreview);
      hasHydratedRef.current = true;
      return;
    }

    senderAutosave.markPersisted({
      fullName: "",
      addressLine1: "",
      postalCode: "",
      city: "",
    });
    hasHydratedRef.current = true;
  }, [draft.data?.metadata, preview.previewData?.sender, senderAutosave]);

  const isResolvingSelection = pendingAddressSelectionLabel !== null;
  const canProceed = getSenderStepValidation({
    fullName,
    addressLine1,
    postalCode,
    city,
    isResolvingSelection,
    requiresAddressSelection,
  }).canProceed;

  function handleFocusChange(focused: boolean) {
    setIsFormFocused(focused);
    onInputFocusChange?.(focused);
  }

  const handleResolvedAddress = useCallback(
    (nextAddress: { addressLine1: string; postalCode: string; city: string }) => {
      setAddressLine1(nextAddress.addressLine1);
      setPostalCode(nextAddress.postalCode);
      setCity(nextAddress.city);
    },
    [],
  );
  const handleResolutionStateChange = useCallback((state: AddressResolutionState) => {
    setPendingAddressSelectionLabel(state.isResolving ? state.selectedLabel : null);
    setRequiresAddressSelection(state.requiresSelection);
  }, []);

  async function handleNext() {
    if (!canProceed || setSender.isPending || isResolvingSelection) return;

    senderAutosave.cancelPending();

    try {
      const parts = fullName.trim().split(/\s+/);
      const firstName = parts[0] ?? "";
      const lastName = parts.slice(1).join(" ");
      await setSender.mutateAsync({
        firstName,
        lastName,
        addressLine1: addressLine1.trim(),
        postalCode: postalCode.trim(),
        city: city.trim(),
      });
      await updateDraft.mutateAsync({
        metadata: mergeDraftWorkspaceState(draft.data?.metadata, {
          senderForm,
          furthestUnlockedStepIndex: 2,
        }),
      });
      senderAutosave.markPersisted(senderForm);
      onNext();
    } catch (error) {
      const userMessage = error instanceof ApiError ? error.getUserMessage() : null;
      showStepErrorToast({
        id: "sender-step-save-error",
        title: userMessage ?? t("stepSaveFailed"),
      });
      captureException(error instanceof Error ? error : new Error(String(error)), {
        component: "SenderStep",
        errorFamily: "validation_error",
      });
    }
  }

  return (
    <DraftShell
      step={1}
      totalSteps={7}
      title={t("senderDetailsTitle")}
      subtitle={t("senderDetailsSubtitle")}
      onStepClick={onStepClick}
      stepTriggerLabel={t("stepMenuLabel")}
      secondaryActionLabel={previousStepLabel}
      onSecondaryAction={onPrevious}
      isStepMenuOpen={isStepMenuOpen}
      isInputFocused={isFormFocused}
      isCompactViewport={isCompactViewport}
      isNavigating={isNavigating}
      primaryAction={
        <PrimaryButton
          onClick={handleNext}
          disabled={!canProceed || setSender.isPending || isResolvingSelection}
          loading={setSender.isPending || Boolean(isNavigating) || isResolvingSelection}
          tone={canProceed ? "primary" : "warning"}
          hideIcon={!canProceed}
        >
          {t("continueToRecipient")}
        </PrimaryButton>
      }
    >
      <div className="space-y-8 pb-4">
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              {t("yourIdentity")}
            </h3>
          </div>

          <div className="space-y-4">
            <Card isCompactViewport={isCompactViewport} density="thin">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span>{t("fullName")}</span>
                  </div>
                  <textarea
                    name="senderName"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onFocus={() => handleFocusChange(true)}
                    onBlur={() => handleFocusChange(false)}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = "auto";
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                    placeholder={t("fullName")}
                    rows={1}
                    className="app-form-control w-full resize-none overflow-hidden bg-transparent font-bold text-zinc-900 focus:outline-none placeholder:text-zinc-200 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                </div>

                <div className="space-y-4">
                  <AddressAutocompleteField
                    draftId={draftId}
                    inputName="senderAddressSearch"
                    currentAddress={{ addressLine1, postalCode, city }}
                    onResolvedAddress={handleResolvedAddress}
                    onResolutionStateChange={handleResolutionStateChange}
                    onFocusChange={handleFocusChange}
                  />
                  <AddressFields
                    namePrefix="sender"
                    addressLine1={addressLine1}
                    postalCode={postalCode}
                    city={city}
                    onAddressLine1Change={setAddressLine1}
                    onPostalCodeChange={setPostalCode}
                    onCityChange={setCity}
                    isResolvingSelection={isResolvingSelection}
                    pendingSelectionLabel={pendingAddressSelectionLabel}
                    onFocusChange={handleFocusChange}
                  />
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </DraftShell>
  );
}
