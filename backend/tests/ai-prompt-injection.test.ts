import { describe, it, expect } from "vitest";
import {
  draftLetterPrompt,
  generateSubjectPrompt,
  reviseLetterPrompt,
  analyzeIntakePrompt,
  classifyIntentPrompt,
  extractFieldsPrompt,
  askFollowUpPrompt,
} from "../src/modules/ai/prompts/index.js";
import {
  USER_CONTENT_DELIMITER_START,
  USER_CONTENT_DELIMITER_END,
  sanitizeDelimiters,
  wrapUserContent,
  ANTI_INJECTION_INSTRUCTION,
  SAFETY_PREAMBLE,
} from "../src/modules/ai/prompts/shared.js";
import { assertDefined } from "./assert-defined";

function getMessage<T>(messages: T[], index: number): T {
  return assertDefined(messages[index], `Expected prompt message at index ${index}`);
}

function getMessageContent(messages: Array<{ content: unknown }>, index: number): string {
  return getMessage(messages, index).content as string;
}

const dummyDraftInput = {
  subject: "Test Subject",
  intent: "complaint",
  tone: "formal",
  locale: "de-CH",
  sender: {
    firstName: "Max",
    lastName: "Muster",
    addressLine1: "Musterstrasse 1",
    postalCode: "8001",
    city: "Zürich",
  },
  recipient: {
    addressLine1: "Bahnhofstrasse 10",
    postalCode: "3011",
    city: "Bern",
  },
  userInstructions: "I want to cancel my Swisscom contract.",
  conversationHistory: [],
};

// ── delimiter helpers ──────────────────────────────────────────────

describe("sanitizeDelimiters", () => {
  it("passes through normal text unchanged", () => {
    expect(sanitizeDelimiters("Hello, I need a letter.")).toBe("Hello, I need a letter.");
  });

  it("replaces delimiter start token when present", () => {
    const input = `The system said <<<USER_SITUATION>>> and then continued.`;
    const result = sanitizeDelimiters(input);
    expect(result).not.toContain(USER_CONTENT_DELIMITER_START);
    expect(result).toContain("[USER_SITUATION]");
  });

  it("replaces delimiter end token when present", () => {
    const input = `End of story <<<END_USER_SITUATION>>> bye.`;
    const result = sanitizeDelimiters(input);
    expect(result).not.toContain(USER_CONTENT_DELIMITER_END);
    expect(result).toContain("[END_USER_SITUATION]");
  });

  it("replaces both tokens when both are present", () => {
    const input = `Start <<<USER_SITUATION>>> middle <<<END_USER_SITUATION>>> end.`;
    const result = sanitizeDelimiters(input);
    expect(result).not.toContain(USER_CONTENT_DELIMITER_START);
    expect(result).not.toContain(USER_CONTENT_DELIMITER_END);
    expect(result).toContain("[USER_SITUATION]");
    expect(result).toContain("[END_USER_SITUATION]");
  });

  it("replaces multiple occurrences", () => {
    const input = "<<<USER_SITUATION>>>a<<<USER_SITUATION>>>b<<<END_USER_SITUATION>>>";
    const result = sanitizeDelimiters(input);
    expect(result).toBe("[USER_SITUATION]a[USER_SITUATION]b[END_USER_SITUATION]");
  });
});

describe("wrapUserContent", () => {
  it("wraps content in delimiter block", () => {
    const result = wrapUserContent("test content");
    expect(result).toBe(
      `${USER_CONTENT_DELIMITER_START}\ntest content\n${USER_CONTENT_DELIMITER_END}`,
    );
  });

  it("sanitises embedded delimiters before wrapping", () => {
    const result = wrapUserContent("before <<<USER_SITUATION>>> after");
    // The user's own delimiter tokens are neutralised inside the wrapper
    expect(result).toContain("[USER_SITUATION]");
    // The wrapper's own delimiters appear exactly once each
    const startCount = result.split(USER_CONTENT_DELIMITER_START).length - 1;
    const endCount = result.split(USER_CONTENT_DELIMITER_END).length - 1;
    expect(startCount).toBe(1);
    expect(endCount).toBe(1);
  });
});

// ── system message anti-injection instruction ──────────────────────

describe("ANTI_INJECTION_INSTRUCTION", () => {
  it("is included in SAFETY_PREAMBLE", () => {
    expect(SAFETY_PREAMBLE).toContain(ANTI_INJECTION_INSTRUCTION);
  });

  it("references the delimiter tokens so models know the convention", () => {
    expect(ANTI_INJECTION_INSTRUCTION).toContain("<<<USER_SITUATION>>>");
    expect(ANTI_INJECTION_INSTRUCTION).toContain("<<<END_USER_SITUATION>>>");
  });
});

// ── draftLetterPrompt ──────────────────────────────────────────────

describe("draftLetterPrompt injection hardening", () => {
  it("places user instructions inside delimiter block in the USER message", () => {
    const messages = draftLetterPrompt(dummyDraftInput);
    const userContent = getMessageContent(messages, messages.length - 1);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_START);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_END);
    expect(userContent).toContain("I want to cancel my Swisscom contract.");
  });

  it("keeps anti-injection instruction in the SYSTEM message", () => {
    const messages = draftLetterPrompt(dummyDraftInput);
    const system = getMessageContent(messages, 0);
    expect(system).toContain(ANTI_INJECTION_INSTRUCTION);
  });

  it("does NOT place user instructions directly in the SYSTEM message", () => {
    const messages = draftLetterPrompt({
      ...dummyDraftInput,
      userInstructions: "UNIQUE_MARKER_7X3K",
    });
    const system = getMessageContent(messages, 0);
    expect(system).not.toContain("UNIQUE_MARKER_7X3K");
  });

  it("preserves existing safety rules alongside anti-injection instruction", () => {
    const messages = draftLetterPrompt(dummyDraftInput);
    const system = getMessageContent(messages, 0);
    expect(system).toContain("NEVER invent facts");
    expect(system).toContain("NEVER invent or cite specific legal articles");
    expect(system).toContain("STRICT RULES");
  });
});

// ── generateSubjectPrompt ──────────────────────────────────────────

describe("generateSubjectPrompt injection hardening", () => {
  it("places user instructions inside delimiter block in the USER message", () => {
    const messages = generateSubjectPrompt({
      intent: "cancellation",
      locale: "de-CH",
      body: "Sehr geehrte...",
      userInstructions: "Cancel my gym membership.",
    });
    const userContent = getMessageContent(messages, 1);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_START);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_END);
    expect(userContent).toContain("Cancel my gym membership.");
  });

  it("includes anti-injection instruction in SYSTEM message", () => {
    const messages = generateSubjectPrompt({
      intent: "cancellation",
      locale: "de-CH",
      body: "body",
      userInstructions: "test",
    });
    const system = getMessageContent(messages, 0);
    expect(system).toContain(ANTI_INJECTION_INSTRUCTION);
  });

  it("keeps the structured intent and body labels in the USER message", () => {
    const messages = generateSubjectPrompt({
      intent: "cancellation",
      locale: "en-CH",
      body: "Dear Sir/Madam...",
      userInstructions: "I want to cancel.",
    });
    const userContent = getMessageContent(messages, 1);
    expect(userContent).toContain("Intent: cancellation");
    expect(userContent).toContain("Drafted body:");
    expect(userContent).toContain("Dear Sir/Madam");
  });
});

// ── reviseLetterPrompt ─────────────────────────────────────────────

describe("reviseLetterPrompt injection hardening", () => {
  it("places revision instruction inside delimiter block in the USER message", () => {
    const messages = reviseLetterPrompt({
      currentBody: "Sehr geehrte Damen und Herren...",
      revisionInstruction: "Make it shorter and more polite.",
      locale: "de-CH",
      tone: "formal",
    });
    const userContent = getMessageContent(messages, 1);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_START);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_END);
    expect(userContent).toContain("Make it shorter and more polite.");
  });

  it("keeps anti-injection instruction in the SYSTEM message via SAFETY_PREAMBLE", () => {
    const messages = reviseLetterPrompt({
      currentBody: "test",
      revisionInstruction: "revise",
      locale: "de-CH",
      tone: "formal",
    });
    const system = getMessageContent(messages, 0);
    expect(system).toContain(ANTI_INJECTION_INSTRUCTION);
  });

  it("does NOT place revision instruction in the SYSTEM message", () => {
    const marker = "REVISE_MARKER_9A2F";
    const messages = reviseLetterPrompt({
      currentBody: "body",
      revisionInstruction: marker,
      locale: "de-CH",
      tone: "formal",
    });
    const system = getMessageContent(messages, 0);
    expect(system).not.toContain(marker);
  });

  it("still includes the current body in the SYSTEM message (it is not user text)", () => {
    const messages = reviseLetterPrompt({
      currentBody: "CURRENT_BODY_12345",
      revisionInstruction: "make it better",
      locale: "de-CH",
      tone: "formal",
    });
    const system = getMessageContent(messages, 0);
    expect(system).toContain("CURRENT_BODY_12345");
  });
});

// ── analyzeIntakePrompt ────────────────────────────────────────────

describe("analyzeIntakePrompt injection hardening", () => {
  it("places user message inside delimiter block in the USER message", () => {
    const messages = analyzeIntakePrompt({
      userMessage: "I want to cancel my Swisscom contract.",
      existingFields: { tone: "formal" },
      locale: "de-CH",
    });
    const userContent = getMessageContent(messages, 1);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_START);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_END);
    expect(userContent).toContain("I want to cancel my Swisscom contract.");
  });

  it("includes anti-injection instruction in SYSTEM message", () => {
    const messages = analyzeIntakePrompt({
      userMessage: "test",
      existingFields: {},
      locale: "de-CH",
    });
    const system = getMessageContent(messages, 0);
    expect(system).toContain(ANTI_INJECTION_INSTRUCTION);
  });

  it("preserves existing intake rules in system message", () => {
    const messages = analyzeIntakePrompt({
      userMessage: "test",
      existingFields: { tone: "formal" },
      locale: "de-CH",
    });
    const system = getMessageContent(messages, 0);
    expect(system).toContain('"fields"');
    expect(system).toContain('"ready"');
    expect(system).toContain("Recent conversation:");
  });

  it("wraps conversation history in delimiter block in the SYSTEM message", () => {
    const messages = analyzeIntakePrompt({
      userMessage: "Cancel my contract.",
      existingFields: {},
      locale: "de-CH",
      conversationHistory: [
        { role: "user", content: "I need to cancel my gym membership." },
        { role: "assistant", content: "Which gym?" },
      ],
    });
    const system = getMessageContent(messages, 0);
    // Conversation history is wrapped in delimiter block
    expect(system).toContain(USER_CONTENT_DELIMITER_START);
    expect(system).toContain(USER_CONTENT_DELIMITER_END);
    expect(system).toContain("I need to cancel my gym membership.");
    expect(system).toContain("Recent conversation:");
  });

  it("does NOT place raw user message in the SYSTEM message", () => {
    const marker = "INTAKE_MARKER_B7D1";
    const messages = analyzeIntakePrompt({
      userMessage: marker,
      existingFields: {},
      locale: "de-CH",
    });
    const system = getMessageContent(messages, 0);
    expect(system).not.toContain(marker);
  });
});

// ── classifyIntentPrompt ───────────────────────────────────────────

describe("classifyIntentPrompt injection hardening", () => {
  it("places user message inside delimiter block in the USER message", () => {
    const messages = classifyIntentPrompt({
      userMessage: "I want to cancel my insurance",
      locale: "de-CH",
    });
    const userContent = getMessageContent(messages, 1);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_START);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_END);
    expect(userContent).toContain("I want to cancel my insurance");
  });

  it("includes anti-injection instruction in SYSTEM message", () => {
    const messages = classifyIntentPrompt({
      userMessage: "test",
      locale: "de-CH",
    });
    const system = getMessageContent(messages, 0);
    expect(system).toContain(ANTI_INJECTION_INSTRUCTION);
  });

  it("preserves JSON output format instruction", () => {
    const messages = classifyIntentPrompt({
      userMessage: "test",
      locale: "de-CH",
    });
    const system = getMessageContent(messages, 0);
    expect(system).toContain("JSON");
    expect(system).toContain("intent");
    expect(system).toContain("risk");
  });
});

// ── extractFieldsPrompt ────────────────────────────────────────────

describe("extractFieldsPrompt injection hardening", () => {
  it("places latest user message inside delimiter block in the USER message", () => {
    const messages = extractFieldsPrompt({
      userMessage: "My name is Max Muster",
      existingFields: {},
      locale: "de-CH",
    });
    const userContent = getMessageContent(messages, 1);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_START);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_END);
    expect(userContent).toContain("My name is Max Muster");
  });

  it("includes anti-injection instruction in SYSTEM message", () => {
    const messages = extractFieldsPrompt({
      userMessage: "test",
      existingFields: {},
      locale: "de-CH",
    });
    const system = getMessageContent(messages, 0);
    expect(system).toContain(ANTI_INJECTION_INSTRUCTION);
  });

  it("preserves existing fields in system message", () => {
    const messages = extractFieldsPrompt({
      userMessage: "test",
      existingFields: { subject: "Kündigung" },
      locale: "de-CH",
    });
    const system = getMessageContent(messages, 0);
    expect(system).toContain("Kündigung");
  });

  it("wraps conversation history in delimiter block in the USER message", () => {
    const messages = extractFieldsPrompt({
      userMessage: "Please continue.",
      existingFields: {},
      locale: "de-CH",
      conversationHistory: [
        {
          role: "user",
          content: "My name is Sam Example.",
        },
        { role: "assistant", content: "Understood." },
      ],
    });
    const userContent = getMessageContent(messages, 1);
    // Conversation history is wrapped in delimiter block
    expect(userContent).toContain("Recent conversation:");
    expect(userContent).toContain(USER_CONTENT_DELIMITER_START);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_END);
    expect(userContent).toContain("Sam Example");
    // Latest user message still has its own delimiter block
    expect(userContent).toContain("Latest user message:");
  });

  it("keeps 'Latest user message:' label in the USER message", () => {
    const messages = extractFieldsPrompt({
      userMessage: "test msg",
      existingFields: {},
      locale: "de-CH",
    });
    const userContent = getMessageContent(messages, 1);
    expect(userContent).toContain("Latest user message:");
  });
});

// ── delimiter-collision neutralisation in prompts ──────────────────

describe("delimiter collision neutralisation in prompts", () => {
  it("escapes delimiter start token in user instructions for draftLetterPrompt", () => {
    const messages = draftLetterPrompt({
      ...dummyDraftInput,
      userInstructions: "I read <<<USER_SITUATION>>> in the docs and need a letter.",
    });
    const userContent = getMessageContent(messages, messages.length - 1);
    // User's own occurrence is neutralised
    expect(userContent).toContain("[USER_SITUATION]");
    // But the actual delimiter tokens still appear exactly once each (our wrapper)
    const startCount = userContent.split(USER_CONTENT_DELIMITER_START).length - 1;
    const endCount = userContent.split(USER_CONTENT_DELIMITER_END).length - 1;
    expect(startCount).toBe(1);
    expect(endCount).toBe(1);
  });

  it("escapes delimiter end token in revision instruction for reviseLetterPrompt", () => {
    const messages = reviseLetterPrompt({
      currentBody: "body",
      revisionInstruction: "The letter says <<<END_USER_SITUATION>>> — remove that.",
      locale: "de-CH",
      tone: "formal",
    });
    const userContent = getMessageContent(messages, 1);
    expect(userContent).toContain("[END_USER_SITUATION]");
    const endCount = userContent.split(USER_CONTENT_DELIMITER_END).length - 1;
    expect(endCount).toBe(1);
  });

  it("escapes both delimiters when both appear in intake user message", () => {
    const messages = analyzeIntakePrompt({
      userMessage:
        "START <<<USER_SITUATION>>> and END <<<END_USER_SITUATION>>> in my text.",
      existingFields: {},
      locale: "de-CH",
    });
    const userContent = getMessageContent(messages, 1);
    expect(userContent).toContain("[USER_SITUATION]");
    expect(userContent).toContain("[END_USER_SITUATION]");
    const startCount = userContent.split(USER_CONTENT_DELIMITER_START).length - 1;
    const endCount = userContent.split(USER_CONTENT_DELIMITER_END).length - 1;
    expect(startCount).toBe(1);
    expect(endCount).toBe(1);
  });
});

// ── askFollowUpPrompt ──────────────────────────────────────────────

describe("askFollowUpPrompt injection hardening", () => {
  it("includes anti-injection instruction in SYSTEM message", () => {
    const messages = askFollowUpPrompt({
      intent: "cancellation",
      existingFields: { recipientCompany: "Swisscom AG" },
      locale: "en-CH",
    });
    const system = getMessageContent(messages, 0);
    expect(system).toContain(ANTI_INJECTION_INSTRUCTION);
  });

  it("wraps conversation history in delimiter block in the SYSTEM message", () => {
    const messages = askFollowUpPrompt({
      intent: "cancellation",
      existingFields: { recipientCompany: "Swisscom AG" },
      locale: "en-CH",
      conversationHistory: [
        { role: "user", content: "I need to cancel my lease." },
        { role: "assistant", content: "When should it be effective?" },
      ],
    });
    const system = getMessageContent(messages, 0);
    // Conversation history is wrapped in delimiter block
    expect(system).toContain(USER_CONTENT_DELIMITER_START);
    expect(system).toContain(USER_CONTENT_DELIMITER_END);
    expect(system).toContain("I need to cancel my lease.");
    expect(system).toContain("Recent conversation:");
  });

  it("has only a system message (no user message with free text)", () => {
    const messages = askFollowUpPrompt({
      intent: "cancellation",
      existingFields: {},
      locale: "de-CH",
    });
    expect(messages).toHaveLength(1);
    expect(getMessage(messages, 0).role).toBe("system");
  });
});

// ── behaviour preservation ─────────────────────────────────────────

describe("behaviour preservation: legitimate input still works", () => {
  it("draftLetterPrompt with normal Swisscom cancellation still produces correct structure", () => {
    const messages = draftLetterPrompt({
      ...dummyDraftInput,
      userInstructions:
        "I need to cancel my Swisscom mobile subscription because I'm moving abroad. Contract number 12345, effective end of next month.",
    });
    // System + 1 user message (no conversation history) = 2 messages
    expect(messages).toHaveLength(2);
    expect(getMessage(messages, 0).role).toBe("system");
    expect(getMessage(messages, 1).role).toBe("user");

    const system = getMessageContent(messages, 0);
    expect(system).toContain("complaint"); // intent
    expect(system).toContain("NEVER invent facts"); // SAFETY_PREAMBLE included
    expect(system).toContain(ANTI_INJECTION_INSTRUCTION);

    const userContent = getMessageContent(messages, 1);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_START);
    expect(userContent).toContain("moving abroad");
    expect(userContent).toContain("Contract number 12345");
    expect(userContent).toContain(USER_CONTENT_DELIMITER_END);
  });

  it("reviseLetterPrompt with normal revision still works", () => {
    const messages = reviseLetterPrompt({
      currentBody: "Sehr geehrte Damen und Herren\n\nHiermit kündige ich...",
      revisionInstruction:
        "Please make the tone friendlier and add a thank-you paragraph at the end.",
      locale: "de-CH",
      tone: "formal",
    });
    expect(messages).toHaveLength(2);
    expect(getMessage(messages, 0).role).toBe("system");
    expect(getMessage(messages, 1).role).toBe("user");

    const system = getMessageContent(messages, 0);
    expect(system).toContain("Sehr geehrte Damen und Herren");
    expect(system).toContain("NEVER invent facts"); // SAFETY_PREAMBLE included

    const userContent = getMessageContent(messages, 1);
    expect(userContent).toContain("friendlier");
    expect(userContent).toContain("thank-you paragraph");
    expect(userContent).toContain(USER_CONTENT_DELIMITER_START);
    expect(userContent).toContain(USER_CONTENT_DELIMITER_END);
  });
});
