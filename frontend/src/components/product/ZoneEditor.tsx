"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { DRAFT_CONTENT_LIMITS } from "@swiss-mail/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ZoneKind =
  | "sender"
  | "recipient"
  | "date"
  | "subject"
  | "salutation"
  | "body"
  | "closing";

interface AddressFields {
  firstName: string;
  lastName: string;
  company: string;
  street: string;
  postalCode: string;
  city: string;
}

interface ZoneEditorProps {
  zone: ZoneKind;
  /** Current raw value; shape depends on zone kind */
  initialValue: string | AddressFields | null;
  onSave: (value: string | AddressFields) => Promise<void>;
  onCancel: () => void;
  /** When true, renders as a bottom Sheet (mobile); otherwise Popover (desktop) */
  isMobile?: boolean;
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const labelClass = "block text-xs font-medium text-muted-foreground mb-1";

// ---------------------------------------------------------------------------
// Address field editor
// ---------------------------------------------------------------------------

function AddressEditor({
  initial,
  onSave,
  onCancel,
  t,
}: {
  initial: AddressFields;
  onSave: (v: AddressFields) => Promise<void>;
  onCancel: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [fields, setFields] = useState<AddressFields>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressFields, string>>>({});
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const validate = (): boolean => {
    const e: Partial<Record<keyof AddressFields, string>> = {};
    if (!fields.firstName.trim() && !fields.company.trim()) {
      e.firstName = t("validation.nameOrCompanyRequired");
    }
    if (!fields.street.trim()) e.street = t("validation.required");
    if (!fields.postalCode.trim()) e.postalCode = t("validation.required");
    if (!fields.city.trim()) e.city = t("validation.required");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    try {
      await onSave(fields);
    } finally {
      setIsSaving(false);
    }
  };

  const field = (
    key: keyof AddressFields,
    label: string,
    ref?: React.RefObject<HTMLInputElement | null>,
    optional?: boolean,
  ) => (
    <div>
      <label className={labelClass}>
        {label}
        {optional && (
          <span className="ml-1 text-muted-foreground/60">({t("optional")})</span>
        )}
      </label>
      <input
        ref={ref as React.RefObject<HTMLInputElement>}
        type="text"
        value={fields[key]}
        onChange={(e) => setFields((p) => ({ ...p, [key]: e.target.value }))}
        className={[inputClass, errors[key] ? "border-destructive" : ""].join(" ")}
      />
      {errors[key] && <p className="mt-1 text-xs text-destructive">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="space-y-3">
      {field("firstName", t("field.firstName"), firstInputRef)}
      {field("lastName", t("field.lastName"))}
      {field("company", t("field.company"), undefined, true)}
      {field("street", t("field.street"))}
      <fieldset className="grid grid-cols-[auto_1fr] gap-3">
        <legend className="sr-only">{t("field.postalAndCity")}</legend>
        <div>
          <label className={labelClass}>{t("field.postalCode")}</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            pattern="[0-9]{4}"
            value={fields.postalCode}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              setFields((p) => ({ ...p, postalCode: v }));
            }}
            className={[
              inputClass,
              "w-20",
              errors.postalCode ? "border-destructive" : "",
            ].join(" ")}
          />
          {errors.postalCode && (
            <p className="mt-1 text-xs text-destructive">{errors.postalCode}</p>
          )}
        </div>
        <div>
          <label className={labelClass}>{t("field.city")}</label>
          <input
            type="text"
            value={fields.city}
            onChange={(e) => setFields((p) => ({ ...p, city: e.target.value }))}
            className={[inputClass, errors.city ? "border-destructive" : ""].join(" ")}
          />
          {errors.city && <p className="mt-1 text-xs text-destructive">{errors.city}</p>}
        </div>
      </fieldset>
      <ActionRow onSave={handleSave} onCancel={onCancel} isSaving={isSaving} t={t} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text field editor
// ---------------------------------------------------------------------------

function TextEditor({
  zone,
  initial,
  onSave,
  onCancel,
  t,
}: {
  zone: ZoneKind;
  initial: string;
  onSave: (v: string) => Promise<void>;
  onCancel: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [value, setValue] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  const isMultiline = zone === "body";
  const maxLength =
    zone === "body"
      ? DRAFT_CONTENT_LIMITS.bodyChars
      : zone === "subject"
        ? DRAFT_CONTENT_LIMITS.subjectChars
        : 300;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = async () => {
    if (!value.trim()) return;
    setIsSaving(true);
    try {
      await onSave(value);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {isMultiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          maxLength={maxLength}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          className={[inputClass, "resize-none"].join(" ")}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={zone === "date" ? "date" : "text"}
          value={value}
          maxLength={maxLength}
          onChange={(e) => setValue(e.target.value)}
          className={inputClass}
        />
      )}
      {zone === "body" && (
        <p className="text-right text-xs text-muted-foreground">
          {value.length}/{maxLength}
        </p>
      )}
      <ActionRow onSave={handleSave} onCancel={onCancel} isSaving={isSaving} t={t} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared action row
// ---------------------------------------------------------------------------

function ActionRow({
  onSave,
  onCancel,
  isSaving,
  t,
}: {
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
      >
        {t("action.cancel")}
      </button>
      <button
        type="button"
        disabled={isSaving}
        onClick={() => void onSave()}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isSaving ? t("action.saving") : t("action.save")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Wrapper: Popover (desktop) or Sheet (mobile)
// ---------------------------------------------------------------------------

function isAddressZone(zone: ZoneKind): zone is "sender" | "recipient" {
  return zone === "sender" || zone === "recipient";
}

export function ZoneEditor({
  zone,
  initialValue,
  onSave,
  onCancel,
  isMobile = false,
}: ZoneEditorProps) {
  const t = useTranslations("zoneEditor");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const title = t(`zone.${zone}`);

  const editorContent = isAddressZone(zone) ? (
    <AddressEditor
      initial={
        (initialValue as AddressFields | null) ?? {
          firstName: "",
          lastName: "",
          company: "",
          street: "",
          postalCode: "",
          city: "",
        }
      }
      onSave={(v) => onSave(v)}
      onCancel={onCancel}
      t={t}
    />
  ) : (
    <TextEditor
      zone={zone}
      initial={(initialValue as string | null) ?? ""}
      onSave={(v) => onSave(v)}
      onCancel={onCancel}
      t={t}
    />
  );

  if (isMobile) {
    // Sheet: bottom-anchored full-width
    return (
      <div
        role="dialog"
        aria-label={t("ariaLabel", { zone: title })}
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-background p-4 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{t("title", { zone: title })}</h2>
          <button
            type="button"
            aria-label={t("action.close")}
            onClick={onCancel}
            className="rounded-full p-1 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {editorContent}
      </div>
    );
  }

  // Popover: inline below trigger (parent is responsible for positioning)
  return (
    <div
      role="dialog"
      aria-label={t("ariaLabel", { zone: title })}
      aria-modal="true"
      className="z-40 w-80 rounded-lg border border-border bg-background p-4 shadow-lg"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("title", { zone: title })}</h3>
        <button
          type="button"
          aria-label={t("action.close")}
          onClick={onCancel}
          className="rounded-full p-0.5 hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {editorContent}
    </div>
  );
}
