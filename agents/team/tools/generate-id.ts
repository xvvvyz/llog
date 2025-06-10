import { generateIdPrompt } from '@/agents/team/prompts/generate-id';
import { id as generateId } from '@instantdb/admin';

export const tool = {
  name: 'id',
  description: generateIdPrompt,
};

export const run = generateId;
