import { z } from 'zod';

export const updateDataSchema = z.strictObject({
  transactions: z
    .string()
    .describe(
      'The transactions to execute as a JSON array with no extra whitespace that can be parsed with JSON.parse()'
    ),
});
