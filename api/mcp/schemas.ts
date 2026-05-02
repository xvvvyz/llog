import { z } from 'zod/v4';

export const linkInputSchema = z.object({
  label: z.string().trim().min(1).max(120),
  url: z.string().url(),
});

export const contentStatusSchema = z.enum(['published', 'draft']).optional();

export const recordIncludeSchema = z.enum([
  'files',
  'links',
  'reactions',
  'replies',
]);

export const replyIncludeSchema = z.enum(['files', 'links', 'reactions']);
export const saveModeSchema = z.enum(['publish', 'draft']).optional();
