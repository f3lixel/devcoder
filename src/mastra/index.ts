import { Mastra } from '@mastra/core/mastra';
import { codingAgent } from './agent/coding-agent';

export const mastra = new Mastra({
  agents: { codingAgent },
});