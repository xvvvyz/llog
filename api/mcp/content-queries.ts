import * as mcpSchemas from '@/api/mcp/schemas';
import { visibleFileQuery } from '@/domain/files/query';
import * as recordQueries from '@/domain/records/query';
import { recordTagsQuery } from '@/domain/tags/query';
import type { z } from 'zod/v4';

export type RecordInclude = z.infer<typeof mcpSchemas.recordIncludeSchema>;

export type ReplyInclude = z.infer<typeof mcpSchemas.replyIncludeSchema>;

export const recordReadQuery = {
  author: { image: {}, user: {} },
  files: visibleFileQuery,
  links: {},
  log: { team: { $: { fields: ['id' as const] } } },
  reactions: { author: {} },
  tags: recordTagsQuery,
  replies: {
    $: {
      order: { date: 'asc' as const },
      where: recordQueries.publishedReplyWhere,
    },
    author: { image: {} },
    files: visibleFileQuery,
    links: {},
    reactions: { author: {} },
  },
};

export const recordSummaryQuery = {
  files: recordQueries.countFileQuery,
  links: recordQueries.countLinkQuery,
  log: { $: { fields: ['id' as const, 'name' as const] } },
  reactions: recordQueries.countReactionQuery,
  replies: {
    $: {
      fields: ['id' as const, 'isDraft' as const],
      where: recordQueries.publishedReplyWhere,
    },
  },
  tags: recordTagsQuery,
};

export const recordPublishQuery = {
  ...recordReadQuery,
  log: { $: { fields: ['id' as const, 'name' as const, 'teamId' as const] } },
};

export const recordDetailQuery = ({
  include,
  replyLimit,
}: {
  include: Set<RecordInclude>;
  replyLimit: number;
}) => {
  const includeFiles = include.has('files');
  const includeLinks = include.has('links');

  return {
    author: recordQueries.summaryProfileQuery,
    files: includeFiles ? visibleFileQuery : recordQueries.countFileQuery,
    links: includeLinks ? {} : recordQueries.countLinkQuery,
    log: { $: { fields: ['id' as const, 'name' as const] } },
    reactions: recordQueries.countReactionQuery,
    replies: {
      $: {
        fields: [
          'date' as const,
          'id' as const,
          'isDraft' as const,
          'text' as const,
        ],
        limit: replyLimit,
        order: { date: 'asc' as const },
        where: recordQueries.publishedReplyWhere,
      },
      author: recordQueries.summaryProfileQuery,
      files: includeFiles ? visibleFileQuery : recordQueries.countFileQuery,
      links: includeLinks ? {} : recordQueries.countLinkQuery,
      reactions: recordQueries.countReactionQuery,
    },
    tags: recordTagsQuery,
  };
};

export const replyDraftReadQuery = {
  author: { image: {}, user: {} },
  files: visibleFileQuery,
  links: {},
  record: {
    $: { fields: ['id' as const, 'teamId' as const] },
    log: { team: { $: { fields: ['id' as const] } } },
    tags: recordTagsQuery,
  },
};

export const replyReadQuery = {
  author: { image: {}, user: {} },
  files: visibleFileQuery,
  links: {},
  reactions: { author: {} },
  record: {
    $: { fields: ['id' as const, 'teamId' as const] },
    log: { $: { fields: ['id' as const, 'name' as const] } },
    tags: recordTagsQuery,
  },
};

export const replyDetailQuery = ({
  include,
}: {
  include: Set<ReplyInclude>;
}) => ({
  author: recordQueries.summaryProfileQuery,
  files: include.has('files') ? visibleFileQuery : recordQueries.countFileQuery,
  links: include.has('links') ? {} : recordQueries.countLinkQuery,
  reactions: recordQueries.countReactionQuery,
  record: {
    $: { fields: ['id' as const, 'teamId' as const] },
    log: { $: { fields: ['id' as const, 'name' as const] } },
    tags: recordTagsQuery,
  },
});

export const replyPublishQuery = {
  author: { image: {}, user: {} },
  files: visibleFileQuery,
  links: {},
  record: {
    $: { fields: ['id' as const, 'teamId' as const] },
    log: { $: { fields: ['id' as const, 'name' as const] } },
    tags: recordTagsQuery,
  },
};

export const replyTargetRecordQuery = {
  author: recordQueries.summaryProfileQuery,
  files: recordQueries.countFileQuery,
  links: recordQueries.countLinkQuery,
  log: { $: { fields: ['id' as const, 'name' as const] } },
  reactions: recordQueries.countReactionQuery,
  tags: recordTagsQuery,
};
