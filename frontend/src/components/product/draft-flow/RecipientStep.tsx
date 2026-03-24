"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { RecipientCompanySearchResultType } from "@swiss-mail/shared";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { User, Building2, MapPin, Plus, Search, Loader2, PencilLine } from "lucide-react";
import {
  useDraft,
  useLetterPreview,
  useRecipientCompanyDetails,
  useRecipientCompanySearch,
  useSetRecipient,
  useUpdateDraft,
} from "../../../hooks/use-api.js";
import { useQueuedAutosave } from "../../../hooks/use-queued-autosave.js";
import { ApiError } from "../../../lib/api.js";
import { captureError } from "../../../lib/error-tracking.js";
import { DraftShell, Card, PrimaryButton } from "./ui.js";
import { CompanySearchResults } from "./company-search-results.js";
import {
  getDraftWorkspaceState,
  mergeDraftWorkspaceState,
  type RecipientDraftFormState,
} from "./workspace-state.js";

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

interface StepProps {
  draftId: string;
  onNext: () => void;
  onStepClick: () => void;
  isStepMenuOpen?: boolean;
  isCompactViewport?: boolean;
  onInputFocusChange?: (focused: boolean) => void;
}

export function RecipientStep({
  draftId,
  onNext,
  onStepClick,
  isStepMenuOpen,
  isCompactViewport,
  onInputFocusChange,
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
  const [selectedCompany, setSelectedCompany] = useState<RecipientCompanySearchResultType | null>(null);
  const [addressLine1, setAddressLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [areCompanyResultsVisible, setAreCompanyResultsVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    [addressLine1, city, companyName, fullName, isCompany, postalCode, selectedCompany, showManual],
  );
  const recipientAutosave = useQueuedAutosave({
    value: recipientForm,
    enabled: hasHydratedRef.current,
    component: "RecipientStep",
    save: async (nextForm) => {
      await updateDraft.mutateAsync({
        metadata: mergeDraftWorkspaceState(draft.data?.metadata, {
          recipientForm: nextForm,
        }),
      });
    },
  });
  const companySearch = useRecipientCompanySearch(draftId, companyName, isCompany && !showManual);
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
    isCompany && showManual && companyName.trim().length > 0 ? t("companySelectedHint") : null;
  const selectedCompanyRegistryRef =
    selectedCompany?.registryUid ?? selectedCompany?.registryId ?? selectedCompany?.registryChid ?? null;

  function handleCompanySearchChange(value: string) {
    setSubmitError(null);
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
      setIsCompany(savedRecipientForm.isCompany);
      setShowManual(savedRecipientForm.showManual);
      setFullName(savedRecipientForm.fullName);
      setCompanyName(savedRecipientForm.companyName);
      setSelectedCompany(savedRecipientForm.selectedCompany ?? null);
      setAddressLine1(savedRecipientForm.addressLine1);
      setPostalCode(savedRecipientForm.postalCode);
      setCity(savedRecipientForm.city);
      recipientAutosave.markPersisted(savedRecipientForm);
      hasHydratedRef.current = true;
      return;
    }

    if (preview.previewData?.recipient) {
      const recipientName = getRecipientPreviewName(preview.previewData.recipient);
      const parts = recipientName.split(" ");
      const recipientPreview = {
        isCompany: Boolean(preview.previewData.recipient.company?.trim()) || parts.length < 2,
        showManual: Boolean(preview.previewData.recipient.company?.trim()) || parts.length >= 2,
        fullName: preview.previewData.recipient.company?.trim() ? "" : recipientName,
        companyName: preview.previewData.recipient.company?.trim() ? recipientName : parts.length >= 2 ? "" : recipientName,
        selectedCompany: null,
        addressLine1: preview.previewData.recipient.addressLine1 ?? "",
        postalCode: preview.previewData.recipient.postalCode ?? "",
        city: preview.previewData.recipient.city ?? "",
      } satisfies RecipientDraftFormState;

      setIsCompany(recipientPreview.isCompany);
      setShowManual(recipientPreview.showManual);
      setFullName(recipientPreview.fullName);
      setCompanyName(recipientPreview.companyName);
      setAddressLine1(recipientPreview.addressLine1);
      setPostalCode(recipientPreview.postalCode);
      setCity(recipientPreview.city);
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

    setCompanyName(companyDetails.data.name);
    setAddressLine1(companyDetails.data.addressLine1 ?? "");
    setPostalCode(companyDetails.data.postalCode ?? "");
    setCity(companyDetails.data.city ?? selectedCompany.legalSeat ?? "");
    lastAutofilledCompanyIdRef.current = selectedCompany.id;
  }, [companyDetails.data, selectedCompany]);

  useEffect(() => {
    if (
      !shouldShowCompanySearchResults ||
      companySearch.isLoading ||
      companySearch.isFetching ||
      displayedCompanySearchResults.length === 0
    ) {
      setAreCompanyResultsVisible(false);
      return;
    }

    let cancelled = false;
    setAreCompanyResultsVisible(false);

    const frameId = window.requestAnimationFrame(() => {
      if (!cancelled) {
        setAreCompanyResultsVisible(true);
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

  const canProceed = Boolean(
    isCompany
      ? companyName.trim() && addressLine1.trim() && postalCode.trim() && city.trim()
      : fullName.trim() && addressLine1.trim() && postalCode.trim() && city.trim(),
  );

  async function handleNext() {
    if (!canProceed || setRecipient.isPending) return;
    setSubmitError(null);

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
      recipientAutosave.persistInBackground(recipientForm);
      toast.success(t("recipientSaved"));
      onNext();
    } catch (error) {
      const userMessage = error instanceof ApiError ? error.getUserMessage() : null;
      setSubmitError(userMessage ?? t("stepSaveFailed"));
      captureError(error instanceof Error ? error : new Error(String(error)), {
        component: "RecipientStep",
        errorFamily: "validation_error",
      });
    }
  }

  return (
    <DraftShell
      step={3}
      totalSteps={6}
      title={t("recipientDetailsTitle")}
      subtitle={t("recipientDetailsSubtitle")}
      onStepClick={onStepClick}
      stepTriggerLabel={t("stepMenuLabel")}
      isStepMenuOpen={isStepMenuOpen}
      isInputFocused={isFormFocused}
      isCompactViewport={isCompactViewport}
      primaryAction={
        <>
          {submitError ? <div className="mb-2 px-2 text-[11px] text-amber-600">{submitError}</div> : null}
          <PrimaryButton onClick={handleNext} disabled={!canProceed} loading={setRecipient.isPending}>
            {t("confirmRecipient")}
          </PrimaryButton>
        </>
      }
    >
      <div className={`space-y-8 pb-4 ${isCompactViewport ? "pt-4" : ""}`}>
        <section className="space-y-6">
          <div className="flex justify-end px-1">
            <div className="flex items-center gap-1 rounded-full bg-zinc-100 p-1 dark:bg-zinc-800">
              <button
                onClick={() => {
                  setIsCompany(false);
                  setShowManual(false);
                  setSelectedCompany(null);
                }}
                className={`min-w-[88px] rounded-full px-3.5 py-1 text-center text-[9px] font-bold uppercase tracking-widest transition-all ${
                  !isCompany
                    ? "bg-amber-100 text-amber-900 shadow-sm ring-1 ring-amber-200 dark:bg-amber-400/20 dark:text-amber-200 dark:ring-amber-300/30"
                    : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                {t("personLabel")}
              </button>
              <button
                onClick={() => setIsCompany(true)}
                className={`min-w-[88px] rounded-full px-3.5 py-1 text-center text-[9px] font-bold uppercase tracking-widest transition-all ${
                  isCompany
                    ? "bg-amber-100 text-amber-900 shadow-sm ring-1 ring-amber-200 dark:bg-amber-400/20 dark:text-amber-200 dark:ring-amber-300/30"
                    : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                }`}
              >
                {t("companyLabel")}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <Card isCompactViewport={isCompactViewport} density="thin" className="bg-white dark:bg-zinc-900">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg shadow-zinc-950/20">
                    {isCompany ? <Building2 className="h-6 w-6" /> : <User className="h-6 w-6" />}
                  </div>
                  <div className={`flex-1 ${isCompany ? "space-y-2" : "space-y-1"}`}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {isCompany ? t("companyNameLabel") : t("fullName")}
                    </div>
                    {isCompany && showManual && selectedCompany ? (
                      <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                              {t("selectedCompanyLabel")}
                            </div>
                            <div className="break-words text-[16px] font-bold text-zinc-900 dark:text-zinc-100">
                              {selectedCompany.name}
                            </div>
                            {selectedCompany.legalSeat ? (
                              <div className="break-words text-xs leading-5 text-zinc-500 dark:text-zinc-300">
                                {t("companySearchSeat", { seat: selectedCompany.legalSeat })}
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
                            className="flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-emerald-400/40 dark:hover:text-white"
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
                          onFocus={() => {
                            setIsFormFocused(true);
                            onInputFocusChange?.(true);
                          }}
                          onBlur={() => {
                            setIsFormFocused(false);
                            onInputFocusChange?.(false);
                          }}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = "auto";
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                           placeholder={t("searchCompanyPlaceholder")}
                           rows={1}
                          className="w-full resize-none overflow-hidden bg-transparent pr-8 text-[16px] font-bold text-zinc-900 placeholder:text-zinc-200 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
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
                        onFocus={() => {
                          setIsFormFocused(true);
                          onInputFocusChange?.(true);
                        }}
                        onBlur={() => {
                          setIsFormFocused(false);
                          onInputFocusChange?.(false);
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                        placeholder={t("companyNameLabel")}
                        rows={1}
                          className="w-full resize-none overflow-hidden bg-transparent text-[16px] font-bold text-zinc-900 placeholder:text-zinc-200 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                       />
                    ) : (
                      <textarea
                        name="recipientFullName"
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        onFocus={() => {
                          setIsFormFocused(true);
                          onInputFocusChange?.(true);
                        }}
                        onBlur={() => {
                          setIsFormFocused(false);
                          onInputFocusChange?.(false);
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                        placeholder={t("fullName")}
                        rows={1}
                        className="w-full resize-none overflow-hidden bg-transparent text-[16px] font-bold text-zinc-900 placeholder:text-zinc-200 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
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
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 text-white shadow-lg shadow-zinc-950/20">
                      <MapPin className="h-6 w-6" />
                    </div>
                     <div className="flex-1 space-y-3">
                       {companySelectionHint ? (
                         <p className="text-sm text-zinc-500 dark:text-zinc-300">{companySelectionHint}</p>
                       ) : null}
                       <div className="space-y-1">
                         <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                           {t("streetAddress")}
                        </div>
                        <input
                          name="recipientAddressLine1"
                          autoComplete="address-line1"
                          value={addressLine1}
                          onChange={(e) => setAddressLine1(e.target.value)}
                          onFocus={() => {
                            setIsFormFocused(true);
                            onInputFocusChange?.(true);
                          }}
                          onBlur={() => {
                            setIsFormFocused(false);
                            onInputFocusChange?.(false);
                          }}
                          placeholder={t("streetPlaceholder")}
                           className="w-full border-b border-zinc-100 bg-transparent pb-1 text-[16px] font-medium text-zinc-700 placeholder:text-zinc-200 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500"
                        />
                      </div>
                      <div className="flex gap-4">
                        <div className="w-24 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            {t("zipCode")}
                          </div>
                          <input
                            name="recipientPostalCode"
                            autoComplete="postal-code"
                            inputMode="numeric"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            onFocus={() => {
                              setIsFormFocused(true);
                              onInputFocusChange?.(true);
                            }}
                            onBlur={() => {
                              setIsFormFocused(false);
                              onInputFocusChange?.(false);
                            }}
                            placeholder={t("zipPlaceholder")}
                             className="w-full border-b border-zinc-100 bg-transparent pb-1 text-[16px] font-medium text-zinc-700 placeholder:text-zinc-200 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                            {t("cityLabel")}
                          </div>
                          <input
                            name="recipientCity"
                            autoComplete="address-level2"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            onFocus={() => {
                              setIsFormFocused(true);
                              onInputFocusChange?.(true);
                            }}
                            onBlur={() => {
                              setIsFormFocused(false);
                              onInputFocusChange?.(false);
                            }}
                            placeholder={t("cityPlaceholder")}
                            className="w-full border-b border-zinc-100 bg-transparent pb-1 text-[16px] font-medium text-zinc-600 placeholder:text-zinc-200 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isCompany && !showManual && (
                  <div className="pl-16">
                    <button
                      onClick={() => setShowManual(true)}
                      className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
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
                       className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-zinc-600"
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
