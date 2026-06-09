/**
 * Azure AI Project agent adapter — optional execution path for AI calls.
 *
 * This keeps Episto on the locked Azure provider boundary while allowing
 * response generation through a configured Foundry/AI Project agent reference.
 */

import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import type OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { env } from "../../../shared/config/index.js";
import { AppError, providerOutageError } from "../../../shared/errors/index.js";
import { createLogger } from "../../../shared/logging/index.js";
import { withProviderRetries } from "./provider-retry.js";

let _projectClient: AIProjectClient | undefined;
let _openAiClient: OpenAI | undefined;
const logger = createLogger("azure-project-agent-adapter");

type ResponseMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function resolveConfiguredAgent() {
  const config = env();

  if (config.AZURE_EXISTING_AGENT_ID) {
    const [name, version] = config.AZURE_EXISTING_AGENT_ID.split(":");

    if (!name || !version) {
      throw new Error(
        "AZURE_EXISTING_AGENT_ID must use the format <agent-name>:<version>",
      );
    }

    return { name, version };
  }

  if (!config.AZURE_AI_AGENT_NAME || !config.AZURE_AI_AGENT_VERSION) {
    throw new Error(
      "AZURE_EXISTING_AGENT_ID or AZURE_AI_AGENT_NAME and AZURE_AI_AGENT_VERSION are required",
    );
  }

  return {
    name: config.AZURE_AI_AGENT_NAME,
    version: config.AZURE_AI_AGENT_VERSION,
  };
}

function getCredential(): DefaultAzureCredential {
  return new DefaultAzureCredential();
}

function getProjectClient(): AIProjectClient {
  if (_projectClient) return _projectClient;

  const config = env();
  if (!config.AZURE_AI_PROJECT_ENDPOINT) {
    throw new Error(
      "AZURE_AI_PROJECT_ENDPOINT is required for azure_ai_project_agent mode",
    );
  }

  _projectClient = new AIProjectClient(config.AZURE_AI_PROJECT_ENDPOINT, getCredential());
  return _projectClient;
}

function getOpenAIClient(): OpenAI {
  if (_openAiClient) return _openAiClient;
  _openAiClient = getProjectClient().getOpenAIClient();
  return _openAiClient;
}

function normalizeRole(message: ChatCompletionMessageParam): ResponseMessage["role"] {
  switch (message.role) {
    case "assistant":
      return "assistant";
    case "developer":
    case "system":
      return "system";
    case "user":
      return "user";
    default:
      return "user";
  }
}

function normalizeContent(message: ChatCompletionMessageParam): string {
  if (!("content" in message)) return "";

  const { content } = message;
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if ("text" in part && typeof part.text === "string") {
        return part.text;
      }

      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

function toResponseInput(messages: ChatCompletionMessageParam[]): ResponseMessage[] {
  return messages
    .map((message) => ({
      role: normalizeRole(message),
      content: normalizeContent(message).trim(),
    }))
    .filter((message) => message.content.length > 0);
}

export async function completeWithProjectAgent(
  messages: ChatCompletionMessageParam[],
): Promise<string> {
  const agent = resolveConfiguredAgent();
  const input = toResponseInput(messages);

  return withProviderRetries({
    provider: "Azure AI Project agent",
    operation: "agent response generation",
    logger,
    mapError: mapAzureProjectError,
    run: async () => {
      const client = getOpenAIClient();
      let conversationId: string | null = null;

      try {
        const conversation = await client.conversations.create({
          items: input.map((message) => ({
            type: "message",
            role: message.role,
            content: message.content,
          })),
        });
        conversationId = conversation.id;

        const response = await client.responses.create(
          {
            conversation: conversation.id,
          },
          {
            body: {
              agent: {
                name: agent.name,
                version: agent.version,
                type: "agent_reference",
              },
            },
          },
        );

        if (!response.output_text) {
          throw new Error("Empty response from Azure AI Project agent");
        }

        return response.output_text;
      } finally {
        if (conversationId) {
          try {
            await client.conversations.delete(conversationId);
          } catch (cleanupError) {
            logger.warn(
              {
                conversationId,
                error: cleanupError,
              },
              "Failed to delete Azure AI Project conversation after request",
            );
          }
        }
      }
    },
  });
}

function mapAzureProjectError(err: unknown): AppError | Error {
  if (err instanceof AppError) return err;

  const message = err instanceof Error ? err.message : "Unknown Azure AI Project error";

  if (
    message.includes("CredentialUnavailableError") ||
    message.includes("authentication")
  ) {
    return new AppError({
      family: "provider_outage",
      statusCode: 503,
      code: "AI_AUTH_UNAVAILABLE",
      message: `Azure AI Project authentication failed: ${message}`,
      userMessage: "The AI service is not authenticated correctly right now.",
      userAction: "Please try again later.",
    });
  }

  if (message.includes("401") || message.includes("403")) {
    return new AppError({
      family: "provider_outage",
      statusCode: 503,
      code: "AI_ACCESS_DENIED",
      message: `Azure AI Project access denied: ${message}`,
      userMessage: "The AI service could not access the configured Azure project.",
      userAction: "Please try again later.",
    });
  }

  if (message.includes("429") || message.includes("Rate limit")) {
    return new AppError({
      family: "provider_outage",
      statusCode: 503,
      code: "AI_RATE_LIMITED",
      message: `Azure AI Project rate limited: ${message}`,
      userMessage: "The AI service is temporarily busy. Please try again in a moment.",
      userAction: "Wait a few seconds and retry.",
    });
  }

  if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
    return new AppError({
      family: "provider_outage",
      statusCode: 504,
      code: "AI_TIMEOUT",
      message: `Azure AI Project timeout: ${message}`,
      userMessage: "The AI service took too long to respond.",
      userAction: "Please try again.",
    });
  }

  return providerOutageError("Azure AI Project agent", err);
}
