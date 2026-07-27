"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useLocale } from "next-intl";
import { apiFetch } from "../../lib/api";
import { AppButton } from "../ui/app-button";
import { Dialog, DialogDescription, DialogPanel, DialogTitle } from "../ui/dialog";

type Status = "idle" | "submitting" | "success" | "error";

interface FeedbackCopy {
  title: string;
  description: string;
  messageLabel: string;
  messagePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  submit: string;
  cancel: string;
  close: string;
  successTitle: string;
  successBody: string;
  error: string;
}

// Self-contained localisation for a small, contained widget (mirrors the
// LetterSpecimen approach) so the feedback path needs no message-catalog churn.
const DE_CH_COPY: FeedbackCopy = {
  title: "Feedback geben",
  description:
    "Etwas funktioniert nicht oder fehlt? Sagen Sie es uns – wir lesen jede Nachricht.",
  messageLabel: "Ihre Nachricht",
  messagePlaceholder: "Beschreiben Sie, was passiert ist…",
  emailLabel: "E-Mail (optional)",
  emailPlaceholder: "Damit wir Ihnen antworten können",
  submit: "Senden",
  cancel: "Abbrechen",
  close: "Schliessen",
  successTitle: "Danke für Ihr Feedback",
  successBody: "Wir haben Ihre Nachricht erhalten und melden uns bei Bedarf.",
  error: "Senden fehlgeschlagen. Bitte versuchen Sie es später erneut.",
};

const COPY: Record<string, FeedbackCopy> = {
  "de-CH": DE_CH_COPY,
  "fr-CH": {
    title: "Envoyer un feedback",
    description: "Un problème ou un manque ? Dites-le-nous — nous lisons chaque message.",
    messageLabel: "Votre message",
    messagePlaceholder: "Décrivez ce qui s'est passé…",
    emailLabel: "E-mail (facultatif)",
    emailPlaceholder: "Pour que nous puissions répondre",
    submit: "Envoyer",
    cancel: "Annuler",
    close: "Fermer",
    successTitle: "Merci pour votre retour",
    successBody:
      "Nous avons bien reçu votre message et reviendrons vers vous si nécessaire.",
    error: "Échec de l'envoi. Veuillez réessayer plus tard.",
  },
  "it-CH": {
    title: "Invia un feedback",
    description:
      "Qualcosa non funziona o manca? Ce lo faccia sapere — leggiamo ogni messaggio.",
    messageLabel: "Il suo messaggio",
    messagePlaceholder: "Descriva cosa è successo…",
    emailLabel: "E-mail (facoltativo)",
    emailPlaceholder: "Così possiamo risponderle",
    submit: "Invia",
    cancel: "Annulla",
    close: "Chiudi",
    successTitle: "Grazie per il suo feedback",
    successBody: "Abbiamo ricevuto il suo messaggio e la contatteremo se necessario.",
    error: "Invio non riuscito. Riprovi più tardi.",
  },
  "en-CH": {
    title: "Send feedback",
    description: "Something broken or missing? Tell us — we read every message.",
    messageLabel: "Your message",
    messagePlaceholder: "Describe what happened…",
    emailLabel: "Email (optional)",
    emailPlaceholder: "So we can reply to you",
    submit: "Send",
    cancel: "Cancel",
    close: "Close",
    successTitle: "Thanks for your feedback",
    successBody: "We've received your message and will follow up if needed.",
    error: "Could not send. Please try again later.",
  },
};

const MIN_MESSAGE_LENGTH = 10;

export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const locale = useLocale();
  const copy = COPY[locale] ?? DE_CH_COPY;
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");

  const canSubmit =
    message.trim().length >= MIN_MESSAGE_LENGTH && status !== "submitting";

  // Start every open with a clean form (avoids a leaky close-timeout race).
  // A controlled-prop reset via effect is intentional here: Radix onOpenChange
  // does not fire for programmatic opens (the launcher sets `open` directly).
  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setMessage("");
    setEmail("");
    setCompany("");
    setStatus("idle");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open]);

  async function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    if (!canSubmit) return;
    setStatus("submitting");
    try {
      await apiFetch<{ ok: boolean }>("/v1/feedback", {
        method: "POST",
        body: JSON.stringify({
          message: message.trim(),
          ...(email.trim() ? { email: email.trim() } : {}),
          ...(company ? { company } : {}),
          page: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "w-full rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 text-sm text-[var(--app-fg)] outline-none transition-colors placeholder:text-[var(--app-muted)] focus-visible:border-[var(--app-border-strong)] focus-visible:ring-2 focus-visible:ring-amber-400/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPanel size="md" aria-modal="true">
        <div>
          {status === "success" ? (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {copy.successTitle}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {copy.successBody}
              </DialogDescription>
              <div className="mt-6">
                <AppButton
                  fullWidth
                  size="md"
                  variant="primary"
                  onClick={() => onOpenChange(false)}
                >
                  {copy.close}
                </AppButton>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <DialogTitle className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {copy.title}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {copy.description}
              </DialogDescription>

              <div className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="feedback-message"
                    className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
                  >
                    {copy.messageLabel}
                  </label>
                  <textarea
                    id="feedback-message"
                    required
                    minLength={MIN_MESSAGE_LENGTH}
                    maxLength={4000}
                    rows={4}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                        event.preventDefault();
                        void handleSubmit();
                      }
                    }}
                    placeholder={copy.messagePlaceholder}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="feedback-email"
                    className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-200"
                  >
                    {copy.emailLabel}
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    autoComplete="email"
                    maxLength={200}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={copy.emailPlaceholder}
                    className={inputClass}
                  />
                </div>

                {/* Honeypot — hidden from users, catches bots. */}
                <div aria-hidden="true" className="hidden">
                  <label htmlFor="feedback-company">Company</label>
                  <input
                    id="feedback-company"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                  />
                </div>

                {status === "error" ? (
                  <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                    {copy.error}
                  </p>
                ) : null}
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <AppButton
                  type="button"
                  size="md"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                >
                  {copy.cancel}
                </AppButton>
                <AppButton
                  type="submit"
                  size="md"
                  variant="primary"
                  loading={status === "submitting"}
                  disabled={!canSubmit}
                >
                  {copy.submit}
                </AppButton>
              </div>
            </form>
          )}
        </div>
      </DialogPanel>
    </Dialog>
  );
}
