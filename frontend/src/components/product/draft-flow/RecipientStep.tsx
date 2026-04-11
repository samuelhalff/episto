"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RecipientCompanySearchResultType } from "@swiss-mail/shared";
import { useTranslations } from "next-intl";
import {
  useDraft,
  useLetterPreview,
  useRecipientCompanyDetails,
  useRecipientCompanySearch,
  useSetRecipient,
  useUpdateDraft,
} from "@/hooks/use-api";
import { useQueuedAutosave } from "@/hooks/use-queued-autosave";
import { ApiError } from "@/lib/api";
import { captureError } from "@/lib/error-tracking";
import { showStepErrorToast } from "./step-feedback";
import type { DraftWorkspaceStepShellProps } from "./step-props";
import { getRecipientStepValidation } from "./step-validation";
import { RecipientForm } from "./RecipientForm";
import { DraftShell, PrimaryButton } from "./ui";
import {
  getDraftWorkspaceState,
  mergeDraftWorkspaceState,
  type RecipientDraftFormState,
} from "./workspace-state";

interface StepProps extends DraftWorkspaceStepShellProps {
  onNext: () => void;
}

function getRecipientPreviewName(recipient: {
  firstName: string | null;
  lastName: string | null;
  company: string | null;
}): string {
  if (recipient.company?.trim()) {
    return recipient.company.trim();
  }

  return [recipient.firstName ?? "", recipient.lastName ?? ""]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

export function RecipientStep({
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
  const setRecipient = useSetRecipient(draftId);
  const updateDraft = useUpdateDraft(draftId);

  const [isFormFocused, setIsFormFocused] = useState(false);
  const [isCompany, setIsCompany] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [selectedCompany, setSelectedCompany] =
    useState<RecipientCompanySearchResultType | null>(null);
  const [addressLine1, setAddressLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [requiresAddressSelection, setRequiresAddressSelection] = useState(false);
  const [pendingAddressSelectionLabel, setPendingAddressSelectionLabel] = useState<string | null>(
    null,
  );
  const [areCompanyResultsVisible, setAreCompanyResultsVisible] = useState(false);
  const hasHydratedRef = useRef(false);
  const lastAutofilledCompanyIdRef = useRef<string | null>(null);

  const recipientForm = useMemo(
    () =>
      ({
        isCompany,
        showManual,
        fullName,
        companyName,
        selectedCompany,
        addressLine1,
        postalCode,
        city,
      }) satisfies RecipientDraftFormState,
    [
      addressLine1,
      city,
      companyName,
      fullName,
      isCompany,
      postalCode,
      selectedCompany,
      showManual,
    ],
  );

  const recipientAutosave = useQueuedAutosave({
    value: recipientForm,
    component: "RecipientStep",
    save: async (nextForm) => {
      await updateDraft.mutateAsync({
        metadata: mergeDraftWorkspaceState(draft.data?.metadata, {
          recipientForm: nextForm,
        }),
      });
    },
  });

  const companySearch = useRecipientCompanySearch(
    draftId,
    companyName,
    isCompany && !showManual,
  );
  const companyDetails = useRecipientCompanyDetails(
    draftId,
    selectedCompany?.id ?? "",
    Boolean(isCompany && showManual && selectedCompany?.id),
  );
  const companySearchResults = companySearch.data ?? [];
  const displayedCompanySearchResults = companySearchResults.slice(0, 5);
  const shouldShowCompanySearchResults =
    isCompany && !showManual && companyName.trim().length >= 2;
  const companySelectionHint =
    isCompany && showManual && companyName.trim().length > 0
      ? t("companySelectedHint")
      : null;
  const selectedCompanyRegistryRef =
    selectedCompany?.registryUid ??
    selectedCompany?.registryId ??
    selectedCompany?.registryChid ??
    null;

  const handleCompanySearchChange = useCallback(
    (value: string) => {
      setCompanyName(value);
      if (selectedCompany && value.trim() !== selectedCompany.name) {
        setSelectedCompany(null);
      }
    },
    [selectedCompany],
  );

  const handleSelectCompany = useCallback((result: RecipientCompanySearchResultType) => {
    setCompanyName(result.name);
    setSelectedCompany(result);
    if (!city.trim() && result.legalSeat) {
      setCity(result.legalSeat);
    }
    lastAutofilledCompanyIdRef.current = null;
    setShowManual(true);
  }, [city]);

  const handleEditCompanySelection = useCallback(() => {
    setSelectedCompany(null);
    lastAutofilledCompanyIdRef.current = null;
    setShowManual(false);
  }, []);

  useEffect(() => {
    if (hasHydratedRef.current) return;

    const workspaceState = getDraftWorkspaceState(draft.data?.metadata);
    const savedRecipientForm = workspaceState.recipientForm;

    if (savedRecipientForm) {
      startTransition(() => {
        setIsCompany(savedRecipientForm.isCompany);
        setShowManual(savedRecipientForm.showManual);
        setFullName(savedRecipientForm.fullName);
        setCompanyName(savedRecipientForm.companyName);
        setSelectedCompany(savedRecipientForm.selectedCompany ?? null);
        setAddressLine1(savedRecipientForm.addressLine1);
        setPostalCode(savedRecipientForm.postalCode);
        setCity(savedRecipientForm.city);
      });
      recipientAutosave.markPersisted(savedRecipientForm);
      hasHydratedRef.current = true;
      return;
    }

    if (preview.previewData?.recipient) {
      const recipientName = getRecipientPreviewName(preview.previewData.recipient);
      const parts = recipientName.split(" ");
      const recipientPreview = {
        isCompany:
          Boolean(preview.previewData.recipient.company?.trim()) || parts.length < 2,
        showManual:
          Boolean(preview.previewData.recipient.company?.trim()) || parts.length >= 2,
        fullName: preview.previewData.recipient.company?.trim() ? "" : recipientName,
        companyName: preview.previewData.recipient.company?.trim()
          ? recipientName
          : parts.length >= 2
            ? ""
            : recipientName,
        selectedCompany: null,
        addressLine1: preview.previewData.recipient.addressLine1 ?? "",
        postalCode: preview.previewData.recipient.postalCode ?? "",
        city: preview.previewData.recipient.city ?? "",
      } satisfies RecipientDraftFormState;

      startTransition(() => {
        setIsCompany(recipientPreview.isCompany);
        setShowManual(recipientPreview.showManual);
        setFullName(recipientPreview.fullName);
        setCompanyName(recipientPreview.companyName);
        setAddressLine1(recipientPreview.addressLine1);
        setPostalCode(recipientPreview.postalCode);
        setCity(recipientPreview.city);
      });
      recipientAutosave.markPersisted(recipientPreview);
      hasHydratedRef.current = true;
      return;
    }

    recipientAutosave.markPersisted({
      isCompany: false,
      showManual: false,
      fullName: "",
      companyName: "",
      selectedCompany: null,
      addressLine1: "",
      postalCode: "",
      city: "",
    });
    hasHydratedRef.current = true;
  }, [draft.data?.metadata, preview.previewData?.recipient, recipientAutosave]);

  useEffect(() => {
    if (!selectedCompany?.id || !companyDetails.data) {
      return;
    }

    if (lastAutofilledCompanyIdRef.current === selectedCompany.id) {
      return;
    }

    startTransition(() => {
      setCompanyName(companyDetails.data.name);
      setAddressLine1(companyDetails.data.addressLine1 ?? "");
      setPostalCode(companyDetails.data.postalCode ?? "");
      setCity(companyDetails.data.city ?? selectedCompany.legalSeat ?? "");
    });
    lastAutofilledCompanyIdRef.current = selectedCompany.id;
  }, [companyDetails.data, selectedCompany]);

  useEffect(() => {
    if (
      !shouldShowCompanySearchResults ||
      companySearch.isLoading ||
      companySearch.isFetching ||
      displayedCompanySearchResults.length === 0
    ) {
      startTransition(() => {
        setAreCompanyResultsVisible(false);
      });
      return;
    }

    let cancelled = false;
    startTransition(() => {
      setAreCompanyResultsVisible(false);
    });

    const frameId = window.requestAnimationFrame(() => {
      if (!cancelled) {
        startTransition(() => {
          setAreCompanyResultsVisible(true);
        });
      }
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [
    companySearch.isFetching,
    companySearch.isLoading,
    displayedCompanySearchResults.length,
    shouldShowCompanySearchResults,
  ]);

  const isResolvingSelection = pendingAddressSelectionLabel !== null;
  const canProceed = getRecipientStepValidation({
    isCompany,
    showManual,
    fullName,
    companyName,
    addressLine1,
    postalCode,
    city,
    hasSelectedCompany: selectedCompany !== null,
    isResolvingSelection,
    requiresAddressSelection,
  }).canProceed;

  const handleFocusChange = useCallback((focused: boolean) => {
    setIsFormFocused(focused);
    onInputFocusChange?.(focused);
  }, [onInputFocusChange]);

  const handleResolvedAddress = useCallback(
    (nextAddress: { addressLine1: string; postalCode: string; city: string }) => {
      setAddressLine1(nextAddress.addressLine1);
      setPostalCode(nextAddress.postalCode);
      setCity(nextAddress.city);
    },
    [],
  );

  const handleResolutionStateChange = useCallback((state: {
    isResolving: boolean;
    selectedLabel: string | null;
    requiresSelection: boolean;
  }) => {
    setPendingAddressSelectionLabel(state.isResolving ? state.selectedLabel : null);
    setRequiresAddressSelection(state.requiresSelection);
  }, []);

  async function handleNext() {
    if (!canProceed || setRecipient.isPending || isResolvingSelection) return;

    recipientAutosave.cancelPending();

    try {
      const parts = fullName.trim().split(/\s+/);
      await setRecipient.mutateAsync({
        firstName: isCompany ? undefined : (parts[0] ?? ""),
        lastName: isCompany ? undefined : parts.slice(1).join(" "),
        companyName: isCompany ? companyName.trim() : undefined,
        addressLine1: addressLine1.trim(),
        postalCode: postalCode.trim(),
        city: city.trim(),
      });
      await updateDraft.mutateAsync({
        metadata: mergeDraftWorkspaceState(draft.data?.metadata, {
          recipientForm,
          furthestUnlockedStepIndex: 3,
        }),
      });
      recipientAutosave.markPersisted(recipientForm);
      onNext();
    } catch (error) {
      const userMessage = error instanceof ApiError ? error.getUserMessage() : null;
      showStepErrorToast({
        id: "recipient-step-save-error",
        title: userMessage ?? t("stepSaveFailed"),
      });
      captureError(error instanceof Error ? error : new Error(String(error)), {
        component: "RecipientStep",
        errorFamily: "validation_error",
      });
    }
  }

  return (
    <DraftShell
      step={2}
      totalSteps={7}
      title={t("recipientDetailsTitle")}
      subtitle={t("recipientDetailsSubtitle")}
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
          disabled={!canProceed || setRecipient.isPending || isResolvingSelection}
          loading={setRecipient.isPending || Boolean(isNavigating) || isResolvingSelection}
          tone={canProceed ? "primary" : "warning"}
          hideIcon={!canProceed}
        >
          {t("continueToContent")}
        </PrimaryButton>
      }
    >
      <div className={`space-y-8 pb-4 ${isCompactViewport ? "pt-4" : ""}`}>
        <RecipientForm
          draftId={draftId}
          isCompactViewport={isCompactViewport}
          isCompany={isCompany}
          showManual={showManual}
          fullName={fullName}
          companyName={companyName}
          selectedCompany={selectedCompany}
          selectedCompanyRegistryRef={selectedCompanyRegistryRef}
          companySearchResults={displayedCompanySearchResults}
          isCompanySearchLoading={companySearch.isLoading}
          isCompanySearchFetching={companySearch.isFetching}
          companySearchError={companySearch.error}
          areCompanyResultsVisible={areCompanyResultsVisible}
          shouldShowCompanySearchResults={shouldShowCompanySearchResults}
          companySelectionHint={companySelectionHint}
          addressLine1={addressLine1}
          postalCode={postalCode}
          city={city}
          isResolvingSelection={isResolvingSelection}
          pendingAddressSelectionLabel={pendingAddressSelectionLabel}
          onCompanyModeChange={(nextIsCompany) => {
            if (!nextIsCompany) {
              setIsCompany(false);
              setShowManual(false);
              setSelectedCompany(null);
              return;
            }
            setIsCompany(true);
          }}
          onFullNameChange={setFullName}
          onCompanyNameChange={handleCompanySearchChange}
          onFocusChange={handleFocusChange}
          onSelectCompany={handleSelectCompany}
          onEditCompanySelection={handleEditCompanySelection}
          onShowManual={() => setShowManual(true)}
          onResolvedAddress={handleResolvedAddress}
          onResolutionStateChange={handleResolutionStateChange}
          onAddressLine1Change={setAddressLine1}
          onPostalCodeChange={setPostalCode}
          onCityChange={setCity}
        />
      </div>
    </DraftShell>
  );
}
