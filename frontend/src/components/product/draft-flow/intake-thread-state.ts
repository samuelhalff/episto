import {
  getDraftWorkspaceState,
  hasMinimalIntakeContext,
  type ConversationMessage,
  type DraftLetter,
} from "@swiss-mail/shared";

type IntakeDraftSnapshot = Pick<DraftLetter, "intent" | "metadata"> | null | undefined;

export function isTemporaryAiFailureMessage(content: string): boolean {
  const normalized = content.trim().toLowerCase();
  return (
    normalized.includes("temporarily busy") ||
    normalized.includes("temporarily unavailable") ||
    normalized.includes("try again in a moment") ||
    normalized.includes("try again shortly")
  );
}

function buildUserContextText(messages: ConversationMessage[]): string {
  return messages
    .filter((message) => message.role === "user" && message.content.trim().length > 0)
    .map((message) => message.content.trim())
    .join(" ");
}

export function hasMeaningfulIntakeProgress(
  draft: IntakeDraftSnapshot,
  messages: ConversationMessage[],
): boolean {
  const workspaceState = getDraftWorkspaceState(draft?.metadata);
  return hasMinimalIntakeContext({
    intent: draft?.intent,
    recipientCompany: workspaceState.recipientForm?.companyName,
    recipientName: workspaceState.recipientForm?.fullName,
    userContextText: buildUserContextText(messages),
  });
}

export function getIntakeThreadActionMode(
  draft: IntakeDraftSnapshot,
  messages: ConversationMessage[],
): "prominent" | "subtle" | null {
  const latestAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  if (!latestAssistantMessage) {
    return null;
  }

  if (isTemporaryAiFailureMessage(latestAssistantMessage.content)) {
    return "subtle";
  }

  return hasMeaningfulIntakeProgress(draft, messages) ? "prominent" : "subtle";
}
