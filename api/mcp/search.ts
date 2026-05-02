import * as mcpFields from '@/api/mcp/fields';
import { recordSearchQuery } from '@/api/mcp/records';
import type * as mcpTypes from '@/api/mcp/types';
import { getViewer } from '@/api/mcp/viewer';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

type SearchResult =
  | { log: mcpTypes.McpLog; type: 'log' }
  | { record: ReturnType<typeof mcpFields.recordSummaryFields>; type: 'record' }
  | {
      record: {
        id: string;
        log?: mcpTypes.McpLog | null;
        tags?: mcpTypes.McpTag[];
      };
      reply: ReturnType<typeof mcpFields.replySummaryFields>;
      type: 'reply';
    };

const SEARCH_RECORD_SCAN_LIMIT = 500;

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
          result.record.text,
          result.record.tags?.map((tag) => tag.name).join(', '),
          result.record.id,
        ];
      }

      return [
        'reply',
        result.record.id,
        result.reply.text,
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

  server.registerTool(
    'search',
    {
      description: 'Search logs, records, and replies.',
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional(),
        query: z.string().min(1),
        recordTagIds: z.array(z.string().min(1)).max(20).optional(),
      },
    },
    async ({ limit = 25, query, recordTagIds }) => {
      const q = query.trim().toLowerCase();

      const recordTagIdSet = recordTagIds?.length
        ? new Set(recordTagIds)
        : undefined;

      const viewer = await getViewer(ctx.db, ctx.props.userId);
      const visibleLogIds = Array.from(viewer.visibleLogIds);

      if (!visibleLogIds.length) {
        return mcpFields.textResult({ results: [] }, 'No results.');
      }

      const results: SearchResult[] = [];

      if (!recordTagIdSet) {
        for (const log of viewer.visibleLogs) {
          const haystack = [
            log.name,
            ...(log.tags ?? []).map((tag) => tag.name),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          if (haystack.includes(q)) results.push({ log, type: 'log' });
        }
      }

      if (results.length >= limit) {
        const limited = results.slice(0, limit);

        return mcpFields.textResult(
          { results: limited },
          searchResultsTable(limited)
        );
      }

      const recordScanLimit = Math.min(
        SEARCH_RECORD_SCAN_LIMIT,
        Math.max(limit * 10, 50)
      );

      const { records } = (await ctx.db.query({
        records: {
          $: {
            limit: recordScanLimit,
            order: { date: 'desc' },
            where: { isDraft: false, log: { $in: visibleLogIds } },
          },
          ...recordSearchQuery,
        },
      })) as { records?: mcpTypes.McpRecord[] };

      for (const record of records ?? []) {
        if (results.length >= limit) break;

        if (!record.log?.id || !viewer.visibleLogIds.has(record.log.id)) {
          continue;
        }

        const hasSelectedRecordTag =
          !recordTagIdSet ||
          record.tags?.some((tag) => recordTagIdSet.has(tag.id));

        const recordHaystack = [
          record.text,
          record.log?.name,
          ...(record.tags ?? []).map((tag) => tag.name),
          ...(record.links ?? []).map((link) => link.label),
          ...(record.files ?? []).map((file) => file.name),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (hasSelectedRecordTag && recordHaystack.includes(q)) {
          results.push({
            record: mcpFields.recordSummaryFields(record, fieldOptions),
            type: 'record',
          });
        }

        if (results.length >= limit) break;

        for (const reply of record.replies ?? []) {
          const replyHaystack = [
            reply.text,
            record.log?.name,
            ...(record.tags ?? []).map((tag) => tag.name),
            ...(reply.links ?? []).map((link) => link.label),
            ...(reply.files ?? []).map((file) => file.name),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          if (hasSelectedRecordTag && replyHaystack.includes(q)) {
            results.push({
              record: { id: record.id, log: record.log, tags: record.tags },
              reply: mcpFields.replySummaryFields(reply, fieldOptions),
              type: 'reply',
            });
          }

          if (results.length >= limit) break;
        }
      }

      const limited = results.slice(0, limit);

      return mcpFields.textResult(
        { results: limited },
        searchResultsTable(limited)
      );
    }
  );
};
