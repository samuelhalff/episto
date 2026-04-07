import { describe, expect, it } from "vitest";
import { getBodyLoadingState } from "../src/components/product/draft-flow/body-loading-state";

describe("body loading state", () => {
  it("shows the blocking generation dialog while the first draft is being composed", () => {
    expect(
      getBodyLoadingState({
        hasBody: false,
        initialComposeStatus: "loading",
        isSending: false,
        isStreaming: false,
        isAwaitingResponse: false,
      }),
    ).toEqual({
      isAiBusy: true,
      showBodyGenerationDialog: true,
      showRefinementLoadingCard: false,
    });
  });

  it("keeps the recovery dialog visible after the first draft generation fails", () => {
    expect(
      getBodyLoadingState({
        hasBody: false,
        initialComposeStatus: "error",
        isSending: false,
        isStreaming: false,
        isAwaitingResponse: false,
      }),
    ).toEqual({
      isAiBusy: false,
      showBodyGenerationDialog: true,
      showRefinementLoadingCard: false,
    });
  });

  it("moves loading into the refinement card once body text exists", () => {
    expect(
      getBodyLoadingState({
        hasBody: true,
        initialComposeStatus: "loading",
        isSending: false,
        isStreaming: true,
        isAwaitingResponse: false,
      }),
    ).toEqual({
      isAiBusy: true,
      showBodyGenerationDialog: false,
      showRefinementLoadingCard: true,
    });
  });

  it("does not treat refinement traffic as body generation before body text exists", () => {
    expect(
      getBodyLoadingState({
        hasBody: false,
        initialComposeStatus: "idle",
        isSending: false,
        isStreaming: true,
        isAwaitingResponse: false,
      }),
    ).toEqual({
      isAiBusy: false,
      showBodyGenerationDialog: false,
      showRefinementLoadingCard: false,
    });
  });

  it("stops treating the first-draft flow as busy once body text exists", () => {
    expect(
      getBodyLoadingState({
        hasBody: true,
        initialComposeStatus: "loading",
        isSending: false,
        isStreaming: false,
        isAwaitingResponse: false,
      }),
    ).toEqual({
      isAiBusy: false,
      showBodyGenerationDialog: false,
      showRefinementLoadingCard: false,
    });
  });
});
