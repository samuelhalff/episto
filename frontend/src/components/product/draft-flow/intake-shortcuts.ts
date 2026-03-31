export interface IntakeShortcutDefinition {
  id: string;
  labelKey: string;
  promptKey: string;
}

const PRIMARY_INTAKE_SHORTCUTS = [
  {
    id: "cancel-contract",
    labelKey: "intakeQuickActionCancel",
    promptKey: "intakeQuickActionCancelPrompt",
  },
  {
    id: "contest-bill",
    labelKey: "intakeQuickActionInvoice",
    promptKey: "intakeQuickActionInvoicePrompt",
  },
  {
    id: "service-complaint",
    labelKey: "intakeQuickActionComplaint",
    promptKey: "intakeQuickActionComplaintPrompt",
  },
] as const satisfies readonly IntakeShortcutDefinition[];

const OVERFLOW_INTAKE_SHORTCUTS = [
  {
    id: "end-lease",
    labelKey: "intakeQuickActionLease",
    promptKey: "intakeQuickActionLeasePrompt",
  },
  {
    id: "payment-reminder",
    labelKey: "intakeQuickActionReminder",
    promptKey: "intakeQuickActionReminderPrompt",
  },
  {
    id: "authority-letter",
    labelKey: "intakeQuickActionAuthority",
    promptKey: "intakeQuickActionAuthorityPrompt",
  },
  {
    id: "something-else",
    labelKey: "intakeQuickActionOther",
    promptKey: "intakeQuickActionOtherPrompt",
  },
] as const satisfies readonly IntakeShortcutDefinition[];

export function getIntakeShortcutDefinitions(): {
  primary: readonly IntakeShortcutDefinition[];
  overflow: readonly IntakeShortcutDefinition[];
} {
  return {
    primary: PRIMARY_INTAKE_SHORTCUTS,
    overflow: OVERFLOW_INTAKE_SHORTCUTS,
  };
}
