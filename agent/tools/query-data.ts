import { queryDataPrompt } from '@/agent/prompts/query-data';
import { queryDataSchema } from '@/agent/schemas/query-data';
import schema from '@/instant.schema';
import { init, InstantAPIError } from '@instantdb/admin';
import { tool } from 'ai';
import { z } from 'zod';

export const queryData = (db: ReturnType<typeof init<typeof schema>>) =>
  tool({
    description: queryDataPrompt,
    inputSchema: queryDataSchema,
    execute: async ({ query }: z.infer<typeof queryDataSchema>) => {
      try {
        return await db.query(JSON.parse(query));
      } catch (error) {
        if (error instanceof InstantAPIError) return error.body;
        if (error instanceof Error) return error.message;
      }
    },
  });
