import { runBulkItems } from '@/api/mcp/bulk';
import * as mcpFields from '@/api/mcp/fields';
import { registerMcpTool } from '@/api/mcp/register-tool';
import * as mcpSchemas from '@/api/mcp/schemas';
import type * as mcpTypes from '@/api/mcp/types';
import { recordSearchQuery } from '@/domain/records/query';
import { logTagsQuery } from '@/domain/tags/query';
import * as recordQueries from '@/domain/records/query';
import { normalizeSearchText, parseSearchQuery } from '@/lib/search';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';
import * as searchHelpers from '@/api/mcp/search-helpers';

export {
  getFileMediaMatches,
  parseSearchCursor,
} from '@/api/mcp/search-helpers';

const SEARCH_RECORD_SCAN_LIMIT = 1000;

const searchItemSchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  keyword: z.string().trim().min(1),
  limit: z.number().int().min(1).max(100).optional(),
  recordTagIds: z.array(z.string().min(1)).max(20).optional(),
});

export const registerSearchTool = (
  server: McpServer,
  ctx: mcpTypes.McpContext
) => {
  const fieldOptions = { appUrl: ctx.env.APP_URL };

  const searchItems = async ({
    cursor,
    keyword,
    limit = 25,
    recordTagIds,
  }: z.infer<typeof searchItemSchema>) => {
    const parsedQuery = parseSearchQuery(keyword);
    const query = normalizeSearchText(parsedQuery.text);
    const searchCursor = searchHelpers.parseSearchCursor(cursor);

    const recordTagIdSet = recordTagIds?.length
      ? new Set(recordTagIds)
      : undefined;

    const pageResults: searchHelpers.SearchResult[] = [];

    if (!recordTagIdSet && searchCursor.offset === 0) {
      const { logs } = (await ctx.db.query({
        logs: { note: { $: { fields: ['text'] } }, tags: logTagsQuery },
      })) as { logs?: mcpTypes.McpLog[] };

      for (const log of logs ?? []) {
        const result = searchHelpers.getLogSearchResult({
          log,
          parsedQuery,
          query,
        });

        if (result) pageResults.push(result);
      }
    }

    const recordScanLimit = SEARCH_RECORD_SCAN_LIMIT;

    const { records } = (await ctx.db.query({
      records: {
        $: {
          limit: recordScanLimit + 1,
          offset: searchCursor.offset,
          order: { date: 'desc' },
          where: recordQueries.publishedRecordWhere,
        },
        ...recordSearchQuery,
      },
    })) as unknown as { records?: mcpTypes.McpRecord[] };

    const recordPage = (records ?? []).slice(0, recordScanLimit);
    const hasMoreRecords = (records ?? []).length > recordScanLimit;

    for (const record of recordPage) {
      pageResults.push(
        ...searchHelpers.getRecordSearchResults({
          fieldOptions,
          parsedQuery,
          query,
          record,
          recordTagIdSet,
        })
      );
    }

    const limited = pageResults.slice(
      searchCursor.skip,
      searchCursor.skip + limit
    );

    const consumedPageResults = searchCursor.skip + limited.length;

    const nextCursor =
      consumedPageResults < pageResults.length
        ? searchHelpers.formatSearchCursor({
            offset: searchCursor.offset,
            skip: consumedPageResults,
          })
        : hasMoreRecords
          ? searchHelpers.formatSearchCursor({
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
        results: limited.map(searchHelpers.searchResultFields),
      },
      limited.length
        ? searchHelpers.searchResultsTable(limited)
        : nextCursor
          ? `No results in this page. Continue with cursor: ${nextCursor}`
          : 'No results.'
    );
  };

  registerMcpTool(
    server,
    'search',
    {
      description:
        'Batch search logs, log notes, records, replies, links, files, and media text with items. Supports filters like log:"Daily", tag:"Work", and author:"Person".',
      inputSchema: { items: z.array(searchItemSchema).min(1).max(10) },
      outputSchema: mcpSchemas.searchOutputSchema,
    },
    async ({ items }) =>
      runBulkItems({
        action: 'search',
        handler: searchItems,
        items,
        resultKey: 'searches',
      })
  );
};
