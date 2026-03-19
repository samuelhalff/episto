/**
 * Prompt templates for AI drafting pipeline.
 *
 * Backend-owned, versioned in source control.
 * Prompts operate on canonical draft/session data from shared/ schemas.
 *
 * Rules (from ai-provider-and-prompts.md):
 * - Include only the minimum user data required for each stage
 * - Explicitly forbid invention of facts not in user input
 * - Keep locale explicit on every call
 * - Never generate Swiss German dialect for formal letters
 * - Never invent Article numbers or specific laws
 */

import type { ChatMessage } from "../adapters/azure-openai.js";

// ---------------------------------------------------------------------------
// Prompt version — increment when prompts change significantly
// ---------------------------------------------------------------------------

export const PROMPT_VERSION = "1.0.0";

// ---------------------------------------------------------------------------
// Locale instructions
// ---------------------------------------------------------------------------

const LOCALE_MAP: Record<string, string> = {
  "de-CH": "Write in standard Swiss German (Hochdeutsch). Never use Swiss German dialect (Mundart). Use formal register appropriate for Swiss business correspondence.",
  "fr-CH": "Write in standard Swiss French. Use formal register appropriate for Swiss business correspondence.",
  "it-CH": "Write in standard Swiss Italian. Use formal register appropriate for Swiss business correspondence.",
  "en-CH": "Write in formal British English appropriate for Swiss business correspondence.",
};

function localeInstruction(locale: string): string {
  return LOCALE_MAP[locale] ?? LOCALE_MAP["de-CH"]!;
}

// ---------------------------------------------------------------------------
// Safety preamble (shared across all prompts)
// ---------------------------------------------------------------------------

const SAFETY_PREAMBLE = `You are a professional letter-writing assistant for Swiss Mail, a service that helps users compose and send formal Swiss correspondence.

STRICT RULES:
- NEVER invent facts, names, dates, addresses, or details not provided by the user.
- NEVER invent or cite specific legal articles, statutes, or law numbers. If asked, use generic phrasing like "under applicable Swiss law" or "in accordance with the relevant regulations".
- NEVER generate threatening, extortionate, or fraudulent content.
- NEVER impersonate another person or organization.
- If information is missing, ask the user to provide it rather than filling in placeholders.
- Output only the letter content requested. Do not add meta-commentary unless specifically asked.`;

// ---------------------------------------------------------------------------
// 1. classify-intent
// ---------------------------------------------------------------------------

export interface ClassifyIntentInput {
  userMessage: string;
  locale: string;
}

export function classifyIntentPrompt(input: ClassifyIntentInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a classification engine. Analyze the user's message and return a JSON object with these fields:
- "intent": one of "complaint", "cancellation", "demand", "inquiry", "notice", "general", "blocked"
- "risk": one of "low", "medium", "high"
- "summary": a brief one-line summary of what the user wants to write about

If the content contains threats, extortion, fraud, impersonation, hate speech, or other clearly harmful content, set intent to "blocked" and risk to "high".

Return ONLY valid JSON, no markdown fences.`,
    },
    {
      role: "user",
      content: input.userMessage,
    },
  ];
}

// ---------------------------------------------------------------------------
// 2. extract-fields
// ---------------------------------------------------------------------------

export interface ExtractFieldsInput {
  userMessage: string;
  existingFields: Record<string, unknown>;
  locale: string;
}

export function extractFieldsPrompt(input: ExtractFieldsInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a field extraction engine. Given the user's message and existing draft fields, extract any new or updated values for the following letter fields:

- subject (string, max 200 chars)
- tone ("formal", "neutral", "firm")
- recipientFirstName, recipientLastName, recipientCompany
- recipientAddressLine1, recipientPostalCode, recipientCity
- senderFirstName, senderLastName
- senderAddressLine1, senderPostalCode, senderCity
- enclosureNote (e.g., "Beilage: Kopie Mietvertrag")
- deliveryType ("standard" or "registered")

Return ONLY a JSON object with the fields that were found or updated. Omit fields that are not mentioned. Do NOT invent values — only extract what the user explicitly provides.

Current fields: ${JSON.stringify(input.existingFields)}`,
    },
    {
      role: "user",
      content: input.userMessage,
    },
  ];
}

// ---------------------------------------------------------------------------
// 3. ask-follow-up
// ---------------------------------------------------------------------------

export interface AskFollowUpInput {
  intent: string;
  existingFields: Record<string, unknown>;
  locale: string;
}

export function askFollowUpPrompt(input: AskFollowUpInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a letter drafting assistant helping a user prepare a formal Swiss letter.

The user's intent is: "${input.intent}"
Current draft fields: ${JSON.stringify(input.existingFields)}

Identify the SINGLE most important missing piece of information needed to draft this letter.
Ask ONE clear, specific question to obtain it.
${localeInstruction(input.locale)}

If all essential information is already present, respond with: {"ready": true, "message": "All information collected. Ready to draft."}
Otherwise respond with: {"ready": false, "question": "your question here"}

Return ONLY valid JSON, no markdown fences.`,
    },
  ];
}

// ---------------------------------------------------------------------------
// 4. draft-letter
// ---------------------------------------------------------------------------

export interface DraftLetterInput {
  subject: string;
  intent: string;
  tone: string;
  locale: string;
  sender: {
    firstName: string;
    lastName: string;
    company?: string | null;
    addressLine1: string;
    postalCode: string;
    city: string;
  };
  recipient: {
    firstName?: string | null;
    lastName?: string | null;
    company?: string | null;
    addressLine1: string;
    postalCode: string;
    city: string;
  };
  enclosureNote?: string | null;
  userInstructions: string;
  conversationHistory: { role: string; content: string }[];
}

export function draftLetterPrompt(input: DraftLetterInput): ChatMessage[] {
  const recipientName = [input.recipient.firstName, input.recipient.lastName, input.recipient.company]
    .filter(Boolean)
    .join(" ");

  return [
    {
      role: "system",
      content: `${SAFETY_PREAMBLE}

${localeInstruction(input.locale)}

You are drafting a formal Swiss letter with these parameters:
- Subject: ${input.subject}
- Intent: ${input.intent}
- Tone: ${input.tone}
- Sender: ${input.sender.firstName} ${input.sender.lastName}${input.sender.company ? `, ${input.sender.company}` : ""}
- Recipient: ${recipientName}
${input.enclosureNote ? `- Enclosure note: ${input.enclosureNote}` : ""}

Generate the letter BODY ONLY (the content between the salutation and closing).
Do NOT include the sender address block, recipient address block, date, or subject line — those are rendered separately from structured data.
Include an appropriate salutation and closing signature line.

Use facts ONLY from the user's input. Never invent dates, reference numbers, amounts, or legal citations.`,
    },
    // Include conversation history for context
    ...input.conversationHistory.map(
      (msg) =>
        ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }) satisfies ChatMessage,
    ),
    {
      role: "user",
      content: input.userInstructions,
    },
  ];
}

// ---------------------------------------------------------------------------
// 5. revise-letter
// ---------------------------------------------------------------------------

export interface ReviseLetterInput {
  currentBody: string;
  revisionInstruction: string;
  locale: string;
  tone: string;
}

export function reviseLetterPrompt(input: ReviseLetterInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: `${SAFETY_PREAMBLE}

${localeInstruction(input.locale)}

You are revising a formal Swiss letter. The current letter body is provided below.
Apply the user's revision instruction while maintaining the ${input.tone} tone.

CURRENT LETTER BODY:
---
${input.currentBody}
---

Output the COMPLETE revised letter body. Do not add commentary — output only the letter text.
Use facts ONLY from the existing letter and user instruction. Never invent new facts.`,
    },
    {
      role: "user",
      content: input.revisionInstruction,
    },
  ];
}

// ---------------------------------------------------------------------------
// 6. validate-output
// ---------------------------------------------------------------------------

export interface ValidateOutputInput {
  generatedContent: string;
  locale: string;
}

export function validateOutputPrompt(input: ValidateOutputInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: `You are a content validation engine. Check the following generated letter content for policy violations.

Check for:
1. Threats or intimidation
2. Fraudulent claims or impersonation
3. Fabricated legal citations (specific article numbers, specific law names)
4. Hate speech or discriminatory language
5. Content that appears to be an attempt at extortion

Return a JSON object:
- "valid": true/false
- "violations": [] (array of violation descriptions, empty if valid)
- "severity": "none" | "warning" | "blocked"

Return ONLY valid JSON, no markdown fences.`,
    },
    {
      role: "user",
      content: input.generatedContent,
    },
  ];
}
