import { getCurrentTimePrompt } from '@/agent/prompts/get-current-time';
import { createAIFunction } from '@agentic/core';
import { z } from 'zod';

export const getCurrentTime = createAIFunction({
  name: 'getCurrentTime',
  description: getCurrentTimePrompt,
  inputSchema: z.strictObject({}),
  execute: async () => new Date().toISOString(),
});
