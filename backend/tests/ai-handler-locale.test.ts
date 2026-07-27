import { beforeEach, describe, expect, it, vi } from "vitest";

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

const acquireRedisLock = vi.hoisted(() => vi.fn());

vi.mock("../src/shared/redis-lock.js", () => ({
  acquireRedisLock,
}));

vi.mock("../src/modules/files/attachment-ingestion.service.js", () => ({
  buildAttachmentContextBlock: vi.fn(async () => ""),
}));

import { handleAiMessage } from "../src/modules/ai/ai.handler.js";
import {
  analyzeIntake,
  draftLetter,
  reviseLetter,
  validateOutput,
} from "../src/modules/ai/ai.service.js";
import { createMessage } from "../src/modules/messages/message.service.js";

const unsupportedLocaleMessage =
  "I can currently prepare Swiss letters only in German, French, Italian, or English. Please choose one of those languages.";

const mockDb = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  orderBy: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
};

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

function resetDbChain() {
  mockDb.select.mockReset().mockReturnValue(mockDb);
  mockDb.from.mockReset().mockReturnValue(mockDb);
  mockDb.where.mockReset().mockReturnValue(mockDb);
  mockDb.orderBy.mockReset().mockReturnValue(mockDb);
  mockDb.limit.mockReset().mockResolvedValue([{ metadata: null }]);
  mockDb.update.mockReset().mockReturnValue(mockDb);
  mockDb.set.mockReset().mockReturnValue(mockDb);
}

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

describe("handleAiMessage locale requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDbChain();
    acquireRedisLock.mockResolvedValue({
      release: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("persists a supported locale extracted during intake", async () => {
    primeDraftReads();
    vi.mocked(analyzeIntake).mockResolvedValue({
      intent: "general",
      risk: "low",
      summary: "Switch letter language to French",
      fields: { locale: "fr-CH" },
      ready: true,
      message: "I have switched the letter language to French.",
    });
    vi.mocked(createMessage).mockResolvedValue({
      id: "assistant-msg-locale",
      draftId: "draft-1",
      role: "assistant",
      content: "I have switched the letter language to French.",
      toolCalls: null,
      createdAt: new Date(),
    });

    await handleAiMessage({
      draftId: "draft-1",
      sessionId: "session-1",
      userMessageId: "user-msg-locale",
      userContent: "Please write the letter in French.",
    });

    expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ locale: "fr-CH" }));
  });

  it("rejects an unsupported locale request without mutating or generating", async () => {
    primeDraftReads();
    vi.mocked(analyzeIntake).mockResolvedValue({
      intent: "general",
      risk: "low",
      summary: "Unsupported language request",
      fields: { unsupportedLocaleRequest: "Spanish" },
      ready: true,
      message: "Ready to draft.",
    });
    vi.mocked(createMessage).mockResolvedValue({
      id: "assistant-msg-unsupported-locale",
      draftId: "draft-1",
      role: "assistant",
      content: unsupportedLocaleMessage,
      toolCalls: null,
      createdAt: new Date(),
    });

    await handleAiMessage({
      draftId: "draft-1",
      sessionId: "session-1",
      userMessageId: "user-msg-unsupported-locale",
      userContent: "Translate the letter to Spanish.",
    });

    expect(draftLetter).not.toHaveBeenCalled();
    expect(reviseLetter).not.toHaveBeenCalled();
    expect(mockDb.set).not.toHaveBeenCalledWith(
      expect.objectContaining({ locale: expect.anything() }),
    );
    expect(createMessage).toHaveBeenCalledWith(expect.anything(), {
      draftId: "draft-1",
      role: "assistant",
      content: unsupportedLocaleMessage,
    });
  });

  it("uses a supported requested locale for whole-letter revision", async () => {
    const draftWithBody = {
      ...DRAFT,
      body: "Bestehender deutscher Brieftext",
      subject: "Beschwerde",
      intent: "complaint",
      locale: "de-CH",
    };

    primeDraftReads({
      draft: draftWithBody,
      conversation: [
        { id: "msg-1", role: "user", content: "Original request" },
        { id: "msg-2", role: "assistant", content: "Bestehender deutscher Brieftext" },
        { id: "msg-3", role: "user", content: "Translate the whole letter to French" },
      ],
    });
    vi.mocked(reviseLetter).mockResolvedValue({
      mode: "structured_edit",
      subject: "Reclamation",
      body: "Corps de lettre revise en francais",
      document: {
        version: "1.0",
        blocks: [
          {
            type: "paragraph",
            text: "Corps de lettre revise en francais",
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
              text: "Corps de lettre revise en francais",
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
      id: "assistant-msg-revision-locale",
      draftId: "draft-1",
      role: "assistant",
      content: "Corps de lettre revise en francais",
      toolCalls: null,
      createdAt: new Date(),
    });

    await handleAiMessage({
      draftId: "draft-1",
      sessionId: "session-1",
      userMessageId: "user-msg-revision-locale",
      userContent: "Translate the whole letter to French",
    });

    expect(analyzeIntake).not.toHaveBeenCalled();
    expect(reviseLetter).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "fr-CH" }),
      expect.anything(),
      expect.anything(),
    );
    expect(mockDb.set).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: "fr-CH",
        subject: "Reclamation",
        body: "Corps de lettre revise en francais",
        metadata: expect.any(Object),
      }),
    );
  });

  it("rejects an unsupported locale request during revision without mutating", async () => {
    const draftWithBody = {
      ...DRAFT,
      body: "Existing drafted body",
      subject: "Complaint",
      intent: "complaint",
    };

    primeDraftReads({
      draft: draftWithBody,
      conversation: [
        { id: "msg-1", role: "user", content: "Original request" },
        { id: "msg-2", role: "assistant", content: "Existing drafted body" },
        { id: "msg-3", role: "user", content: "Translate the whole letter to Spanish" },
      ],
    });
    vi.mocked(createMessage).mockResolvedValue({
      id: "assistant-msg-revision-unsupported-locale",
      draftId: "draft-1",
      role: "assistant",
      content: unsupportedLocaleMessage,
      toolCalls: null,
      createdAt: new Date(),
    });

    await handleAiMessage({
      draftId: "draft-1",
      sessionId: "session-1",
      userMessageId: "user-msg-revision-unsupported-locale",
      userContent: "Translate the whole letter to Spanish",
    });

    expect(analyzeIntake).not.toHaveBeenCalled();
    expect(reviseLetter).not.toHaveBeenCalled();
    expect(mockDb.set).not.toHaveBeenCalledWith(
      expect.objectContaining({ locale: expect.anything() }),
    );
    expect(createMessage).toHaveBeenCalledWith(expect.anything(), {
      draftId: "draft-1",
      role: "assistant",
      content: unsupportedLocaleMessage,
    });
  });
});
