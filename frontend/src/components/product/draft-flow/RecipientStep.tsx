"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RecipientCompanySearchResultType } from "@swiss-mail/shared";
import { useTranslations } from "next-intl";
import { User, Building2, MapPin, Plus, Search, Loader2, PencilLine } from "lucide-react";
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
import { DraftShell, Card, FieldIconBadge, PrimaryButton, SegmentedControl } from "./ui";
import {
  AddressAutocompleteField,
  type AddressResolutionState,
} from "./AddressAutocompleteField";
import { AddressFields } from "./AddressFields";
import { showStepErrorToast } from "./step-feedback";
import { getRecipientStepValidation } from "./step-validation";
import { CompanySearchResults } from "./company-search-results";
import {
  getDraftWorkspaceState,
  mergeDraftWorkspaceState,
  type RecipientDraftFormState,
} from "./workspace-state";
import type { DraftWorkspaceStepShellProps } from "./step-props";

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

interface StepProps extends DraftWorkspaceStepShellProps {
  onNext: () => void;
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

  function handleCompanySearchChange(value: string) {
    setCompanyName(value);
    if (selectedCompany && value.trim() !== selectedCompany.name) {
      setSelectedCompany(null);
    }
  }

  function handleSelectCompany(result: RecipientCompanySearchResultType) {
    setCompanyName(result.name);
    setSelectedCompany(result);
    if (!city.trim() && result.legalSeat) {
      setCity(result.legalSeat);
    }
    lastAutofilledCompanyIdRef.current = null;
    setShowManual(true);
  }

  function handleEditCompanySelection() {
    setSelectedCompany(null);
    lastAutofilledCompanyIdRef.current = null;
    setShowManual(false);
  }

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
    companyName,
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
        <section className="space-y-6">
          <div className={isCompactViewport ? "px-1" : "sticky top-0 z-10 -mx-4 bg-[var(--app-surface-muted)] px-5 pb-3 pt-1 lg:-mx-6 lg:px-7"}>
            <SegmentedControl
              options={[
                {
                  value: "person" as const,
                  label: t("personLabel"),
                  icon: <User className="h-3 w-3" />,
                },
                {
                  value: "company" as const,
                  label: t("companyLabel"),
                  icon: <Building2 className="h-3 w-3" />,
                },
              ]}
              value={isCompany ? "company" : "person"}
              onChange={(v) => {
                if (v === "person") {
                  setIsCompany(false);
                  setShowManual(false);
                  setSelectedCompany(null);
                } else {
                  setIsCompany(true);
                }
              }}
            />
          </div>

          <div className="space-y-4">
            <Card isCompactViewport={isCompactViewport} density="thin">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <FieldIconBadge>
                    {isCompany ? (
                      <Building2 className="h-6 w-6" />
                    ) : (
                      <User className="h-6 w-6" />
                    )}
                  </FieldIconBadge>
                  <div className={`flex-1 ${isCompany ? "space-y-2" : "space-y-1"}`}>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                      {isCompany ? t("companyNameLabel") : t("fullName")}
                    </div>
                    {isCompany && showManual && selectedCompany ? (
                      <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
                              {t("selectedCompanyLabel")}
                            </div>
                            <div className="break-words text-base font-semibold text-zinc-900 dark:text-zinc-100">
                              {selectedCompany.name}
                            </div>
                            {selectedCompany.legalSeat ? (
                              <div className="break-words text-xs leading-5 text-zinc-500 dark:text-zinc-300">
                                {t("companySearchSeat", {
                                  seat: selectedCompany.legalSeat,
                                })}
                              </div>
                            ) : null}
                            {selectedCompanyRegistryRef ? (
                              <div className="break-all text-xs font-medium text-zinc-400 dark:text-zinc-500">
                                {selectedCompanyRegistryRef}
                              </div>
                            ) : null}
                          </div>

                          <button
                            type="button"
                            onClick={handleEditCompanySelection}
                            className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-strong)] px-3 py-1.5 text-[11px] font-semibold text-[var(--app-fg)] transition hover:border-emerald-300 hover:bg-[var(--app-surface-soft)]"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            {t("editCompanySelection")}
                          </button>
                        </div>
                      </div>
                    ) : isCompany && !showManual ? (
                      <div className="relative">
                        <textarea
                          name="recipientCompanySearch"
                          autoComplete="organization"
                          value={companyName}
                          onChange={(e) => handleCompanySearchChange(e.target.value)}
                          onFocus={() => handleFocusChange(true)}
                          onBlur={() => handleFocusChange(false)}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = "auto";
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                          placeholder={t("searchCompanyPlaceholder")}
                          rows={1}
                          className="app-form-control w-full resize-none overflow-hidden bg-transparent pr-8 font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                        />
                        {companySearch.isFetching ? (
                          <Loader2 className="absolute right-0 top-1 h-5 w-5 animate-spin text-zinc-300 dark:text-zinc-500" />
                        ) : (
                          <Search className="absolute right-0 top-1 h-5 w-5 text-zinc-300 dark:text-zinc-600" />
                        )}
                      </div>
                    ) : isCompany ? (
                      <textarea
                        name="recipientCompanyName"
                        autoComplete="organization"
                        value={companyName}
                        onChange={(e) => handleCompanySearchChange(e.target.value)}
                        onFocus={() => handleFocusChange(true)}
                        onBlur={() => handleFocusChange(false)}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                        placeholder={t("companyNameLabel")}
                        rows={1}
                        className="app-form-control w-full resize-none overflow-hidden bg-transparent font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                      />
                    ) : (
                      <textarea
                        name="recipientFullName"
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
                        className="app-form-control w-full resize-none overflow-hidden bg-transparent font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                      />
                    )}
                  </div>
                </div>

                {shouldShowCompanySearchResults ? (
                  <CompanySearchResults
                    results={displayedCompanySearchResults}
                    isLoading={companySearch.isLoading}
                    isFetching={companySearch.isFetching}
                    error={companySearch.error}
                    areResultsVisible={areCompanyResultsVisible}
                    onSelect={handleSelectCompany}
                  />
                ) : null}

                {(showManual || !isCompany) && (
                  <div className="flex items-start gap-4">
                    <FieldIconBadge>
                      <MapPin className="h-6 w-6" />
                    </FieldIconBadge>
                    <div className="flex-1 space-y-4">
                      {companySelectionHint ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-300">
                          {companySelectionHint}
                        </p>
                      ) : null}
                      <AddressAutocompleteField
                        draftId={draftId}
                        inputName="recipientAddressSearch"
                        currentAddress={{ addressLine1, postalCode, city }}
                        onResolvedAddress={handleResolvedAddress}
                        onResolutionStateChange={handleResolutionStateChange}
                        onFocusChange={handleFocusChange}
                      />
                      <AddressFields
                        namePrefix="recipient"
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
                )}

                {isCompany && !showManual && (
                  <div className="pl-16">
                    <button
                      onClick={() => setShowManual(true)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      <Plus className="h-3 w-3" />
                      {t("enterAddressManually")}
                    </button>
                  </div>
                )}

                {isCompany && showManual && !selectedCompany && (
                  <div className="pl-16">
                    <button
                      onClick={handleEditCompanySelection}
                      className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-600"
                    >
                      <Search className="h-3 w-3" />
                      {t("backToSearch")}
                    </button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </section>
      </div>
    </DraftShell>
  );
}
