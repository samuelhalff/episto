import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DraftEventHandler } from "../src/modules/drafting/draft-events.js";
import { subscribeDraft, unsubscribeDraft } from "../src/modules/drafting/draft-events.js";

// ---------------------------------------------------------------------------
// Mock all external dependencies before importing the handler
// ---------------------------------------------------------------------------

vi.mock("../src/db/index.js", () => ({
  getDb: vi.fn(() => mockDb),
  schema: {
    draftLetters: { id: "id", sessionId: "sessionId" },
    conversationMessages: {
      draftId: "draftId",
      role: "role",
      content: "content",
      createdAt: "createdAt",
    },
  },
}));

vi.mock("../src/modules/ai/ai.service.js", () => ({
  classifyIntent: vi.fn(),
  extractFields: vi.fn(),
  askFollowUp: vi.fn(),
  draftLetter: vi.fn(),
  reviseLetter: vi.fn(),
  validateOutput: vi.fn(),
}));

vi.mock("../src/modules/messages/message.service.js", () => ({
  createMessage: vi.fn(),
}));

vi.mock("../src/shared/logging/index.js", () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Import mocked modules
// ---------------------------------------------------------------------------

import { handleAiMessage } from "../src/modules/ai/ai.handler.js";
import {
  classifyIntent,
  extractFields,
  askFollowUp,
  draftLetter,
  validateOutput,
} from "../src/modules/ai/ai.service.js";
import { createMessage } from "../src/modules/messages/message.service.js";

// ---------------------------------------------------------------------------
// Shared mock DB — helper to set up chaining
// ---------------------------------------------------------------------------

const mockDb = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
};

function resetDbChain() {
  // mockReset clears both implementations and once-value queues
  mockDb.select.mockReset().mockReturnValue(mockDb);
  mockDb.from.mockReset().mockReturnValue(mockDb);
  mockDb.where.mockReset().mockReturnValue(mockDb);
  mockDb.orderBy.mockReset().mockReturnValue(mockDb);
  mockDb.limit.mockReset().mockResolvedValue([]);
  mockDb.update.mockReset().mockReturnValue(mockDb);
  mockDb.set.mockReset().mockReturnValue(mockDb);
}

const DRAFT = {
  id: "draft-1",
  sessionId: "session-1",
  status: "collecting",
  locale: "de-CH",
  deliveryType: "standard",
  subject: null,
  body: null,
  tone: null,
  intent: null,
  enclosureNote: null,
  signatureMode: null,
  schemaVersion: 1,
  senderProfileId: null,
  recipientProfileId: null,
  signatureAssetId: null,
  estimatedPages: null,
  reviewedAt: null,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleAiMessage", () => {
  let events: Array<[string, unknown]>;
  let handler: DraftEventHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDbChain();
    events = [];
    handler = (event, payload) => events.push([event, payload]);
    subscribeDraft("draft-1", handler);

    // Default: loadDraft returns DRAFT, conversation returns empty
    mockDb.limit
      .mockResolvedValueOnce([DRAFT])  // loadDraft
      .mockResolvedValueOnce([]);       // loadConversationHistory
  });

  afterEach(() => {
    unsubscribeDraft("draft-1", handler);
  });

  it("emits ai_message_complete for follow-up question when not ready", async () => {
    vi.mocked(classifyIntent).mockResolvedValue({
      intent: "cancellation",
      risk: "low",
      summary: "Cancel insurance",
    });
    vi.mocked(extractFields).mockResolvedValue({});
    vi.mocked(askFollowUp).mockResolvedValue({
      ready: false,
      question: "What is the contract number?",
    });
    vi.mocked(createMessage).mockResolvedValue({
      id: "assistant-msg-1",
      draftId: "draft-1",
      role: "assistant",
      content: "What is the contract number?",
      toolCalls: null,
      createdAt: new Date(),
    });

    await handleAiMessage({
      draftId: "draft-1",
      sessionId: "session-1",
      userMessageId: "user-msg-1",
      userContent: "I want to cancel my insurance",
    });

    expect(classifyIntent).toHaveBeenCalled();
    expect(extractFields).toHaveBeenCalled();
    expect(askFollowUp).toHaveBeenCalled();
    expect(createMessage).toHaveBeenCalledWith(expect.anything(), {
      draftId: "draft-1",
      role: "assistant",
      content: "What is the contract number?",
    });

    const completeEvents = events.filter(([e]) => e === "ai_message_complete");
    expect(completeEvents).toHaveLength(1);
    const payload = completeEvents[0]![1] as { fullContent: string };
    expect(payload.fullContent).toBe("What is the contract number?");
  });

  it("streams draft and emits events when ready", async () => {
    vi.mocked(classifyIntent).mockResolvedValue({
      intent: "cancellation",
      risk: "low",
      summary: "Cancel insurance",
    });
    vi.mocked(extractFields).mockResolvedValue({ subject: "Kündigung" });
    vi.mocked(askFollowUp).mockResolvedValue({
      ready: true,
      message: "Ready to draft.",
    });

    vi.mocked(draftLetter).mockResolvedValue({
      mode: "structured_edit",
      body: "Sehr geehrte Damen",
      document: {
        version: "1.0",
        blocks: [
          {
            type: "paragraph",
            text: "Sehr geehrte Damen",
            style: "Normal",
          },
        ],
      },
      operationsApplied: ["replace_with_blocks"],
      warnings: [],
      metadata: {
        schemaVersion: "1.0",
        mode: "structured_edit",
        document: {
          version: "1.0",
          blocks: [
            {
              type: "paragraph",
              text: "Sehr geehrte Damen",
              style: "Normal",
            },
          ],
        },
        operationsApplied: ["replace_with_blocks"],
        warnings: [],
      },
    });

    vi.mocked(validateOutput).mockResolvedValue({
      valid: true,
      violations: [],
      severity: "none",
    });

    vi.mocked(createMessage).mockResolvedValue({
      id: "assistant-msg-2",
      draftId: "draft-1",
      role: "assistant",
      content: "Sehr geehrte Damen",
      toolCalls: null,
      createdAt: new Date(),
    });

    await handleAiMessage({
      draftId: "draft-1",
      sessionId: "session-1",
      userMessageId: "user-msg-1",
      userContent: "Write the letter now",
    });

    const fieldEvents = events.filter(([e]) => e === "field_update");
    expect(fieldEvents.length).toBeGreaterThanOrEqual(1);

    const completeEvents = events.filter(([e]) => e === "ai_message_complete");
    expect(completeEvents).toHaveLength(1);
  });

  it("emits error event when AI processing fails", async () => {
    vi.mocked(classifyIntent).mockRejectedValue(
      new Error("Azure OpenAI unreachable"),
    );

    await handleAiMessage({
      draftId: "draft-1",
      sessionId: "session-1",
      userMessageId: "user-msg-1",
      userContent: "Test message",
    });

    const errorEvents = events.filter(([e]) => e === "error");
    expect(errorEvents).toHaveLength(1);
    const payload = errorEvents[0]![1] as { code: string; message: string };
    expect(payload.code).toBe("AI_PROCESSING_FAILED");
  });

  it("skips processing when draft not found", async () => {
    // Clear previously queued once-values and set limit to always return []
    vi.clearAllMocks();
    resetDbChain();
    // No once-values queued — limit always returns [], so loadDraft gets no draft

    await handleAiMessage({
      draftId: "draft-1",
      sessionId: "session-1",
      userMessageId: "user-msg-1",
      userContent: "Test",
    });

    expect(classifyIntent).not.toHaveBeenCalled();
    expect(events).toHaveLength(0);
  });
});
