import { id } from '@instantdb/admin';
import { tool } from 'ai';
import { z } from 'zod';

export const generateId = tool({
  description: 'Generate a unique UUID for creating new records.',
  inputSchema: z.strictObject({}),
  execute: async () => id(),
});
