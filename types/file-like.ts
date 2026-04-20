import { z } from 'zod/v4';

export type NativeFileLike = {
  name?: string;
  type: string;
  uri: string;
};

export type FileLike = File | NativeFileLike;

export const fileLike = z.union([
  z.instanceof(File),
  z.object({
    name: z.string().optional(),
    type: z.string(),
    uri: z.string(),
  }),
]);

declare global {
  interface FormData {
    append(name: string, value: FileLike, fileName?: string): void;
  }
}
