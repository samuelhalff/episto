export function getBodyLoadingState(options: {
  hasBody: boolean;
  initialComposeStatus: "idle" | "loading" | "error";
  isSending: boolean;
  isStreaming: boolean;
  isAwaitingResponse: boolean;
}) {
  const hasBody = options.hasBody;
  const refinementBusy =
    hasBody && (options.isSending || options.isStreaming || options.isAwaitingResponse);
  const initialDraftBusy = !hasBody && options.initialComposeStatus === "loading";

  return {
    isAiBusy: initialDraftBusy || refinementBusy,
    showBodyGenerationDialog:
      !hasBody &&
      (options.initialComposeStatus === "loading" || options.initialComposeStatus === "error"),
    showRefinementLoadingCard: refinementBusy,
  };
}
