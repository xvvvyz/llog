import * as mcpFields from '@/api/mcp/fields';
import { recordSearchQuery } from '@/api/mcp/records';
import { registerMcpTool } from '@/api/mcp/register-tool';
import * as mcpSchemas from '@/api/mcp/schemas';
import type * as mcpTypes from '@/api/mcp/types';
import { getViewer } from '@/api/mcp/viewer';
import * as mediaMetadata from '@/domain/files/media-metadata';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

type SearchResult =
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
      };
      reply: ReturnType<typeof mcpFields.replySummaryFields>;
      type: 'reply';
    };

const SEARCH_RECORD_SCAN_LIMIT = 500;
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

const formatSearchCursor = ({ offset, skip }: SearchCursor) =>
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

const getFileMediaMatchesFromItems = (
  items: readonly FileMediaSearchItem[],
  query: string
): mcpTypes.McpMediaSearchMatch[] =>
  items
    .filter(({ item }) => item.text.toLowerCase().includes(query))
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

const searchResultsTable = (results: SearchResult[]) =>
  mcpFields.table(
    ['Type', 'Where', 'Text/Name', 'Tags', 'ID'],
    results.map((result) => {
      if (result.type === 'log') {
        return [
          'log',
          result.log.teamId,
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
          result.record.id,
        ];
      }

      return [
        'reply',
        result.record.id,
        mcpFields.textPreview(resultText(result)),
        result.record.tags?.map((tag) => tag.name).join(', '),
        result.reply.id,
      ];
    })
  );

export const registerSearchTool = (
  server: McpServer,
  ctx: mcpTypes.McpContext
) => {
  const fieldOptions = { appUrl: ctx.env.APP_URL };

  registerMcpTool(
    server,
    'search',
    {
      description: 'Search logs, records, and replies.',
      inputSchema: {
        cursor: z.string().trim().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        query: z.string().trim().min(1),
        recordTagIds: z.array(z.string().min(1)).max(20).optional(),
      },
      outputSchema: mcpSchemas.searchOutputSchema,
    },
    async ({ cursor, limit = 25, query, recordTagIds }) => {
      const q = query.toLowerCase();
      const searchCursor = parseSearchCursor(cursor);

      const recordTagIdSet = recordTagIds?.length
        ? new Set(recordTagIds)
        : undefined;

      const viewer = await getViewer(ctx.db, ctx.props.userId);
      const visibleLogIds = Array.from(viewer.visibleLogIds);

      if (!visibleLogIds.length) {
        return mcpFields.textResult({ results: [] }, 'No results.');
      }

      const pageResults: SearchResult[] = [];

      if (!recordTagIdSet && searchCursor.offset === 0) {
        for (const log of viewer.visibleLogs) {
          const haystack = [
            log.name,
            ...(log.tags ?? []).map((tag) => tag.name),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          if (haystack.includes(q)) pageResults.push({ log, type: 'log' });
        }
      }

      const recordScanLimit = Math.min(
        SEARCH_RECORD_SCAN_LIMIT,
        Math.max(limit * 10, 50)
      );

      const { records } = (await ctx.db.query({
        records: {
          $: {
            limit: recordScanLimit + 1,
            offset: searchCursor.offset,
            order: { date: 'desc' },
            where: { isDraft: false, log: { $in: visibleLogIds } },
          },
          ...recordSearchQuery,
        },
      })) as { records?: mcpTypes.McpRecord[] };

      const recordPage = (records ?? []).slice(0, recordScanLimit);
      const hasMoreRecords = (records ?? []).length > recordScanLimit;

      for (const record of recordPage) {
        if (!record.log?.id || !viewer.visibleLogIds.has(record.log.id)) {
          continue;
        }

        const hasSelectedRecordTag =
          !recordTagIdSet ||
          record.tags?.some((tag) => recordTagIdSet.has(tag.id));

        const recordMediaItems = getFileMediaSearchItems(record.files);

        const recordHaystack = [
          record.text,
          record.log?.name,
          ...(record.tags ?? []).map((tag) => tag.name),
          ...(record.links ?? []).map((link) => link.label),
          ...(record.files ?? []).map((file) => file.name),
          getFileMediaSearchText(recordMediaItems),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const recordMediaMatches = getFileMediaMatchesFromItems(
          recordMediaItems,
          q
        );

        if (hasSelectedRecordTag && recordHaystack.includes(q)) {
          pageResults.push({
            ...(recordMediaMatches.length
              ? { matches: recordMediaMatches }
              : {}),
            record: mcpFields.recordSummaryFields(record, fieldOptions),
            type: 'record',
          });
        }

        for (const reply of record.replies ?? []) {
          const replyMediaItems = getFileMediaSearchItems(reply.files);

          const replyHaystack = [
            reply.text,
            record.log?.name,
            ...(record.tags ?? []).map((tag) => tag.name),
            ...(reply.links ?? []).map((link) => link.label),
            ...(reply.files ?? []).map((file) => file.name),
            getFileMediaSearchText(replyMediaItems),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          const replyMediaMatches = getFileMediaMatchesFromItems(
            replyMediaItems,
            q
          );

          if (hasSelectedRecordTag && replyHaystack.includes(q)) {
            pageResults.push({
              ...(replyMediaMatches.length
                ? { matches: replyMediaMatches }
                : {}),
              record: { id: record.id, log: record.log, tags: record.tags },
              reply: mcpFields.replySummaryFields(reply, fieldOptions),
              type: 'reply',
            });
          }
        }
      }

      const limited = pageResults.slice(
        searchCursor.skip,
        searchCursor.skip + limit
      );

      const consumedPageResults = searchCursor.skip + limited.length;

      const nextCursor =
        consumedPageResults < pageResults.length
          ? formatSearchCursor({
              offset: searchCursor.offset,
              skip: consumedPageResults,
            })
          : hasMoreRecords
            ? formatSearchCursor({
                offset: searchCursor.offset + recordPage.length,
                skip: 0,
              })
            : undefined;

      return mcpFields.textResult(
        {
          pagination: {
            cursor,
            more: !!nextCursor,
            nextCursor,
            scanned: recordPage.length,
            scanLimit: recordScanLimit,
          },
          results: limited,
        },
        limited.length
          ? searchResultsTable(limited)
          : nextCursor
            ? `No results in this page. Continue with cursor: ${nextCursor}`
            : 'No results.'
      );
    }
  );
};
