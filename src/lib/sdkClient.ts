import { streamText, type CoreMessage, convertToCoreMessages, generateText } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Shared OpenRouter provider instance
export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export type StreamOptions = {
  modelName: string;
  prompt?: string;
  messages?: CoreMessage[];
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
};

export function streamChatText(options: StreamOptions) {
  const { modelName, prompt, messages, signal, temperature = 0.7, maxTokens } = options;
  const streamOptions: any = {
    model: openrouter(modelName),
    temperature,
    ...(maxTokens ? { maxTokens } : {}),
    abortSignal: signal,
  };

  if (messages) {
    streamOptions.messages = messages;
  } else if (prompt) {
    streamOptions.prompt = prompt;
  }

  return streamText(streamOptions);
}

export async function generateNonStreamingText(options: StreamOptions) {
  const { modelName, prompt, messages, temperature = 0.7, maxTokens } = options;
  const generateOptions: any = {
    model: openrouter(modelName),
    temperature,
    ...(maxTokens ? { maxTokens } : {}),
  };

  if (messages) {
    generateOptions.messages = messages;
  } else if (prompt) {
    generateOptions.prompt = prompt;
  }

  const res = await generateText(generateOptions);
  return res;
}

export function toCoreMessages(rawMessages: any[]): CoreMessage[] {
  return convertToCoreMessages(rawMessages);
}


