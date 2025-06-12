import { createAIFunction } from '@agentic/core';
import { id } from '@instantdb/admin';
import { z } from 'zod';

export const generateId = createAIFunction({
  name: 'generateId',
  description: 'Generate a unique UUID for creating new records.',
  inputSchema: z.strictObject({}),
  execute: async () => id(),
});
