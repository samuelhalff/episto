// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { queryKeys, type DraftLetter } from "@episto/shared";

// `use-draft` reaches the network layer, which validates the public env at
// import time. Nothing here calls it — the mutation is injected — so the module
// is stubbed rather than the whole suite given an environment.
vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, unknown>) =>
      values ? `${key}:${Object.values(values).join(",")}` : key;
    return t;
  },
  useLocale: () => localeForTest,
}));

import { IntakeGuidanceSlot } from "../src/components/product/draft-flow/TemplateGuidance";
import { useTemplateGuidance } from "../src/components/product/draft-flow/use-template-guidance";

// Mutated per test; the next-intl mock reads it at render time.
let localeForTest = "de-CH";

const DRAFT_ID = "11111111-1111-1111-1111-111111111111";
const SLUG = "wohnung-kuendigen";
const DE_STARTER = "Ich möchte den Mietvertrag für meine Wohnung kündigen.";
const FR_STARTER = "Je souhaite résilier le bail de mon appartement.";

type UpdateDraftLike = Parameters<typeof useTemplateGuidance>[0]["updateDraft"];

function makeUpdateDraft(mutateAsync: (input: unknown) => Promise<unknown>) {
  return { mutateAsync } as unknown as UpdateDraftLike;
}

function withTemplate(metadata: Record<string, unknown> = {}) {
  return {
    workspaceDraft: {
      templateContext: { slug: SLUG, checklist: [], considerations: [] },
      ...metadata,
    },
  };
}

interface HarnessProps {
  updateDraft: UpdateDraftLike;
  initialText: string;
  markIntakePersisted?: (value: string) => void;
  flushIntake?: (value?: string) => Promise<void>;
}

function Harness({
  updateDraft,
  initialText,
  markIntakePersisted = () => {},
  flushIntake = async () => {},
}: HarnessProps) {
  const [text, setText] = React.useState(initialText);
  const guidance = useTemplateGuidance({
    draftId: DRAFT_ID,
    updateDraft,
    intakeText: text,
    setIntakeText: setText,
    flushIntake,
    markIntakePersisted,
  });

  return (
    <>
      <textarea
        aria-label="composer"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <button type="button" onClick={guidance.turnOff}>
        turn off
      </button>
      <output data-testid="outcome">{guidance.outcome ?? "none"}</output>
      <output data-testid="error">{String(guidance.hasTurnOffError)}</output>
      <IntakeGuidanceSlot slug={guidance.outcome ? null : SLUG} guidance={guidance} />
    </>
  );
}

function renderHarness(props: HarnessProps, metadata: unknown = withTemplate()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(queryKeys.draft(DRAFT_ID), {
    id: DRAFT_ID,
    metadata,
  } as unknown as DraftLetter);

  return render(
    <QueryClientProvider client={queryClient}>
      <Harness {...props} />
    </QueryClientProvider>,
  );
}

function composerValue(): string {
  return (screen.getByLabelText("composer") as HTMLTextAreaElement).value;
}

afterEach(() => {
  cleanup();
  localeForTest = "de-CH";
});

describe("turning template guidance off", () => {
  it("sends only the delta, and clears the untouched starter with it", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderHarness({ updateDraft: makeUpdateDraft(mutateAsync), initialText: DE_STARTER });

    await user.click(screen.getByRole("button", { name: "turn off" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    // No `metadata` key: sending a whole merged object is what erases concurrent
    // writes, so the wire shape is part of the contract.
    expect(mutateAsync.mock.calls[0]?.[0]).toEqual({
      workspacePatch: { templateContext: null, intakeInput: null },
    });
    expect(composerValue()).toBe("");
    expect(screen.getByTestId("outcome").textContent).toBe("starter_cleared");
  });

  it("keeps text the user edited, and does not clear the composer", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    const markIntakePersisted = vi.fn();
    const user = userEvent.setup();
    renderHarness({
      updateDraft: makeUpdateDraft(mutateAsync),
      initialText: `${DE_STARTER} Zusatz.`,
      markIntakePersisted,
    });

    await user.click(screen.getByRole("button", { name: "turn off" }));

    await waitFor(() =>
      expect(screen.getByTestId("outcome").textContent).toBe("text_kept"),
    );
    expect(mutateAsync.mock.calls[0]?.[0]).toEqual({
      workspacePatch: { templateContext: null },
    });
    expect(composerValue()).toBe(`${DE_STARTER} Zusatz.`);
    // The autosave still owns intakeInput here; telling it what is persisted
    // from this side would desynchronize it.
    expect(markIntakePersisted).not.toHaveBeenCalled();
  });

  it("does not delete what the user types while the request is in flight", async () => {
    let resolveMutation: (() => void) | null = null;
    const mutateAsync = vi.fn(
      () =>
        new Promise<unknown>((resolve) => {
          resolveMutation = () => resolve({});
        }),
    );
    const user = userEvent.setup();
    renderHarness({ updateDraft: makeUpdateDraft(mutateAsync), initialText: DE_STARTER });

    await user.click(screen.getByRole("button", { name: "turn off" }));
    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());

    // The composer is never disabled, so this is an ordinary thing to happen.
    await user.type(screen.getByLabelText("composer"), " Und noch etwas.");
    resolveMutation?.();

    await waitFor(() =>
      expect(screen.getByTestId("outcome").textContent).toBe("text_kept"),
    );
    expect(composerValue()).toBe(`${DE_STARTER} Und noch etwas.`);
  });

  it("recognises a starter seeded in another locale", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderHarness({ updateDraft: makeUpdateDraft(mutateAsync), initialText: FR_STARTER });

    await user.click(screen.getByRole("button", { name: "turn off" }));

    await waitFor(() =>
      expect(screen.getByTestId("outcome").textContent).toBe("starter_cleared"),
    );
    expect(composerValue()).toBe("");
  });

  it("leaves guidance visibly on when the write fails", async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    renderHarness({ updateDraft: makeUpdateDraft(mutateAsync), initialText: DE_STARTER });

    await user.click(screen.getByRole("button", { name: "turn off" }));

    await waitFor(() => expect(screen.getByTestId("error").textContent).toBe("true"));
    expect(screen.getByTestId("outcome").textContent).toBe("none");
    expect(composerValue()).toBe(DE_STARTER);
    expect(screen.getByText("templateTurnOffError")).toBeTruthy();
  });

  it("writes nothing when the draft carries no template", async () => {
    const mutateAsync = vi.fn().mockResolvedValue({});
    const user = userEvent.setup();
    renderHarness(
      { updateDraft: makeUpdateDraft(mutateAsync), initialText: DE_STARTER },
      { workspaceDraft: {} },
    );

    await user.click(screen.getByRole("button", { name: "turn off" }));

    await waitFor(() => expect(screen.getByTestId("outcome").textContent).toBe("none"));
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});

describe("the empty-composer guidance slot", () => {
  const idleGuidance = {
    isTurningOff: false,
    hasTurnOffError: false,
    outcome: null,
    turnOff: () => {},
  };

  it("keeps naming and offering to stop the template in a locale with no copy", () => {
    localeForTest = "en-CH";
    render(<IntakeGuidanceSlot slug={SLUG} guidance={idleGuidance} />);

    // en-CH has no landing content. Hiding the surface there would leave
    // guidance reaching the model with nothing on screen and no way to stop it.
    expect(screen.getByText("templateChipLabelGeneric")).toBeTruthy();
    expect(screen.getByRole("button", { name: "templateTurnOff" })).toBeTruthy();
  });

  it("shows the authored panel where copy exists", () => {
    render(<IntakeGuidanceSlot slug={SLUG} guidance={idleGuidance} />);

    expect(screen.getByText("Wohnung kündigen")).toBeTruthy();
    expect(screen.getByText("Der Mietvertrag")).toBeTruthy();
  });

  it("never reports guidance as off while the template is still present", () => {
    render(
      <IntakeGuidanceSlot
        slug={SLUG}
        guidance={{ ...idleGuidance, outcome: "starter_cleared" }}
      />,
    );

    expect(screen.queryByText("templateTurnedOffStarterCleared")).toBeNull();
    expect(screen.getByText("Wohnung kündigen")).toBeTruthy();
  });

  it("confirms what happened to the composer once the template is gone", () => {
    render(
      <IntakeGuidanceSlot
        slug={null}
        guidance={{ ...idleGuidance, outcome: "text_kept" }}
      />,
    );

    expect(screen.getByText("templateTurnedOffTextKept")).toBeTruthy();
  });
});
