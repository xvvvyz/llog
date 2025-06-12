import { createAIFunction } from '@agentic/core';
import { z } from 'zod';

export const getCurrentTime = createAIFunction({
  name: 'getCurrentTime',
  description: 'Get the current time via toISOString().',
  inputSchema: z.strictObject({}),
  execute: async () => new Date().toISOString(),
});
