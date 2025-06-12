import { z } from 'zod';

export const queryDataSchema = z.strictObject({
  query: z
    .string()
    .describe(
      'The query to run as a JSON object with no extra whitespace that can be parsed with JSON.parse()'
    ),
});
