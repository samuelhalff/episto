/**
 * Azure OpenAI adapter — isolated provider integration.
 *
 * All Azure-specific SDK code lives here. No raw provider payloads
 * leave this adapter. Deployment names and model IDs are config-driven.
 */

import { AzureOpenAI } from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionChunk,
} from "openai/resources/chat/completions";
import { env } from "../../../shared/config/index.js";
import { AppError, providerOutageError } from "../../../shared/errors/index.js";

// ---------------------------------------------------------------------------
// Client singleton
// ---------------------------------------------------------------------------

let _client: AzureOpenAI | undefined;

function getClient(): AzureOpenAI {
  if (_client) return _client;
  const config = env();
  _client = new AzureOpenAI({
    endpoint: config.AZURE_OPENAI_ENDPOINT,
    apiKey: config.AZURE_OPENAI_API_KEY,
    apiVersion: config.AZURE_OPENAI_API_VERSION,
  });
  return _client;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatMessage = ChatCompletionMessageParam;

export interface CompletionOptions {
  model: "draft" | "classify";
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface StreamOptions extends CompletionOptions {
  /** Called for each token chunk. */
  onToken?: (token: string) => void;
}

// ---------------------------------------------------------------------------
// Non-streaming completion
// ---------------------------------------------------------------------------

export async function complete(opts: CompletionOptions): Promise<string> {
  const config = env();
  const model =
    opts.model === "draft" ? config.AI_DRAFT_MODEL : config.AI_CLASSIFY_MODEL;

  try {
    const response = await getClient().chat.completions.create({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Azure OpenAI");
    }
    return content;
  } catch (err) {
    throw mapAzureError(err);
  }
}

// ---------------------------------------------------------------------------
// Streaming completion (AsyncIterable)
// ---------------------------------------------------------------------------

export async function* streamComplete(
  opts: StreamOptions,
): AsyncIterable<string> {
  const config = env();
  const model =
    opts.model === "draft" ? config.AI_DRAFT_MODEL : config.AI_CLASSIFY_MODEL;

  try {
    const stream = await getClient().chat.completions.create({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = (chunk as ChatCompletionChunk).choices[0]?.delta?.content;
      if (delta) {
        opts.onToken?.(delta);
        yield delta;
      }
    }
  } catch (err) {
    throw mapAzureError(err);
  }
}

// ---------------------------------------------------------------------------
// Error mapping — provider errors → canonical AppError
// ---------------------------------------------------------------------------

function mapAzureError(err: unknown): AppError | Error {
  if (err instanceof AppError) return err;

  const message = err instanceof Error ? err.message : "Unknown Azure OpenAI error";

  // Rate limit
  if (message.includes("429") || message.includes("Rate limit")) {
    return new AppError({
      family: "provider_outage",
      statusCode: 503,
      code: "AI_RATE_LIMITED",
      message: `Azure OpenAI rate limited: ${message}`,
      userMessage: "The AI service is temporarily busy. Please try again in a moment.",
      userAction: "Wait a few seconds and retry.",
    });
  }

  // Content filter
  if (message.includes("content_filter") || message.includes("ContentFilter")) {
    return new AppError({
      family: "policy_refusal",
      statusCode: 422,
      code: "AI_CONTENT_FILTERED",
      message: `Content filtered by Azure: ${message}`,
      userMessage: "Your request could not be processed due to content policy.",
      userAction: "Please rephrase your request.",
    });
  }

  // Timeout
  if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
    return new AppError({
      family: "provider_outage",
      statusCode: 504,
      code: "AI_TIMEOUT",
      message: `Azure OpenAI timeout: ${message}`,
      userMessage: "The AI service took too long to respond.",
      userAction: "Please try again.",
    });
  }

  return providerOutageError("Azure OpenAI", err);
}
