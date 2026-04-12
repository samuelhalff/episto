"use client";

import type { RecipientCompanySearchResultType } from "@swiss-mail/shared";
import { Building2, MapPin, Plus, Search, User } from "lucide-react";
import type { FormEvent } from "react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { AppToggleGroup } from "../../ui/app-toggle-group";
import {
  AddressAutocompleteField,
  type AddressResolutionState,
} from "./AddressAutocompleteField";
import { AddressFields } from "./AddressFields";
import { RecipientCompanySearchField } from "./RecipientCompanySearchField";
import { RecipientSelectedCompanySummary } from "./RecipientSelectedCompanySummary";
import { Card, FieldIconBadge } from "./ui";

interface RecipientFormProps {
  draftId: string;
  isCompactViewport?: boolean | undefined;
  isCompany: boolean;
  showManual: boolean;
  fullName: string;
  companyName: string;
  selectedCompany: RecipientCompanySearchResultType | null;
  selectedCompanyRegistryRef: string | null;
  companySearchResults: RecipientCompanySearchResultType[];
  isCompanySearchLoading: boolean;
  isCompanySearchFetching: boolean;
  companySearchError: Error | null;
  areCompanyResultsVisible: boolean;
  shouldShowCompanySearchResults: boolean;
  companySelectionHint: string | null;
  addressLine1: string;
  postalCode: string;
  city: string;
  isResolvingSelection: boolean;
  pendingAddressSelectionLabel: string | null;
  onCompanyModeChange: (isCompany: boolean) => void;
  onFullNameChange: (value: string) => void;
  onCompanyNameChange: (value: string) => void;
  onFocusChange: (focused: boolean) => void;
  onSelectCompany: (result: RecipientCompanySearchResultType) => void;
  onEditCompanySelection: () => void;
  onShowManual: () => void;
  onResolvedAddress: (nextAddress: {
    addressLine1: string;
    postalCode: string;
    city: string;
  }) => void;
  onResolutionStateChange: (state: AddressResolutionState) => void;
  onAddressLine1Change: (value: string) => void;
  onPostalCodeChange: (value: string) => void;
  onCityChange: (value: string) => void;
}

function resizeTextarea(event: FormEvent<HTMLTextAreaElement>) {
  const target = event.currentTarget;
  target.style.height = "auto";
  target.style.height = `${target.scrollHeight}px`;
}

export function RecipientForm({
  draftId,
  isCompactViewport,
  isCompany,
  showManual,
  fullName,
  companyName,
  selectedCompany,
  selectedCompanyRegistryRef,
  companySearchResults,
  isCompanySearchLoading,
  isCompanySearchFetching,
  companySearchError,
  areCompanyResultsVisible,
  shouldShowCompanySearchResults,
  companySelectionHint,
  addressLine1,
  postalCode,
  city,
  isResolvingSelection,
  pendingAddressSelectionLabel,
  onCompanyModeChange,
  onFullNameChange,
  onCompanyNameChange,
  onFocusChange,
  onSelectCompany,
  onEditCompanySelection,
  onShowManual,
  onResolvedAddress,
  onResolutionStateChange,
  onAddressLine1Change,
  onPostalCodeChange,
  onCityChange,
}: RecipientFormProps) {
  const t = useTranslations("draft");
  const recipientModeOptions = useMemo(
    () => [
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
    ],
    [t],
  );

  return (
    <section className="space-y-6">
      <div
        className={
          isCompactViewport
            ? "px-1"
            : "sticky top-0 z-10 -mx-4 bg-[var(--app-surface-muted)] px-5 pb-3 pt-1 lg:-mx-6 lg:px-7"
        }
      >
        <AppToggleGroup
          ariaLabel={`${t("personLabel")} / ${t("companyLabel")}`}
          options={recipientModeOptions}
          variant="segmented"
          value={isCompany ? "company" : "person"}
          onChange={(value) => onCompanyModeChange(value === "company")}
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
                  <RecipientSelectedCompanySummary
                    selectedCompany={selectedCompany}
                    registryRef={selectedCompanyRegistryRef}
                    onEdit={onEditCompanySelection}
                  />
                ) : isCompany && !showManual ? (
                  <RecipientCompanySearchField
                    companyName={companyName}
                    isLoading={isCompanySearchLoading}
                    isFetching={isCompanySearchFetching}
                    error={companySearchError}
                    areResultsVisible={areCompanyResultsVisible}
                    results={companySearchResults}
                    shouldShowResults={shouldShowCompanySearchResults}
                    onChange={onCompanyNameChange}
                    onFocusChange={onFocusChange}
                    onSelect={onSelectCompany}
                  />
                ) : isCompany ? (
                  <textarea
                    name="recipientCompanyName"
                    autoComplete="organization"
                    value={companyName}
                    onChange={(event) => onCompanyNameChange(event.target.value)}
                    onFocus={() => onFocusChange(true)}
                    onBlur={() => onFocusChange(false)}
                    onInput={resizeTextarea}
                    placeholder={t("companyNameLabel")}
                    rows={1}
                    className="app-form-control w-full resize-none overflow-hidden bg-transparent font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                ) : (
                  <textarea
                    name="recipientFullName"
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => onFullNameChange(event.target.value)}
                    onFocus={() => onFocusChange(true)}
                    onBlur={() => onFocusChange(false)}
                    onInput={resizeTextarea}
                    placeholder={t("fullName")}
                    rows={1}
                    className="app-form-control w-full resize-none overflow-hidden bg-transparent font-semibold text-zinc-900 placeholder:text-zinc-200 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                )}
              </div>
            </div>

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
                    onResolvedAddress={onResolvedAddress}
                    onResolutionStateChange={onResolutionStateChange}
                    onFocusChange={onFocusChange}
                  />
                  <AddressFields
                    namePrefix="recipient"
                    addressLine1={addressLine1}
                    postalCode={postalCode}
                    city={city}
                    onAddressLine1Change={onAddressLine1Change}
                    onPostalCodeChange={onPostalCodeChange}
                    onCityChange={onCityChange}
                    isResolvingSelection={isResolvingSelection}
                    pendingSelectionLabel={pendingAddressSelectionLabel}
                    onFocusChange={onFocusChange}
                  />
                </div>
              </div>
            )}

            {isCompany && !showManual ? (
              <div className="pl-16">
                <button
                  type="button"
                  onClick={onShowManual}
                  className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  <Plus className="h-3 w-3" />
                  {t("enterAddressManually")}
                </button>
              </div>
            ) : null}

            {isCompany && showManual && !selectedCompany ? (
              <div className="pl-16">
                <button
                  type="button"
                  onClick={onEditCompanySelection}
                  className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-zinc-600"
                >
                  <Search className="h-3 w-3" />
                  {t("backToSearch")}
                </button>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </section>
  );
}
