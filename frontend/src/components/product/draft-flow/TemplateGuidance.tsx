"use client";

import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getTemplateIntake } from "../../../lib/template-intake";
import { IntakeTips } from "./IntakeTips";
import type { useTemplateGuidance } from "./use-template-guidance";

type Guidance = ReturnType<typeof useTemplateGuidance>;

interface TemplateGuidanceProps {
  /** Null when this draft was not seeded from a template. */
  slug: string | null;
  guidance: Guidance;
}

/**
 * Copy is looked up from the trusted static intake registry by slug and escaped
 * by React — no string from draft metadata is ever rendered. Returns null when
 * the slug is unknown or the active locale has no landing content (en-CH), so a
 * locale switch hides the panel rather than showing stale copy.
 */
function useTemplateCopy(slug: string | null) {
  const locale = useLocale();
  return slug ? getTemplateIntake(slug, locale) : null;
}

/**
 * Rich preparation panel shown in place of the generic intake tips while the
 * composer is still empty. Purely informational: it introduces no disabled
 * state anywhere, because not having the listed items must never block sending.
 */
function TemplatePreparationPanel({ slug, guidance }: TemplateGuidanceProps) {
  const t = useTranslations("draft");
  const copy = useTemplateCopy(slug);

  if (!copy) return null;

  return (
    <section className="px-2">
      <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold tracking-normal text-zinc-500 dark:text-zinc-400">
        <FileText className="h-3.5 w-3.5 shrink-0" />
        {t("templateEyebrow")}
      </div>
      <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
        {copy.title}
      </h3>

      <p className="mt-5 text-[11px] font-semibold tracking-normal text-zinc-500 dark:text-zinc-400">
        {t("templatePrepareTitle")}
      </p>
      <ul className="mt-2 space-y-1.5">
        {copy.prepare.map((item) => (
          <li
            key={item}
            className="flex items-baseline gap-2.5 text-sm leading-5 text-zinc-700 dark:text-zinc-200"
          >
            <span
              aria-hidden
              className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600"
            />
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-sm leading-5 text-zinc-500 dark:text-zinc-400">
        {t("templateOptional")}
      </p>
      <p className="mt-1.5 flex items-baseline gap-2 text-sm leading-5 text-zinc-500 dark:text-zinc-400">
        <Paperclip className="h-3.5 w-3.5 shrink-0" />
        {t("templateAttachHint")}
      </p>

      <TurnOffButton guidance={guidance} className="mt-4" />
    </section>
  );
}

/**
 * Minimal marker that survives the panel. The backend applies template guidance
 * on every turn, so the control to stop it has to outlive the empty-composer
 * screen — otherwise a user who notices the wrong template after their first
 * message can neither see it nor stop it.
 */
export function TemplateGuidanceChip({ slug, guidance }: TemplateGuidanceProps) {
  const t = useTranslations("draft");
  const copy = useTemplateCopy(slug);

  // Keyed on the slug, not on the copy: en-CH has no landing content, and
  // hiding the chip there would leave guidance reaching the model with nothing
  // on screen naming it and no way to stop it. Without a title it says only
  // that a template is active, which is true in every locale.
  if (!slug) return null;

  return (
    <div className="px-2">
      <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--app-border)] bg-[var(--app-surface-muted)] py-1 pl-3 pr-1 text-xs text-[var(--app-muted-strong)]">
        <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--app-muted)]" />
        <span className="min-w-0 truncate">
          {copy
            ? t("templateChipLabel", { title: copy.title })
            : t("templateChipLabelGeneric")}
        </span>
        <button
          type="button"
          onClick={guidance.turnOff}
          disabled={guidance.isTurningOff}
          aria-label={t("templateTurnOff")}
          title={t("templateTurnOff")}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--app-muted)] transition-colors hover:text-[var(--app-fg)] disabled:opacity-60"
        >
          {guidance.isTurningOff ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      {guidance.hasTurnOffError ? (
        <p role="alert" className="mt-1.5 text-xs text-red-700 dark:text-red-300">
          {t("templateTurnOffError")}
        </p>
      ) : null}
    </div>
  );
}

function TurnOffButton({
  guidance,
  className,
}: {
  guidance: Guidance;
  className?: string;
}) {
  const t = useTranslations("draft");
  const { isTurningOff, hasTurnOffError } = guidance;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={guidance.turnOff}
        disabled={isTurningOff}
        className="inline-flex items-center gap-1.5 px-0 text-sm font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition hover:text-zinc-950 disabled:opacity-60 dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-zinc-50"
      >
        {isTurningOff ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        {isTurningOff ? t("templateTurnOffPending") : t("templateTurnOff")}
      </button>
      {hasTurnOffError ? (
        <p role="alert" className="mt-1.5 text-sm text-red-700 dark:text-red-300">
          {t("templateTurnOffError")}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The empty-composer slot: the preparation panel while a template is active,
 * a one-line confirmation right after it is turned off, and the generic tips
 * otherwise.
 *
 * An active template is checked *before* the turn-off confirmation. Reporting
 * "guidance is off" while the slug is still in metadata would be a lie about
 * what reaches the model, and the whole point of this surface is that the user
 * can trust it about exactly that.
 */
export function IntakeGuidanceSlot({ slug, guidance }: TemplateGuidanceProps) {
  const t = useTranslations("draft");
  const copy = useTemplateCopy(slug);

  if (slug) {
    if (copy) {
      return <TemplatePreparationPanel slug={slug} guidance={guidance} />;
    }

    // No authored copy in this locale: the tips stand in for the panel, but the
    // chip still names the steering and carries the off switch.
    return (
      <div className="space-y-6">
        <TemplateGuidanceChip slug={slug} guidance={guidance} />
        <IntakeTips />
      </div>
    );
  }

  if (guidance.outcome) {
    return (
      <div className="space-y-6">
        <p
          role="status"
          className="px-2 text-sm leading-5 text-zinc-500 dark:text-zinc-400"
        >
          {guidance.outcome === "starter_cleared"
            ? t("templateTurnedOffStarterCleared")
            : t("templateTurnedOffTextKept")}
        </p>
        <IntakeTips />
      </div>
    );
  }

  return <IntakeTips />;
}
