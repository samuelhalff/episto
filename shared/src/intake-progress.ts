export const MIN_INTAKE_CONTEXT_WORDS = 12;

export interface IntakeProgressInput {
  intent?: string | null | undefined;
  recipientCompany?: string | null | undefined;
  recipientName?: string | null | undefined;
  userContextText?: string | null | undefined;
}

export function countIntakeContextWords(text: string | null | undefined): number {
  return (text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function hasMinimalIntakeContext(input: IntakeProgressInput): boolean {
  const hasIntent = Boolean(input.intent?.trim());
  const hasRecipient = Boolean(input.recipientCompany?.trim() || input.recipientName?.trim());
  const hasNarrative = countIntakeContextWords(input.userContextText) >= MIN_INTAKE_CONTEXT_WORDS;

  return hasIntent && hasRecipient && hasNarrative;
}
