import { queryDataPrompt } from '@/agent/prompts/query-data';
import { queryDataSchema } from '@/agent/schemas/query-data';
import schema from '@/instant.schema';
import { createAIFunction } from '@agentic/core';
import { init, InstantAPIError } from '@instantdb/admin';

export const queryData = (db: ReturnType<typeof init<typeof schema>>) =>
  createAIFunction({
    name: 'queryData',
    description: queryDataPrompt,
    inputSchema: queryDataSchema,
    execute: async ({ query }) => {
      try {
        return await db.query(JSON.parse(query));
      } catch (error) {
        if (error instanceof InstantAPIError) return error.body;
        if (error instanceof Error) return error.message;
      }
    },
  });
