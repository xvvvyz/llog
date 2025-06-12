import { generateIdPrompt } from '@/agent/prompts/generate-id';
import { createAIFunction } from '@agentic/core';
import { id } from '@instantdb/admin';
import { z } from 'zod';

export const generateId = createAIFunction({
  name: 'generateId',
  description: generateIdPrompt,
  inputSchema: z.strictObject({}),
  execute: async () => id(),
});
