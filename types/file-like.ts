import { z } from 'zod/v4';

export const fileLike = z.union([
  z.instanceof(File),
  z.object({ type: z.string(), uri: z.string() }),
]);
