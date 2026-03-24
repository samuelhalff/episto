"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { User, MapPin } from "lucide-react";
import { useDraft, useLetterPreview, useSetSender, useUpdateDraft } from "../../../hooks/use-api.js";
import { useQueuedAutosave } from "../../../hooks/use-queued-autosave.js";
import { ApiError } from "../../../lib/api.js";
import { captureError } from "../../../lib/error-tracking.js";
import { DraftShell, Card, PrimaryButton } from "./ui.js";
import {
  getDraftWorkspaceState,
  mergeDraftWorkspaceState,
  type SenderDraftFormState,
} from "./workspace-state.js";

function getSenderPreviewName(sender: {
  firstName: string;
  lastName: string;
}): string {
  return [sender.firstName, sender.lastName].map((part) => part.trim()).filter(Boolean).join(" ");
}

interface StepProps {
  draftId: string;
  onNext: () => void;
  onStepClick: () => void;
  isStepMenuOpen?: boolean;
  isCompactViewport?: boolean;
  onInputFocusChange?: (focused: boolean) => void;
}

export function SenderStep({
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
  const setSender = useSetSender(draftId);
  const updateDraft = useUpdateDraft(draftId);

  const [isFormFocused, setIsFormFocused] = useState(false);
  const [fullName, setFullName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    enabled: hasHydratedRef.current,
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
      setFullName(savedSenderForm.fullName);
      setAddressLine1(savedSenderForm.addressLine1);
      setPostalCode(savedSenderForm.postalCode);
      setCity(savedSenderForm.city);
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

      setFullName(senderPreview.fullName);
      setAddressLine1(senderPreview.addressLine1);
      setPostalCode(senderPreview.postalCode);
      setCity(senderPreview.city);
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

  const canProceed = Boolean(
    fullName.trim() && addressLine1.trim() && postalCode.trim() && city.trim(),
  );

  async function handleNext() {
    if (!canProceed || setSender.isPending) return;
    setSubmitError(null);

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
      senderAutosave.persistInBackground(senderForm);
      toast.success(t("senderSaved"));
      onNext();
    } catch (error) {
      const userMessage = error instanceof ApiError ? error.getUserMessage() : null;
      setSubmitError(userMessage ?? t("stepSaveFailed"));
      captureError(error instanceof Error ? error : new Error(String(error)), {
        component: "SenderStep",
        errorFamily: "validation_error",
      });
    }
  }

  return (
    <DraftShell
      step={2}
      totalSteps={6}
      title={t("senderDetailsTitle")}
      subtitle={t("senderDetailsSubtitle")}
      onStepClick={onStepClick}
      stepTriggerLabel={t("stepMenuLabel")}
      isStepMenuOpen={isStepMenuOpen}
      isInputFocused={isFormFocused}
      isCompactViewport={isCompactViewport}
      primaryAction={
        <>
          {submitError ? <div className="mb-2 px-2 text-[11px] text-amber-600">{submitError}</div> : null}
          <PrimaryButton onClick={handleNext} disabled={!canProceed} loading={setSender.isPending}>
            {t("nextRecipient")}
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-8 pb-4">
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {t("yourIdentity")}
            </h3>
          </div>

          <div className="space-y-4">
            <Card isCompactViewport={isCompactViewport} density="thin" className="bg-white dark:bg-zinc-900">
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                  <User className="h-6 w-6" />
                </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {t("fullName")}
                    </div>
                    <textarea
                      name="senderName"
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
                      className="w-full resize-none overflow-hidden bg-transparent text-[16px] font-bold text-zinc-900 focus:outline-none placeholder:text-zinc-200 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                    />
                  </div>
                </div>

                <div className="flex items-start gap-4">
                   <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500">
                     <MapPin className="h-6 w-6" />
                   </div>
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {t("streetAddress")}
                      </div>
                      <input
                        name="senderAddressLine1"
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
                          name="senderPostalCode"
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
                          name="senderCity"
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
                           className="w-full border-b border-zinc-100 bg-transparent pb-1 text-[16px] font-medium text-zinc-700 placeholder:text-zinc-200 focus:outline-none dark:border-zinc-700 dark:text-zinc-200 dark:placeholder:text-zinc-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </DraftShell>
  );
}
