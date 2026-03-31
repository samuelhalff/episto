import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";
import { mergeDraftWorkspaceState } from "@swiss-mail/shared";

import {
  getDraftWorkspaceUnlockedStepIndex,
  isDraftWorkspaceStepLocked,
} from "../src/components/product/draft-flow/steps";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const stepOverlaySource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/StepOverlay.tsx"),
  "utf8",
);

const draftShellSource = readFileSync(
  path.join(repoRoot, "frontend/src/components/product/draft-flow/draft-shell.tsx"),
  "utf8",
);

const newDraftPageSource = readFileSync(
  path.join(repoRoot, "frontend/src/app/[locale]/draft/new/page.tsx"),
  "utf8",
);

describe("draft workspace navigation", () => {
  it("keeps intake and sender available before later steps unlock", () => {
    expect(getDraftWorkspaceUnlockedStepIndex(null)).toBe(1);
    expect(isDraftWorkspaceStepLocked("sender", 1)).toBe(false);
    expect(isDraftWorkspaceStepLocked("recipient", 1)).toBe(true);
  });

  it("honors explicit sequential unlock progress beyond inferred draft data", () => {
    expect(
      getDraftWorkspaceUnlockedStepIndex({
        senderProfileId: "sender-id",
        recipientProfileId: "recipient-id",
        body: "Hello",
        subject: null,
        metadata: mergeDraftWorkspaceState(null, {
          furthestUnlockedStepIndex: 5,
        }),
      }),
    ).toBe(5);
  });

  it("keeps older resumed drafts reachable from saved subject data", () => {
    expect(
      getDraftWorkspaceUnlockedStepIndex({
        senderProfileId: "sender-id",
        recipientProfileId: "recipient-id",
        body: "Hello",
        subject: "Rental notice",
        metadata: {},
      }),
    ).toBe(6);
  });

  it("shows lock affordances in both sheet and desktop step lists", () => {
    expect(stepOverlaySource).toContain("<Lock");
    expect(draftShellSource).toContain("<Lock");
  });

  it("uses clearer confirmation copy when starting a new draft from resume", () => {
    expect(newDraftPageSource).toContain('confirmLabel={t("startNewLetter")}');
    expect(newDraftPageSource).not.toContain('confirmLabel={tr("startFresh")}');
  });
});
