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

const dateOutputSchema = z.union([z.string(), z.number()]);

export const tagOutputSchema = z.object({
  id: z.string(),
  logs: z.array(z.object({ id: z.string(), name: z.string() })).optional(),
  name: z.string(),
  order: z.number().optional(),
  teamId: z.string().optional(),
  type: z.string().optional(),
});

const profileOutputSchema = z.object({ id: z.string(), name: z.string() });

const teamOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().optional(),
});

const logOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(tagOutputSchema).optional(),
  team: z.object({ id: z.string(), name: z.string() }).optional(),
  teamId: z.string().optional(),
});

const templateOutputSchema = z.object({
  id: z.string(),
  log: logOutputSchema.optional(),
  tags: z.array(tagOutputSchema).optional(),
  teamId: z.string().optional(),
  text: z.string(),
});

const fileOutputSchema = z.object({
  assetKey: z.string().optional(),
  duration: z.number().optional(),
  id: z.string(),
  mimeType: z.string().optional(),
  name: z.string().optional(),
  size: z.number().optional(),
  thumbnailUri: z.string().optional(),
  trackCount: z.number().optional(),
  tracks: z.array(z.unknown()).optional(),
  transcript: z.array(z.unknown()).optional(),
  transcriptSegmentCount: z.number().optional(),
  type: z.string(),
  uri: z.string().optional(),
  url: z.string().optional(),
});

const linkOutputSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number().optional(),
  url: z.string(),
});

const reactionCountOutputSchema = z.object({
  count: z.number(),
  emoji: z.string(),
});

const recordRefOutputSchema = z.object({
  id: z.string(),
  log: logOutputSchema.optional(),
  tags: z.array(tagOutputSchema).optional(),
  url: z.string().url().optional(),
});

const replySummaryOutputSchema = z.object({
  date: dateOutputSchema.optional(),
  fileCount: z.number().optional(),
  id: z.string(),
  isDraft: z.boolean().optional(),
  linkCount: z.number().optional(),
  reactionCount: z.number().optional(),
  record: recordRefOutputSchema.optional(),
  text: z.string().optional(),
});

const replyOutputSchema = replySummaryOutputSchema.extend({
  author: profileOutputSchema.optional(),
  files: z.array(fileOutputSchema).optional(),
  links: z.array(linkOutputSchema).optional(),
  reactionCounts: z.array(reactionCountOutputSchema).optional(),
});

const recordSummaryOutputSchema = z.object({
  date: dateOutputSchema.optional(),
  fileCount: z.number().optional(),
  id: z.string(),
  isDraft: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  linkCount: z.number().optional(),
  log: logOutputSchema.optional(),
  reactionCount: z.number().optional(),
  replyCount: z.number().optional(),
  tags: z.array(tagOutputSchema).optional(),
  text: z.string().optional(),
  url: z.string().url().optional(),
});

const recordOutputSchema = recordSummaryOutputSchema.extend({
  author: profileOutputSchema.optional(),
  files: z.array(fileOutputSchema).optional(),
  links: z.array(linkOutputSchema).optional(),
  reactionCounts: z.array(reactionCountOutputSchema).optional(),
  replies: z
    .array(z.union([replySummaryOutputSchema, replyOutputSchema]))
    .optional(),
  teamId: z.string().optional(),
});

const statusOutputSchema = z.enum(['published', 'draft']);

export const accountOutputSchema = {
  email: z.string().optional(),
  profile: profileOutputSchema.optional(),
  teams: z.array(teamOutputSchema).optional(),
  userId: z.string(),
};

export const logsOutputSchema = {
  logs: z.array(logOutputSchema).optional(),
  results: z
    .array(
      z.object({
        log: logOutputSchema.optional(),
        records: z.array(recordSummaryOutputSchema).optional(),
      })
    )
    .optional(),
};

export const templatesOutputSchema = {
  results: z
    .array(
      z.object({
        deleted: z.boolean().optional(),
        template: templateOutputSchema.optional(),
        templateId: z.string().optional(),
        templates: z.array(templateOutputSchema).optional(),
      })
    )
    .optional(),
};

export const recordsOutputSchema = {
  results: z
    .array(
      z.object({
        record: recordOutputSchema.optional(),
        recordId: z.string().optional(),
        records: z.array(recordSummaryOutputSchema).optional(),
        status: statusOutputSchema.optional(),
      })
    )
    .optional(),
};

export const repliesOutputSchema = {
  results: z
    .array(
      z.object({
        reply: replyOutputSchema.optional(),
        replyId: z.string().optional(),
        status: statusOutputSchema.optional(),
      })
    )
    .optional(),
};

export const recordTagsOutputSchema = {
  results: z
    .array(
      z.object({
        created: z.boolean().optional(),
        recordId: z.string().optional(),
        selected: z.boolean().optional(),
        tag: tagOutputSchema.optional(),
        tags: z.array(tagOutputSchema).optional(),
      })
    )
    .optional(),
};

export const recordActionsOutputSchema = {
  results: z
    .array(
      z.object({
        pinned: z.boolean().optional(),
        reactionId: z.string().optional(),
        removed: z.boolean().optional(),
      })
    )
    .optional(),
};

const mediaSearchMatchOutputSchema = z.object({
  endSeconds: z.number().optional(),
  fileName: z.string().optional(),
  kind: z.enum(['track', 'transcript']),
  snippet: z.string(),
  startSeconds: z.number().optional(),
  trackDurationSeconds: z.number().optional(),
});

const searchTagOutputSchema = z.object({
  name: z.string(),
  order: z.number().optional(),
});

const searchLogOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  tags: z.array(searchTagOutputSchema).optional(),
});

const searchRecordRefOutputSchema = z.object({
  log: searchLogOutputSchema.optional(),
  tags: z.array(searchTagOutputSchema).optional(),
  url: z.string().url().optional(),
});

const searchRecordSummaryOutputSchema = z.object({
  date: dateOutputSchema.optional(),
  fileCount: z.number().optional(),
  isPinned: z.boolean().optional(),
  linkCount: z.number().optional(),
  log: searchLogOutputSchema.optional(),
  reactionCount: z.number().optional(),
  replyCount: z.number().optional(),
  tags: z.array(searchTagOutputSchema).optional(),
  text: z.string().optional(),
  url: z.string().url().optional(),
});

const searchReplySummaryOutputSchema = z.object({
  date: dateOutputSchema.optional(),
  fileCount: z.number().optional(),
  linkCount: z.number().optional(),
  reactionCount: z.number().optional(),
  text: z.string().optional(),
});

const searchResultOutputSchema = z.discriminatedUnion('type', [
  z.object({ log: searchLogOutputSchema, type: z.literal('log') }),
  z.object({
    matches: z.array(mediaSearchMatchOutputSchema).optional(),
    record: searchRecordSummaryOutputSchema,
    type: z.literal('record'),
  }),
  z.object({
    matches: z.array(mediaSearchMatchOutputSchema).optional(),
    record: searchRecordRefOutputSchema,
    reply: searchReplySummaryOutputSchema,
    type: z.literal('reply'),
  }),
]);

const searchPaginationOutputSchema = z.object({
  cursor: z.string().optional(),
  more: z.boolean(),
  nextCursor: z.string().optional(),
  scanned: z.number(),
  scanLimit: z.number(),
});

const searchItemOutputSchema = z.object({
  pagination: searchPaginationOutputSchema.optional(),
  results: z.array(searchResultOutputSchema).optional(),
});

export const searchOutputSchema = {
  searches: z.array(searchItemOutputSchema).optional(),
};
