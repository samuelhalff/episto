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

export const PROMPT_VERSION = "2.0.0";

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

const DOCUMENT_RESPONSE_RULES = `Return a strict JSON object that follows this exact contract:
{
  "mode": "plain_text" | "structured_edit",
  "version": "1.0",
  "summary": "optional short explanation",
  "plainText": {
    "text": "full plain-text content"
  },
  "structuredEdit": {
    "target": {
      "scope": "selection"
    },
    "operations": [
      {
        "type": "replace_with_blocks",
        "blocks": [
          {
            "type": "paragraph",
            "text": "optional paragraph text",
            "style": "Normal | Heading 1 | Heading 2 | Heading 3",
            "alignment": "left | center | right | justify",
            "spans": [
              {
                "start": 0,
                "end": 5,
                "bold": true,
                "italic": false,
                "underline": false
              }
            ]
          },
          {
            "type": "list",
            "listType": "bulleted | numbered",
            "restartNumbering": false,
            "items": [
              {
                "text": "item text without bullet or number prefix",
                "level": 1
              }
            ]
          },
          {
            "type": "table",
            "headers": ["Column A", "Column B"],
            "rows": [["Cell A1", "Cell B1"]]
          }
        ]
      }
    ]
  }
}

Important rules:
- Output JSON only. No markdown fences. No explanatory prose outside the JSON.
- Do not use markdown headings, markdown bullets, markdown numbering, or pipe tables as a substitute for structure.
- Text like "1. Title" is plain text unless you encode it as a structured list or heading block.
- Text like "## Heading" is plain text unless you encode it as a paragraph block with a heading style.
- Text like "A | B" is plain text unless you encode it as a table block.
- Prefer "structured_edit" whenever the output contains headings, multiple paragraphs, lists, tables, or inline emphasis.
- Use "plain_text" only when the entire result should be inserted as raw text with no structural formatting.
- When returning list items, remove literal bullet or numbering prefixes from item text unless the prefix itself must remain visible.
- For emphasis inside a paragraph, keep the clean paragraph text in "text" and express bold/italic/underline with spans.
- If you cannot comply safely, return a plain_text response instead of malformed JSON.`;

const DOCUMENT_WITH_SUBJECT_RESPONSE_RULES = `Return a strict JSON object that follows this exact contract:
{
  "subject": "clear professional subject line, max 200 chars, or null",
  "document": {
    "mode": "plain_text" | "structured_edit",
    "version": "1.0",
    "summary": "optional short explanation",
    "plainText": {
      "text": "full plain-text content"
    },
    "structuredEdit": {
      "target": {
        "scope": "selection"
      },
      "operations": [
        {
          "type": "replace_with_blocks",
          "blocks": [
            {
              "type": "paragraph",
              "text": "optional paragraph text",
              "style": "Normal | Heading 1 | Heading 2 | Heading 3",
              "alignment": "left | center | right | justify"
            }
          ]
        }
      ]
    }
  }
}

Subject rules:
- Keep the subject clear, specific, and professional.
- Maximum 200 characters.
- Reflect the real request or outcome of the letter.
- Use only facts that appear in the user instructions, conversation history, or current letter body.
- Do NOT invent dates, reference numbers, amounts, or legal citations.
- Do NOT wrap the subject in quotes.

Document rules:
${DOCUMENT_RESPONSE_RULES}`;

// ---------------------------------------------------------------------------
// Combined intake analysis
// ---------------------------------------------------------------------------

export interface AnalyzeIntakeInput {
  userMessage: string;
  existingFields: Record<string, unknown>;
  locale: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export function analyzeIntakePrompt(input: AnalyzeIntakeInput): ChatMessage[] {
  const recentConversation = (input.conversationHistory ?? [])
    .filter((message) => typeof message.content === "string" && message.content.trim().length > 0)
    .slice(-8)
    .map((message) => `${message.role}: ${message.content.trim()}`)
    .join("\n");

  return [
    {
      role: "system",
      content: `You are a Swiss Mail intake analysis engine. In ONE pass, do all of the following:
- classify the user's intent
- assess whether the content is blocked
- extract any concrete draft fields that were explicitly provided
- decide whether the minimum intake bar is met
- ask the single best next question when more context would help

Return ONLY valid JSON with this exact shape:
{
  "intent": "complaint" | "cancellation" | "demand" | "inquiry" | "notice" | "general" | "blocked",
  "risk": "low" | "medium" | "high",
  "summary": "brief one-line summary",
  "fields": {
    "subject": "optional string",
    "tone": "formal | neutral | firm",
    "recipientFirstName": "optional string",
    "recipientLastName": "optional string",
    "recipientCompany": "optional string",
    "recipientAddressLine1": "optional string",
    "recipientPostalCode": "optional string",
    "recipientCity": "optional string",
    "senderFirstName": "optional string",
    "senderLastName": "optional string",
    "senderAddressLine1": "optional string",
    "senderPostalCode": "optional string",
    "senderCity": "optional string",
    "enclosureNote": "optional string",
    "deliveryType": "standard | registered"
  },
  "ready": true | false,
  "question": "optional single follow-up question",
  "message": "optional status message"
}

Rules:
- If the content contains threats, extortion, fraud, impersonation, hate speech, or other clearly harmful content, set intent to "blocked", risk to "high", and leave fields empty.
- Extract only values the user explicitly provided. Never invent values.
- If the user names a company, brand, insurer, telecom provider, landlord company, employer, bank, or other organization as the party they want to contact, terminate with, complain to, or request action from, extract it as recipientCompany.
- Prefer recipientCompany over recipientFirstName/recipientLastName when the message clearly points to an organization such as Swisscom.
- The intake step is for gathering context, not for drafting the letter body yet.
- Treat "ready" as "the user has given enough context to move on without getting stuck", not "write the letter now."
- Do NOT treat sender or recipient postal addresses as required to draft the letter body.
- If a company recipient is already identified by name, do NOT ask for its full address in chat. The structured recipient step will confirm the mailing address later.
- Prefer missing facts that materially affect the letter body itself, such as the request, dates, reference numbers, amount in dispute, or the specific action the recipient should take.
- Do NOT block a first draft on optional identifiers such as contract numbers, customer numbers, account numbers, or generic reference numbers unless the user already mentioned one, the letter is specifically about a disputed invoice/payment, or the draft would be ambiguous without it.
- If the current draft fields already answer something that was asked earlier in the conversation, treat that question as resolved and do NOT ask it again.
- The minimum ready bar is:
  1. who the letter is for
  2. what kind of letter this is
  3. a meaningful description of what happened or what the user wants
- If the minimum ready bar is already met but one more useful detail would improve the later draft, keep asking that question and set "ready" to true.
- If the minimum ready bar is already met and no further question is worth asking right now, set "ready" to true and use "message" instead of "question".
- ${localeInstruction(input.locale)}

Current fields: ${JSON.stringify(input.existingFields)}
Recent conversation:
${recentConversation || "(none)"}`,
    },
    {
      role: "user",
      content: input.userMessage,
    },
  ];
}

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
  conversationHistory?: Array<{ role: string; content: string }>;
}

export function extractFieldsPrompt(input: ExtractFieldsInput): ChatMessage[] {
  const recentConversation = (input.conversationHistory ?? [])
    .filter((message) => typeof message.content === "string" && message.content.trim().length > 0)
    .slice(-8)
    .map((message) => `${message.role}: ${message.content.trim()}`)
    .join("\n");

  return [
    {
      role: "system",
      content: `You are a field extraction engine. Given the user's latest message, the recent conversation, and existing draft fields, extract any new or updated values for the following letter fields:

- subject (string, max 200 chars)
- tone ("formal", "neutral", "firm")
- recipientFirstName, recipientLastName, recipientCompany
- recipientAddressLine1, recipientPostalCode, recipientCity
- senderFirstName, senderLastName
- senderAddressLine1, senderPostalCode, senderCity
- enclosureNote (e.g., "Beilage: Kopie Mietvertrag")
- deliveryType ("standard" or "registered")

Return ONLY a JSON object with the fields that were found or updated. Omit fields that are not mentioned. Do NOT invent values — only extract what the user explicitly provides.

If the user names a company, brand, insurer, telecom provider, landlord company, employer, bank, or other organization as the party they want to contact, terminate with, complain to, or request action from, extract it as recipientCompany even if they did not explicitly say "recipient".
Prefer recipientCompany over recipientFirstName/recipientLastName when the message clearly points to an organization such as Swisscom.

Current fields: ${JSON.stringify(input.existingFields)}`,
    },
    {
      role: "user",
      content: `Recent conversation:
${recentConversation || "(none)"}

Latest user message:
${input.userMessage}`,
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
  conversationHistory?: Array<{ role: string; content: string }>;
}

export function askFollowUpPrompt(input: AskFollowUpInput): ChatMessage[] {
  const recentConversation = (input.conversationHistory ?? [])
    .filter((message) => typeof message.content === "string" && message.content.trim().length > 0)
    .slice(-8)
    .map((message) => `${message.role}: ${message.content.trim()}`)
    .join("\n");

  return [
    {
      role: "system",
      content: `You are a letter drafting assistant helping a user prepare a formal Swiss letter.

The user's intent is: "${input.intent}"
Current draft fields: ${JSON.stringify(input.existingFields)}
Recent conversation:
${recentConversation || "(none)"}

Identify the SINGLE most important missing piece of information needed to draft this letter.
Ask ONE clear, specific question to obtain it.
The intake step is for gathering context, not for drafting the letter body yet.
Treat "ready" as "the user has given enough context to move on without getting stuck", not "write the letter now."
Do NOT treat sender or recipient postal addresses as required to draft the letter body.
If a company recipient is already identified by name, do NOT ask for its full address in chat. The structured recipient step will confirm the mailing address later.
Prefer missing facts that materially affect the letter body itself, such as the request, dates, reference numbers, amount in dispute, or the specific action the recipient should take.
Do NOT block a first draft on optional identifiers such as contract numbers, customer numbers, account numbers, or generic reference numbers unless the user already mentioned one, the letter is specifically about a disputed invoice/payment, or the draft would be ambiguous without it.
If the current draft fields already answer something that was asked earlier in the conversation, treat that question as resolved and do NOT ask it again.
${localeInstruction(input.locale)}

The minimum ready bar for intake is:
- who the letter is for
- what kind of letter this is
- a meaningful description of what happened or what the user wants

If the minimum ready bar is already met but one more useful detail would improve the later draft, keep asking that question and set "ready" to true.
Never draft the letter body or preview in this step.

If the minimum ready bar is already met and there is still a useful next question, respond with:
{"ready": true, "question": "your question here"}

If the minimum ready bar is already met and no further question is worth asking right now, respond with:
{"ready": true, "message": "I have enough to start structuring this. You can keep adding details here, or move on when you're ready."}

If the minimum ready bar is not met yet, respond with:
{"ready": false, "question": "your question here"}

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
Do NOT include a salutation, a complimentary close, a signature line, or a gratitude sign-off such as "Thank you for your attention" or "Yours faithfully".
End with the final substantive sentence of the letter body, not with a sign-off formula.
Return both the subject and the body using the JSON contract below.

${DOCUMENT_WITH_SUBJECT_RESPONSE_RULES}

Use facts ONLY from the user's input. Never invent dates, reference numbers, amounts, or legal citations.`,
    },
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
// 4b. generate-subject
// ---------------------------------------------------------------------------

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
      content: `You write concise, professional subject lines for formal Swiss letters.

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
${input.userInstructions}

Drafted body:
${input.body}`,
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
