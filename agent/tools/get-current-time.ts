import { tool } from 'ai';
import { z } from 'zod';

export const getCurrentTime = tool({
  description: 'Get the current time via toISOString().',
  inputSchema: z.strictObject({}),
  execute: async () => new Date().toISOString(),
});
