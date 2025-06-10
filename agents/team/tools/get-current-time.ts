import { getCurrentTimePrompt } from '@/agents/team/prompts/get-current-time';

export const tool = {
  name: 'now',
  description: getCurrentTimePrompt,
};

export const run = () => new Date().toISOString();
