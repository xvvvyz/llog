import * as mcpFields from '@/api/mcp/fields';
import type * as mcpTypes from '@/api/mcp/types';
import * as mediaMetadata from '@/domain/files/media-metadata';
import { normalizeSearchText, tagFiltersExcludeReplies } from '@/lib/search';
import type { ParsedSearchQuery } from '@/lib/search';

export type SearchResult =
  | { log: mcpTypes.McpLog; type: 'log' }
  | {
      matches?: mcpTypes.McpMediaSearchMatch[];
      record: ReturnType<typeof mcpFields.recordSummaryFields>;
      type: 'record';
    }
  | {
      matches?: mcpTypes.McpMediaSearchMatch[];
      record: {
        id: string;
        log?: mcpTypes.McpLog | null;
        tags?: mcpTypes.McpTag[];
        url?: string;
      };
      reply: ReturnType<typeof mcpFields.replySummaryFields>;
      type: 'reply';
    };

type ReplySearchRecord = Extract<SearchResult, { type: 'reply' }>['record'];
type FieldOptions = Parameters<typeof mcpFields.recordSummaryFields>[1];

const searchTagFields = (tag: { name: string; order?: number | null }) => ({
  name: tag.name,
  order: tag.order ?? undefined,
});

const searchLogFields = (
  log?: {
    id: string;
    name: string;
    tags?: { name: string; order?: number | null }[];
  } | null
) =>
  log
    ? { id: log.id, name: log.name, tags: log.tags?.map(searchTagFields) }
    : undefined;

const searchMediaMatchFields = ({
  fileId: _fileId,
  ...match
}: mcpTypes.McpMediaSearchMatch) => match;

const searchRecordFields = (
  record: ReturnType<typeof mcpFields.recordSummaryFields>
) => ({
  date: record.date,
  fileCount: record.fileCount,
  isPinned: record.isPinned,
  linkCount: record.linkCount,
  log: searchLogFields(record.log),
  reactionCount: record.reactionCount,
  replyCount: record.replyCount,
  tags: record.tags?.map(searchTagFields),
  text: record.text,
  url: record.url,
});

const searchRecordRefFields = (record: ReplySearchRecord) => ({
  log: searchLogFields(record.log),
  tags: record.tags?.map(searchTagFields),
  url: record.url,
});

const searchReplyFields = (
  reply: ReturnType<typeof mcpFields.replySummaryFields>
) => ({
  date: reply.date,
  fileCount: reply.fileCount,
  linkCount: reply.linkCount,
  reactionCount: reply.reactionCount,
  text: reply.text,
});

export const searchResultFields = (result: SearchResult) => {
  if (result.type === 'log') {
    return { log: searchLogFields(result.log), type: result.type };
  }

  const matches = result.matches?.map(searchMediaMatchFields);

  if (result.type === 'record') {
    return {
      matches,
      record: searchRecordFields(result.record),
      type: result.type,
    };
  }

  return {
    matches,
    record: searchRecordRefFields(result.record),
    reply: searchReplyFields(result.reply),
    type: result.type,
  };
};

type SearchCursor = { offset: number; skip: number };
const initialSearchCursor: SearchCursor = { offset: 0, skip: 0 };

const isNonNegativeInteger = (value: number) =>
  Number.isInteger(value) && value >= 0;

export const parseSearchCursor = (cursor?: string): SearchCursor => {
  if (!cursor) return initialSearchCursor;
  const trimmed = cursor.trim();
  const parts = trimmed.split(':');

  if (!trimmed || parts.length < 1 || parts.length > 2) {
    throw new Error('Invalid search cursor');
  }

  if (parts.some((part) => !part)) throw new Error('Invalid search cursor');
  const offset = Number(parts[0]);
  const skip = parts[1] == null ? 0 : Number(parts[1]);

  if (!isNonNegativeInteger(offset) || !isNonNegativeInteger(skip)) {
    throw new Error('Invalid search cursor');
  }

  return { offset, skip };
};

export const formatSearchCursor = ({ offset, skip }: SearchCursor) =>
  skip > 0 ? `${offset}:${skip}` : String(offset);

type FileMediaSearchItem = {
  file: mcpTypes.McpFile;
  item: mediaMetadata.MediaSearchItem;
};

const getFileMediaSearchItems = (
  files: mcpTypes.McpFile[] | undefined
): FileMediaSearchItem[] =>
  (files ?? []).flatMap((file) =>
    mediaMetadata.getMediaSearchItems(file).map((item) => ({ file, item }))
  );

const getFileMediaSearchText = (items: readonly FileMediaSearchItem[]) =>
  mediaMetadata.getMediaSearchText(items.map(({ item }) => item));

const searchHaystack = (values: (string | null | undefined)[]) =>
  normalizeSearchText(values.filter(Boolean).join(' '));

const includesNormalized = (value: string | undefined, query: string) => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeSearchText(value ?? '').includes(normalizedQuery);
};

const matchesEveryFilter = (
  filters: string[],
  values: (string | undefined)[]
) =>
  filters.every((filter) =>
    values.some((value) => includesNormalized(value, filter))
  );

const matchesTagFilters = (
  tags: { id: string; name?: string | null }[] | undefined,
  filters: string[]
) =>
  matchesEveryFilter(
    filters,
    (tags ?? []).flatMap((tag) => [tag.name ?? undefined, tag.id])
  );

const matchesLogFilters = (
  log: { id: string; name?: string | null } | undefined | null,
  filters: string[]
) => matchesEveryFilter(filters, [log?.name ?? undefined, log?.id]);

const matchesAuthorFilters = (
  author: { id?: string; name?: string | null } | undefined | null,
  filters: string[]
) => matchesEveryFilter(filters, [author?.name ?? undefined, author?.id]);

const matchesLogSearchFilters = (
  log: mcpTypes.McpLog,
  filters: ParsedSearchQuery['filters']
) =>
  filters.author.length === 0 &&
  matchesLogFilters(log, filters.log) &&
  matchesTagFilters(log.tags, filters.tag);

const matchesRecordSearchFilters = (
  record: mcpTypes.McpRecord,
  filters: ParsedSearchQuery['filters']
) =>
  matchesLogFilters(record.log, filters.log) &&
  matchesTagFilters(record.tags, filters.tag) &&
  matchesAuthorFilters(record.author, filters.author);

const matchesReplySearchFilters = (
  record: mcpTypes.McpRecord,
  reply: mcpTypes.McpReply,
  filters: ParsedSearchQuery['filters']
) =>
  matchesLogFilters(record.log, filters.log) &&
  matchesTagFilters(record.tags, filters.tag) &&
  matchesAuthorFilters(reply.author, filters.author);

const isRecordTagScopedSearch = ({
  filters,
  recordTagIdSet,
}: {
  filters: ParsedSearchQuery['filters'];
  recordTagIdSet?: ReadonlySet<string>;
}) => !!recordTagIdSet || tagFiltersExcludeReplies(filters);

const getFileMediaMatchesFromItems = (
  items: readonly FileMediaSearchItem[],
  query: string
): mcpTypes.McpMediaSearchMatch[] => {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return items
    .filter(({ item }) =>
      normalizeSearchText(item.text).includes(normalizedQuery)
    )
    .map(({ file, item }) => ({
      ...(item.endSeconds != null ? { endSeconds: item.endSeconds } : {}),
      fileId: file.id,
      ...(file.name ? { fileName: file.name } : {}),
      kind: item.kind,
      snippet: item.snippet,
      ...(item.startSeconds != null ? { startSeconds: item.startSeconds } : {}),
      ...(item.trackDurationSeconds != null
        ? { trackDurationSeconds: item.trackDurationSeconds }
        : {}),
    }));
};

export const getFileMediaMatches = (
  files: mcpTypes.McpFile[] | undefined,
  query: string
): mcpTypes.McpMediaSearchMatch[] =>
  getFileMediaMatchesFromItems(getFileMediaSearchItems(files), query);

const resultText = (result: SearchResult) => {
  if (result.type === 'log') return result.log.name;

  const text =
    result.type === 'record' ? result.record.text : result.reply.text;

  const mediaText = result.matches?.map((match) => match.snippet).join('; ');
  return [text, mediaText].filter(Boolean).join(' | ');
};

export const searchResultsTable = (results: SearchResult[]) =>
  mcpFields.table(
    ['Type', 'Where', 'Text/Name', 'Tags', 'URL/ID'],
    results.map((result) => {
      if (result.type === 'log') {
        return [
          'log',
          '',
          result.log.name,
          result.log.tags?.map((tag) => tag.name).join(', '),
          result.log.id,
        ];
      }

      if (result.type === 'record') {
        return [
          'record',
          result.record.log?.name,
          mcpFields.textPreview(resultText(result)),
          result.record.tags?.map((tag) => tag.name).join(', '),
          result.record.url,
        ];
      }

      return [
        'reply',
        result.record.log?.name,
        mcpFields.textPreview(resultText(result)),
        result.record.tags?.map((tag) => tag.name).join(', '),
        result.record.url,
      ];
    })
  );

export const getLogSearchResult = ({
  log,
  parsedQuery,
  query,
}: {
  log: mcpTypes.McpLog;
  parsedQuery: ParsedSearchQuery;
  query: string;
}): SearchResult | undefined => {
  const haystack = searchHaystack([
    log.name,
    ...(log.tags ?? []).map((tag) => tag.name),
  ]);

  if (
    matchesLogSearchFilters(log, parsedQuery.filters) &&
    haystack.includes(query)
  ) {
    return { log, type: 'log' };
  }

  return undefined;
};

export const getRecordSearchResults = ({
  fieldOptions,
  parsedQuery,
  query,
  record,
  recordTagIdSet,
}: {
  fieldOptions?: FieldOptions;
  parsedQuery: ParsedSearchQuery;
  query: string;
  record: mcpTypes.McpRecord;
  recordTagIdSet?: ReadonlySet<string>;
}): SearchResult[] => {
  if (!record.log?.id) return [];

  const recordTagScopedSearch = isRecordTagScopedSearch({
    filters: parsedQuery.filters,
    recordTagIdSet,
  });

  const hasSelectedRecordTag =
    !recordTagIdSet || record.tags?.some((tag) => recordTagIdSet.has(tag.id));

  const recordMediaItems = getFileMediaSearchItems(record.files);

  const recordHaystack = searchHaystack([
    record.text,
    record.log?.name,
    ...(record.tags ?? []).map((tag) => tag.name),
    ...(record.links ?? []).map((link) => link.label),
    ...(record.links ?? []).map((link) => link.url),
    ...(record.files ?? []).map((file) => file.name),
    getFileMediaSearchText(recordMediaItems),
  ]);

  const recordMediaMatches = getFileMediaMatchesFromItems(
    recordMediaItems,
    query
  );

  const results: SearchResult[] = [];

  if (
    hasSelectedRecordTag &&
    matchesRecordSearchFilters(record, parsedQuery.filters) &&
    recordHaystack.includes(query)
  ) {
    results.push({
      ...(recordMediaMatches.length ? { matches: recordMediaMatches } : {}),
      record: mcpFields.recordSummaryFields(record, fieldOptions),
      type: 'record',
    });
  }

  if (recordTagScopedSearch) return results;

  for (const reply of record.replies ?? []) {
    const replyMediaItems = getFileMediaSearchItems(reply.files);

    const replyHaystack = searchHaystack([
      reply.text,
      record.log?.name,
      ...(record.tags ?? []).map((tag) => tag.name),
      ...(reply.links ?? []).map((link) => link.label),
      ...(reply.links ?? []).map((link) => link.url),
      ...(reply.files ?? []).map((file) => file.name),
      getFileMediaSearchText(replyMediaItems),
    ]);

    const replyMediaMatches = getFileMediaMatchesFromItems(
      replyMediaItems,
      query
    );

    if (
      hasSelectedRecordTag &&
      matchesReplySearchFilters(record, reply, parsedQuery.filters) &&
      replyHaystack.includes(query)
    ) {
      results.push({
        ...(replyMediaMatches.length ? { matches: replyMediaMatches } : {}),
        record: mcpFields.recordRefFields(record, fieldOptions),
        reply: mcpFields.replySummaryFields(reply, fieldOptions),
        type: 'reply',
      });
    }
  }

  return results;
};
