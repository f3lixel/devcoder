import { Mastra } from '@mastra/core/mastra';
import { codingAgent } from './agent/coding-agent';
import { aiChatWorkflow } from './workflows/ai-chat';

export const mastra = new Mastra({
  agents: { codingAgent },
  workflows: { aiChatWorkflow },
});