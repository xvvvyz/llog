import { visibleFileQuery } from '@/domain/files/query';
import { recordTagsQuery } from '@/domain/tags/query';

export const publishedContentWhere = { isDraft: { $not: true } } as const;

export const countFileQuery = { $: { fields: ['id' as const] } };

export const countLinkQuery = { $: { fields: ['id' as const] } };

export const countReactionQuery = {
  $: { fields: ['emoji' as const, 'id' as const] },
};

export const summaryProfileQuery = {
  $: { fields: ['id' as const, 'name' as const] },
};

export const recordListItemQuery = {
  author: { image: {} },
  files: visibleFileQuery,
  links: {},
  reactions: { author: {} },
  replies: { $: { fields: ['id' as const], where: publishedContentWhere } },
  tags: recordTagsQuery,
};

export const recordDetailQuery = {
  author: { image: {} },
  files: visibleFileQuery,
  links: {},
  log: {},
  reactions: { author: {} },
  replies: {
    $: { order: { date: 'asc' as const }, where: publishedContentWhere },
    author: { image: {} },
    files: visibleFileQuery,
    links: {},
    reactions: { author: {} },
  },
  tags: recordTagsQuery,
};

export const recordDraftQuery = {
  files: visibleFileQuery,
  links: {},
  log: { $: { fields: ['id' as const] } },
  tags: recordTagsQuery,
};

export const recordTagTargetQuery = {
  author: { $: { fields: ['id' as const] } },
  log: { $: { fields: ['color' as const, 'id' as const] } },
  tags: { $: { fields: ['id' as const] } },
};

export const replyDraftQuery = {
  files: visibleFileQuery,
  links: {},
  record: { $: { fields: ['id' as const] } },
};

export const recordSearchDocumentQuery = {
  author: { image: {} },
  files: visibleFileQuery,
  links: {},
  log: {},
  tags: recordTagsQuery,
};

export const replySearchDocumentQuery = {
  author: { image: {} },
  files: visibleFileQuery,
  links: {},
  record: { log: {}, tags: recordTagsQuery },
};

export const searchFileQuery = {
  $: {
    fields: [
      'id' as const,
      'name' as const,
      'tracks' as const,
      'transcript' as const,
      'type' as const,
    ],
  },
};

export const searchLinkQuery = {
  $: { fields: ['id' as const, 'label' as const, 'url' as const] },
};

export const recordSearchQuery = {
  files: searchFileQuery,
  links: searchLinkQuery,
  log: { $: { fields: ['id' as const, 'name' as const] } },
  reactions: countReactionQuery,
  replies: {
    $: {
      fields: [
        'date' as const,
        'id' as const,
        'isDraft' as const,
        'text' as const,
      ],
      order: { date: 'asc' as const },
      where: publishedContentWhere,
    },
    files: searchFileQuery,
    links: searchLinkQuery,
    reactions: countReactionQuery,
  },
  tags: recordTagsQuery,
};
