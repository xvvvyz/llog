import { queryDataPrompt } from '@/agents/team/prompts/query-data';
import { queryDataValidation } from '@/agents/team/validations/query-data';
import schema from '@/instant.schema';
import { Type } from '@google/genai';
import { init } from '@instantdb/admin';

export const tool = {
  name: 'queryData',
  description: queryDataPrompt,
  parameters: {
    type: Type.OBJECT,
    properties: { query: { type: Type.OBJECT } },
    required: ['query'],
  },
};

export const run = async (
  db: ReturnType<typeof init<typeof schema>>,
  query: unknown
) => db.query(queryDataValidation(query));
