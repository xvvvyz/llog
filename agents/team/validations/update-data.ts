import schema from '@/instant.schema';
import { z } from 'zod';

export const updateDataValidation = (transactions: unknown) => {
  const transactionSchema = z
    .object({
      action: z.enum(['update', 'merge', 'delete', 'link', 'unlink']),
      data: z.record(z.unknown()).optional(),
      id: z.string(),
      links: z.record(z.string()).optional(),
      namespace: z.enum(Object.keys(schema.entities) as [string, ...string[]]),
    })
    .strict();

  const rootSchema = z.array(transactionSchema);
  return rootSchema.parse(transactions);
};
