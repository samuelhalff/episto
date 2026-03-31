import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { DraftEventHandler } from "../src/modules/drafting/draft-events.js";
import { subscribeDraft, unsubscribeDraft } from "../src/modules/drafting/draft-events.js";
import { AppError } from "../src/shared/errors/index.js";

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
  analyzeIntake: vi.fn(),
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

import { handleAiMessage, handleComposeFromContext } from "../src/modules/ai/ai.handler.js";
import {
  analyzeIntake,
  draftLetter,
  reviseLetter,
  validateOutput,
} from "../src/modules/ai/ai.service.js";
import { createMessage } from "../src/modules/messages/message.service.js";

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
  mockDb.select.mockReset().mockReturnValue(mockDb);
  mockDb.from.mockReset().mockReturnValue(mockDb);
  mockDb.where.mockReset().mockReturnValue(mockDb);
  mockDb.orderBy.mockReset().mockReturnValue(mockDb);
  mockDb.limit.mockReset().mockResolvedValue([{ metadata: null }]);
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

function primeDraftReads(options?: {
  draft?: typeof DRAFT;
  conversation?: Array<{ id: string; role: string; content: string }>;
  metadata?: unknown;
}) {
  const draft = options?.draft ?? DRAFT;
  const conversation = options?.conversation ?? [];
  const metadata = options?.metadata ?? draft.metadata;

  mockDb.limit
    .mockResolvedValueOnce([draft])
    .mockResolvedValueOnce(conversation)
    .mockResolvedValue([{ metadata }]);
}

describe("handleAiMessage", () => {
  let events: Array<[string, unknown]>;
  let handler: DraftEventHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDbChain();
    events = [];
    handler = (event, payload) => events.push([event, payload]);
    subscribeDraft("draft-1", handler);
  });

  afterEach(() => {
    unsubscribeDraft("draft-1", handler);
  });

  it("emits the one-pass intake follow-up question when context is still missing", async () => {
    primeDraftReads();
    vi.mocked(analyzeIntake).mockResolvedValue({
      intent: "cancellation",
      risk: "low",
      summary: "Cancel insurance",
      fields: {},
      ready: false,
      question: "What should the recipient do next?",
    });
    vi.mocked(createMessage).mockResolvedValue({
      id: "assistant-msg-1",
      draftId: "draft-1",
      role: "assistant",
      content: "What should the recipient do next?",
      toolCalls: null,
      createdAt: new Date(),
    });

    await handleAiMessage({
      draftId: "draft-1",
      sessionId: "session-1",
      userMessageId: "user-msg-1",
      userContent: "I want to cancel my insurance",
    });

    expect(analyzeIntake).toHaveBeenCalledOnce();
    expect(createMessage).toHaveBeenCalledWith(expect.anything(), {
      draftId: "draft-1",
      role: "assistant",
      content: "What should the recipient do next?",
    });
    expect(events).toContainEqual([
      "ai_message_complete",
      expect.objectContaining({ fullContent: "What should the recipient do next?" }),
    ]);
  });

  it("preserves existing sender workspace data when intake analysis only adds recipient fields", async () => {
    const metadata = {
      workspaceDraft: {
        senderForm: {
          fullName: "Sam Example",
          addressLine1: "Bahnhofstrasse 1",
          postalCode: "8001",
          city: "Zurich",
        },
      },
    };

    primeDraftReads({
      draft: { ...DRAFT, metadata, intent: "cancellation" },
      metadata,
    });
    vi.mocked(analyzeIntake).mockResolvedValue({
      intent: "cancellation",
      risk: "low",
      summary: "Cancel contract",
      fields: { recipientCompany: "Swisscom" },
      ready: false,
      question: "What should Swisscom do next?",
    });
    vi.mocked(createMessage).mockResolvedValue({
      id: "assistant-msg-preserve",
      draftId: "draft-1",
      role: "assistant",
      content: "What should Swisscom do next?",
      toolCalls: null,
      createdAt: new Date(),
    });

    await handleAiMessage({
      draftId: "draft-1",
      sessionId: "session-1",
      userMessageId: "user-msg-keep-sender",
      userContent: "Please send this to Swisscom.",
    });

    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          workspaceDraft: {
            senderForm: {
              fullName: "Sam Example",
              addressLine1: "Bahnhofstrasse 1",
              postalCode: "8001",
              city: "Zurich",
            },
            recipientForm: {
              isCompany: true,
              showManual: false,
              fullName: "",
              companyName: "Swisscom",
              selectedCompany: null,
              addressLine1: "",
              postalCode: "",
              city: "",
            },
          },
        },
      }),
    );
  });

  it("keeps intake question-led even when the minimum context threshold is already met", async () => {
    const metadata = {
      workspaceDraft: {
        recipientForm: {
          isCompany: true,
          showManual: false,
          fullName: "",
          companyName: "Swisscom AG",
          selectedCompany: null,
          addressLine1: "",
          postalCode: "",
          city: "",
        },
      },
    };

    primeDraftReads({
      draft: { ...DRAFT, metadata },
      metadata,
    });
    vi.mocked(analyzeIntake).mockResolvedValue({
      intent: "cancellation",
      risk: "low",
      summary: "Cancel insurance",
      fields: { recipientCompany: "Swisscom AG" },
      ready: true,
      message: "I have enough to start structuring this. You can keep adding details here, or move on when you're ready.",
    });
    vi.mocked(createMessage).mockResolvedValue({
      id: "assistant-msg-2",
      draftId: "draft-1",
      role: "assistant",
      content: "I have enough to start structuring this. You can keep adding details here, or move on when you're ready.",
      toolCalls: null,
      createdAt: new Date(),
    });

    await handleAiMessage({
      draftId: "draft-1",
      sessionId: "session-1",
      userMessageId: "user-msg-2",
      userContent:
        "I want to cancel my Swisscom insurance contract because the premium is too high and the service no longer fits my needs.",
    });

    expect(draftLetter).not.toHaveBeenCalled();
    expect(events).toContainEqual([
      "ai_message_complete",
      expect.objectContaining({
        fullContent:
          "I have enough to start structuring this. You can keep adding details here, or move on when you're ready.",
      }),
    ]);
  });

  it("composes from saved context and uses the co-generated subject from the draft response", async () => {
    const metadata = {
      workspaceDraft: {
        recipientForm: {
          isCompany: true,
          showManual: false,
          fullName: "",
          companyName: "Swisscom AG",
          selectedCompany: null,
          addressLine1: "Alte Tiefenaustrasse 6",
          postalCode: "3050",
          city: "Ittigen",
        },
      },
    };

    primeDraftReads({
      draft: { ...DRAFT, metadata, intent: "complaint" },
      conversation: [
        {
          id: "assistant-msg-1",
          role: "assistant",
          content: "What exactly should the company correct?",
        },
        {
          id: "user-msg-1",
          role: "user",
          content:
            "I want to complain about the last invoice because I was billed twice for the same service and need a correction.",
        },
      ],
      metadata,
    });
    vi.mocked(draftLetter).mockResolvedValue({
      mode: "structured_edit",
      subject: "Beanstandung Ihrer Rechnung",
      body: "Sehr geehrte Damen und Herren\n\nBitte korrigieren Sie die doppelte Belastung auf meiner letzten Rechnung.",
      document: {
        version: "1.0",
        blocks: [
          {
            type: "paragraph",
            text: "Sehr geehrte Damen und Herren\n\nBitte korrigieren Sie die doppelte Belastung auf meiner letzten Rechnung.",
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
              text: "Sehr geehrte Damen und Herren\n\nBitte korrigieren Sie die doppelte Belastung auf meiner letzten Rechnung.",
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
      id: "assistant-msg-compose",
      draftId: "draft-1",
      role: "assistant",
      content: "Sehr geehrte Damen und Herren\n\nBitte korrigieren Sie die doppelte Belastung auf meiner letzten Rechnung.",
      toolCalls: null,
      createdAt: new Date(),
    });

    await handleComposeFromContext({
      draftId: "draft-1",
      sessionId: "session-1",
    });

    expect(analyzeIntake).not.toHaveBeenCalled();
    expect(draftLetter).toHaveBeenCalledOnce();
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "Sehr geehrte Damen und Herren\n\nBitte korrigieren Sie die doppelte Belastung auf meiner letzten Rechnung.",
        subject: "Beanstandung Ihrer Rechnung",
      }),
    );
  });

  it("composes the first body after intake analysis fills missing context from the saved thread", async () => {
    const metadata = {
      workspaceDraft: {
        senderForm: {
          fullName: "Sam Example",
          addressLine1: "Bahnhofstrasse 1",
          postalCode: "8001",
          city: "Zurich",
        },
      },
    };

    primeDraftReads({
      draft: { ...DRAFT, metadata },
      conversation: [
        {
          id: "user-msg-1",
          role: "user",
          content: "I want to cancel my internet contract with Swisscom.",
        },
        {
          id: "assistant-msg-1",
          role: "assistant",
          content: "What should the company do, and when should the cancellation take effect?",
        },
        {
          id: "user-msg-2",
          role: "user",
          content: "Cancel it at the next possible date. The recipient is Swisscom AG in Ittigen.",
        },
      ],
      metadata,
    });
    vi.mocked(analyzeIntake).mockResolvedValue({
      intent: "cancellation",
      risk: "low",
      summary: "Cancel internet contract",
      fields: {
        recipientCompany: "Swisscom AG",
        recipientAddressLine1: "Alte Tiefenaustrasse 6",
        recipientPostalCode: "3050",
        recipientCity: "Ittigen",
      },
      ready: true,
      message: "Ready to draft.",
    });
    vi.mocked(draftLetter).mockResolvedValue({
      mode: "structured_edit",
      subject: "Kuendigung Internetvertrag",
      body: "Sehr geehrte Damen und Herren\n\nHiermit kuendige ich meinen Internetvertrag ordentlich.",
      document: {
        version: "1.0",
        blocks: [
          {
            type: "paragraph",
            text: "Sehr geehrte Damen und Herren\n\nHiermit kuendige ich meinen Internetvertrag ordentlich.",
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
              text: "Sehr geehrte Damen und Herren\n\nHiermit kuendige ich meinen Internetvertrag ordentlich.",
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
      id: "assistant-msg-compose",
      draftId: "draft-1",
      role: "assistant",
      content: "Sehr geehrte Damen und Herren\n\nHiermit kuendige ich meinen Internetvertrag ordentlich.",
      toolCalls: null,
      createdAt: new Date(),
    });

    await handleComposeFromContext({
      draftId: "draft-1",
      sessionId: "session-1",
    });

    expect(analyzeIntake).toHaveBeenCalledOnce();
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        body: "Sehr geehrte Damen und Herren\n\nHiermit kuendige ich meinen Internetvertrag ordentlich.",
        subject: "Kuendigung Internetvertrag",
      }),
    );
  });

  it("skips extra intake analysis when canonical state already proves the draft is ready", async () => {
    const metadata = {
      workspaceDraft: {
        recipientForm: {
          isCompany: true,
          showManual: false,
          fullName: "",
          companyName: "Swisscom AG",
          selectedCompany: null,
          addressLine1: "Alte Tiefenaustrasse 6",
          postalCode: "3050",
          city: "Ittigen",
        },
      },
    };

    primeDraftReads({
      draft: { ...DRAFT, metadata, intent: "cancellation" },
      conversation: [
        {
          id: "user-msg-1",
          role: "user",
          content:
            "I want to cancel my Swisscom internet contract because the monthly price is too high and I want the cancellation to take effect at the earliest possible date.",
        },
      ],
      metadata,
    });
    vi.mocked(draftLetter).mockResolvedValue({
      mode: "structured_edit",
      subject: "Kuendigung Internetvertrag",
      body: "Sehr geehrte Damen und Herren\n\nHiermit kuendige ich meinen Internetvertrag ordentlich.",
      document: {
        version: "1.0",
        blocks: [
          {
            type: "paragraph",
            text: "Sehr geehrte Damen und Herren\n\nHiermit kuendige ich meinen Internetvertrag ordentlich.",
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
              text: "Sehr geehrte Damen und Herren\n\nHiermit kuendige ich meinen Internetvertrag ordentlich.",
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
      id: "assistant-msg-compose-ready",
      draftId: "draft-1",
      role: "assistant",
      content: "Sehr geehrte Damen und Herren\n\nHiermit kuendige ich meinen Internetvertrag ordentlich.",
      toolCalls: null,
      createdAt: new Date(),
    });

    await handleComposeFromContext({
      draftId: "draft-1",
      sessionId: "session-1",
    });

    expect(analyzeIntake).not.toHaveBeenCalled();
    expect(draftLetter).toHaveBeenCalledOnce();
  });

  it("skips intake analysis for revision turns", async () => {
    const draftWithBody = {
      ...DRAFT,
      body: "Existing drafted body",
      intent: "complaint",
    };

    primeDraftReads({
      draft: draftWithBody,
      conversation: [
        { id: "msg-1", role: "user", content: "Original request" },
        { id: "msg-2", role: "assistant", content: "Existing drafted body" },
        { id: "msg-3", role: "user", content: "Make it firmer" },
      ],
    });
    vi.mocked(reviseLetter).mockResolvedValue({
      mode: "structured_edit",
      subject: "Beschwerde",
      body: "Revised body",
      document: {
        version: "1.0",
        blocks: [{ type: "paragraph", text: "Revised body", style: "Normal" }],
      },
      operationsApplied: ["replace_with_blocks"],
      warnings: [],
      metadata: {
        schemaVersion: "1.0",
        mode: "structured_edit",
        document: {
          version: "1.0",
          blocks: [{ type: "paragraph", text: "Revised body", style: "Normal" }],
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
      id: "assistant-msg-revision",
      draftId: "draft-1",
      role: "assistant",
      content: "Revised body",
      toolCalls: null,
      createdAt: new Date(),
    });

    await handleAiMessage({
      draftId: "draft-1",
      sessionId: "session-1",
      userMessageId: "user-msg-revision",
      userContent: "Make it firmer",
    });

    expect(analyzeIntake).not.toHaveBeenCalled();
    expect(reviseLetter).toHaveBeenCalledOnce();
  });

  it("emits an error event when AI processing fails", async () => {
    primeDraftReads();
    vi.mocked(analyzeIntake).mockRejectedValue(
      new AppError({
        family: "provider_outage",
        statusCode: 503,
        code: "AI_RATE_LIMITED",
        message: "Rate limited",
        userMessage: "The AI service is temporarily busy. Please try again in a moment.",
        userAction: "Retry shortly.",
      }),
    );
    vi.mocked(createMessage).mockResolvedValue({
      id: "assistant-msg-error",
      draftId: "draft-1",
      role: "assistant",
      content: "The AI service is temporarily busy. Please try again in a moment.",
      toolCalls: null,
      createdAt: new Date(),
    });

    await handleAiMessage({
      draftId: "draft-1",
      sessionId: "session-1",
      userMessageId: "user-msg-error",
      userContent: "Please help",
    });

    expect(events).toContainEqual([
      "error",
      {
        code: "AI_RATE_LIMITED",
        message: "The AI service is temporarily busy. Please try again in a moment.",
      },
    ]);
  });

  it("skips processing when the draft no longer exists", async () => {
    mockDb.limit.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await handleAiMessage({
      draftId: "draft-1",
      sessionId: "session-1",
      userMessageId: "user-msg-missing",
      userContent: "Hello",
    });

    expect(analyzeIntake).not.toHaveBeenCalled();
    expect(events).toHaveLength(0);
  });
});
