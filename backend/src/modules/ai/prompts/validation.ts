import type { ChatMessage } from "../adapters/azure-openai.js";

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
