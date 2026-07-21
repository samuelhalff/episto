import type { ChatMessage } from "../adapters/azure-openai.js";
import {
  DOCUMENT_WITH_SUBJECT_RESPONSE_RULES,
  SAFETY_PREAMBLE,
  ANTI_INJECTION_INSTRUCTION,
  localeInstruction,
  toChatHistory,
  wrapUserContent,
  type PromptConversationMessage,
} from "./shared.js";

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
  conversationHistory: PromptConversationMessage[];
}

export function draftLetterPrompt(input: DraftLetterInput): ChatMessage[] {
  const recipientName = [
    input.recipient.firstName,
    input.recipient.lastName,
    input.recipient.company,
  ]
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
Do NOT include a salutation, a complimentary close, a signature line, or a gratitude sign-off such as "Thank you for your attention" or "Yours faithfully".
End with the final substantive sentence of the letter body, not with a sign-off formula.
Return both the subject and the body using the JSON contract below.

${DOCUMENT_WITH_SUBJECT_RESPONSE_RULES}

Use facts ONLY from the user's input. Never invent dates, reference numbers, amounts, or legal citations.`,
    },
    ...toChatHistory(input.conversationHistory),
    {
      role: "user",
      content: wrapUserContent(input.userInstructions),
    },
  ];
}

export interface GenerateSubjectInput {
  intent: string;
  locale: string;
  body: string;
  userInstructions: string;
}

export function generateSubjectPrompt(input: GenerateSubjectInput): ChatMessage[] {
  return [
    {
      role: "system",
      content: `${ANTI_INJECTION_INSTRUCTION}

You write concise, professional subject lines for formal Swiss letters.

${localeInstruction(input.locale)}

Rules:
- Return ONLY valid JSON in the shape {"subject":"..."}.
- Keep the subject clear, specific, and professional.
- Maximum 200 characters.
- Reflect the actual request or outcome of the letter.
- Use only facts that appear in the user's instructions or the drafted body.
- Do NOT invent dates, reference numbers, amounts, or legal citations.
- Do NOT wrap the subject in quotes.
- Do NOT add greetings, punctuation-heavy slogans, or commentary.`,
    },
    {
      role: "user",
      content: `Intent: ${input.intent}

User instructions:
${wrapUserContent(input.userInstructions)}

Drafted body:
${input.body}`,
    },
  ];
}

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
Return the updated subject and the COMPLETE revised letter body using the JSON contract below.

CURRENT LETTER BODY:
---
${input.currentBody}
---

${DOCUMENT_WITH_SUBJECT_RESPONSE_RULES}

Use facts ONLY from the existing letter and user instruction. Never invent new facts.`,
    },
    {
      role: "user",
      content: wrapUserContent(input.revisionInstruction),
    },
  ];
}
