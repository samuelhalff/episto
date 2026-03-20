import { describe, it, expect } from "vitest";
import {
  PROMPT_VERSION,
  classifyIntentPrompt,
  extractFieldsPrompt,
  askFollowUpPrompt,
  draftLetterPrompt,
  reviseLetterPrompt,
  validateOutputPrompt,
} from "../src/modules/ai/prompts/index.js";

describe("PROMPT_VERSION", () => {
  it("is a semver string", () => {
    expect(PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("classifyIntentPrompt", () => {
  it("returns system + user messages", () => {
    const messages = classifyIntentPrompt({
      userMessage: "I want to cancel my insurance",
      locale: "de-CH",
    });
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe("system");
    expect(messages[1]!.role).toBe("user");
    expect(messages[1]!.content).toBe("I want to cancel my insurance");
  });

  it("system message mentions JSON output format", () => {
    const messages = classifyIntentPrompt({
      userMessage: "test",
      locale: "de-CH",
    });
    const system = messages[0]!.content as string;
    expect(system).toContain("JSON");
    expect(system).toContain("intent");
    expect(system).toContain("risk");
  });
});

describe("extractFieldsPrompt", () => {
  it("includes existing fields in system message", () => {
    const messages = extractFieldsPrompt({
      userMessage: "My name is Max Muster",
      existingFields: { subject: "Kündigung" },
      locale: "de-CH",
    });
    const system = messages[0]!.content as string;
    expect(system).toContain("Kündigung");
  });

  it("asks for JSON output", () => {
    const messages = extractFieldsPrompt({
      userMessage: "test",
      existingFields: {},
      locale: "fr-CH",
    });
    const system = messages[0]!.content as string;
    expect(system).toContain("JSON");
  });
});

describe("askFollowUpPrompt", () => {
  it("includes intent and existing fields", () => {
    const messages = askFollowUpPrompt({
      intent: "cancellation",
      existingFields: { subject: "Kündigung" },
      locale: "de-CH",
    });
    const system = messages[0]!.content as string;
    expect(system).toContain("cancellation");
    expect(system).toContain("Kündigung");
  });

  it("includes locale instruction for de-CH", () => {
    const messages = askFollowUpPrompt({
      intent: "complaint",
      existingFields: {},
      locale: "de-CH",
    });
    const system = messages[0]!.content as string;
    expect(system).toContain("Swiss German");
    expect(system).toContain("Hochdeutsch");
  });

  it("includes locale instruction for fr-CH", () => {
    const messages = askFollowUpPrompt({
      intent: "inquiry",
      existingFields: {},
      locale: "fr-CH",
    });
    const system = messages[0]!.content as string;
    expect(system).toContain("Swiss French");
  });
});

describe("draftLetterPrompt", () => {
  const input = {
    subject: "Kündigung Mietvertrag",
    intent: "cancellation",
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
      firstName: "Hans",
      lastName: "Verwalter",
      addressLine1: "Bahnhofstrasse 10",
      postalCode: "3011",
      city: "Bern",
    },
    userInstructions: "Please write a cancellation letter",
    conversationHistory: [],
  };

  it("includes safety preamble", () => {
    const messages = draftLetterPrompt(input);
    const system = messages[0]!.content as string;
    expect(system).toContain("NEVER invent facts");
    expect(system).toContain("JSON contract");
    expect(system).toContain("NEVER invent or cite specific legal articles");
  });

  it("includes locale instruction", () => {
    const messages = draftLetterPrompt(input);
    const system = messages[0]!.content as string;
    expect(system).toContain("Hochdeutsch");
  });

  it("includes sender and recipient names", () => {
    const messages = draftLetterPrompt(input);
    const system = messages[0]!.content as string;
    expect(system).toContain("Max Muster");
    expect(system).toContain("Hans Verwalter");
  });

  it("instructs to generate body only (not address blocks)", () => {
    const messages = draftLetterPrompt(input);
    const system = messages[0]!.content as string;
    expect(system).toContain("BODY ONLY");
    expect(system).toContain("structured_edit");
    expect(system).toContain("Do not use markdown headings");
  });

  it("includes conversation history", () => {
    const messages = draftLetterPrompt({
      ...input,
      conversationHistory: [
        { role: "user", content: "I need to cancel my lease" },
        { role: "assistant", content: "When should it be effective?" },
      ],
    });
    // system + 2 history + 1 user = 4 messages
    expect(messages).toHaveLength(4);
  });
});

describe("reviseLetterPrompt", () => {
  it("includes current body", () => {
    const messages = reviseLetterPrompt({
      currentBody: "Sehr geehrte Damen und Herren...",
      revisionInstruction: "Make it shorter",
      locale: "de-CH",
      tone: "formal",
    });
    const system = messages[0]!.content as string;
    expect(system).toContain("Sehr geehrte Damen und Herren");
  });

  it("includes safety rules", () => {
    const messages = reviseLetterPrompt({
      currentBody: "test",
      revisionInstruction: "test",
      locale: "de-CH",
      tone: "formal",
    });
    const system = messages[0]!.content as string;
    expect(system).toContain("NEVER invent facts");
    expect(system).toContain("JSON contract");
  });
});

describe("validateOutputPrompt", () => {
  it("checks for policy violations", () => {
    const messages = validateOutputPrompt({
      generatedContent: "Some letter content",
      locale: "de-CH",
    });
    const system = messages[0]!.content as string;
    expect(system).toContain("Threats");
    expect(system).toContain("Fraudulent");
    expect(system).toContain("JSON");
  });
});

describe("all prompts forbid legal hallucination", () => {
  it("draft prompt forbids legal citations", () => {
    const messages = draftLetterPrompt({
      subject: "test",
      intent: "demand",
      tone: "firm",
      locale: "de-CH",
      sender: {
        firstName: "A",
        lastName: "B",
        addressLine1: "X",
        postalCode: "1234",
        city: "Y",
      },
      recipient: {
        addressLine1: "X",
        postalCode: "1234",
        city: "Y",
      },
      userInstructions: "test",
      conversationHistory: [],
    });
    const system = messages[0]!.content as string;
    expect(system).toContain("NEVER invent or cite specific legal articles");
  });
});
