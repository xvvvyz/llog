import * as mcpFields from '@/api/mcp/fields';
import { recordQuery } from '@/api/mcp/records';
import type { McpContext, McpLog, McpRecord, McpReply } from '@/api/mcp/types';
import { getViewer } from '@/api/mcp/viewer';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

type SearchResult =
  | { log: McpLog; type: 'log' }
  | { record: ReturnType<typeof mcpFields.recordSummaryFields>; type: 'record' }
  | {
      record: { id: string; log?: McpLog | null };
      reply: ReturnType<typeof mcpFields.replySummaryFields>;
      type: 'reply';
    };

const SEARCH_RECORD_SCAN_LIMIT = 500;

const searchResultsTable = (results: SearchResult[]) =>
  mcpFields.table(
    ['Type', 'Where', 'Text/Name', 'ID'],
    results.map((result) => {
      if (result.type === 'log') {
        return ['log', result.log.teamId, result.log.name, result.log.id];
      }

      if (result.type === 'record') {
        return [
          'record',
          result.record.log?.name,
          result.record.text,
          result.record.id,
        ];
      }

      return ['reply', result.record.id, result.reply.text, result.reply.id];
    })
  );

export const registerReadTools = (server: McpServer, ctx: McpContext) => {
  const fieldOptions = { appUrl: ctx.env.APP_URL };

  server.registerTool('whoami', { description: 'Current user.' }, async () => {
    const viewer = await getViewer(ctx.db, ctx.props.userId);

    const data = {
      email: ctx.props.email,
      profile: mcpFields.profileFields(viewer.profile),
      teams: viewer.teams.map(mcpFields.teamFields),
      userId: ctx.props.userId,
    };

    return mcpFields.textResult(
      data,
      [
        `User: ${viewer.profile?.name ?? ctx.props.email ?? ctx.props.userId}`,
        `ID: ${ctx.props.userId}`,
        mcpFields.table(
          ['Team', 'Role', 'ID'],
          data.teams.map((team) => [team.name, team.role, team.id])
        ),
      ].join('\n\n')
    );
  });

  server.registerTool(
    'list_teams',
    { description: 'List teams.' },
    async () => {
      const teams = (await getViewer(ctx.db, ctx.props.userId)).teams.map(
        mcpFields.teamFields
      );

      return mcpFields.textResult(
        { teams },
        mcpFields.table(
          ['Name', 'Role', 'ID'],
          teams.map((team) => [team.name, team.role, team.id])
        )
      );
    }
  );

  server.registerTool('list_logs', { description: 'List logs.' }, async () => {
    const viewer = await getViewer(ctx.db, ctx.props.userId);

    const logs = viewer.visibleLogs.map((log) => {
      const fields = mcpFields.logFields(log);

      return {
        id: fields.id,
        name: fields.name,
        tags: fields.tags,
        teamId: fields.teamId,
      };
    });

    return mcpFields.textResult(
      { logs },
      mcpFields.table(
        ['Name', 'Team', 'Tags', 'ID'],
        logs.map((log) => [
          log.name,
          log.teamId,
          log.tags?.map((tag) => tag.name).join(', '),
          log.id,
        ])
      )
    );
  });

  server.registerTool(
    'list_drafts',
    {
      description: 'List your drafts.',
      inputSchema: { limit: z.number().int().min(1).max(100).optional() },
    },
    async ({ limit = 25 }) => {
      const viewer = await getViewer(ctx.db, ctx.props.userId);
      const profileId = viewer.profile?.id;
      const visibleLogIds = Array.from(viewer.visibleLogIds);

      if (!profileId || !visibleLogIds.length) {
        return mcpFields.textResult({ records: [], replies: [] }, 'No drafts.');
      }

      const [{ records }, { replies }] = await Promise.all([
        ctx.db.query({
          records: {
            $: {
              limit,
              order: { date: 'desc' },
              where: {
                author: profileId,
                isDraft: true,
                log: { $in: visibleLogIds },
              },
            },
            ...recordQuery,
          },
        }) as Promise<{ records?: McpRecord[] }>,
        ctx.db.query({
          replies: {
            $: {
              limit,
              order: { date: 'desc' },
              where: { author: profileId, isDraft: true },
            },
            author: { image: {} },
            files: {},
            links: {},
            record: {
              $: { fields: ['id', 'teamId'] },
              log: { $: { fields: ['color', 'id', 'name'] } },
            },
          },
        }) as Promise<{
          replies?: Array<
            McpReply & {
              record?: Pick<McpRecord, 'id' | 'teamId'> & { log?: McpLog };
            }
          >;
        }>,
      ]);

      const draftRecords = (records ?? []).map((record) =>
        mcpFields.recordSummaryFields(record, fieldOptions)
      );

      const draftReplies = (replies ?? [])
        .filter(
          (reply) =>
            reply.record?.log?.id &&
            viewer.visibleLogIds.has(reply.record.log.id)
        )
        .map((reply) => mcpFields.replySummaryFields(reply, fieldOptions));

      return mcpFields.textResult(
        { records: draftRecords, replies: draftReplies },
        [
          'Draft records',
          mcpFields.table(
            ['Log', 'Text', 'ID'],
            draftRecords.map((record) => [
              record.log?.name,
              record.text,
              record.id,
            ])
          ),
          'Draft replies',
          mcpFields.table(
            ['Record', 'Text', 'ID'],
            draftReplies.map((reply) => [
              reply.record?.id,
              reply.text,
              reply.id,
            ])
          ),
        ].join('\n\n')
      );
    }
  );

  server.registerTool(
    'search',
    {
      description: 'Search logs, records, replies.',
      inputSchema: {
        limit: z.number().int().min(1).max(100).optional(),
        query: z.string().min(1),
      },
    },
    async ({ limit = 25, query }) => {
      const q = query.trim().toLowerCase();
      const viewer = await getViewer(ctx.db, ctx.props.userId);
      const visibleLogIds = Array.from(viewer.visibleLogIds);

      if (!visibleLogIds.length) {
        return mcpFields.textResult({ results: [] }, 'No results.');
      }

      const results: SearchResult[] = [];

      for (const log of viewer.visibleLogs) {
        const haystack = [log.name, ...(log.tags ?? []).map((tag) => tag.name)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (haystack.includes(q)) results.push({ log, type: 'log' });
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
          ...recordQuery,
        },
      })) as { records?: McpRecord[] };

      for (const record of records ?? []) {
        if (results.length >= limit) break;

        if (!record.log?.id || !viewer.visibleLogIds.has(record.log.id)) {
          continue;
        }

        const recordHaystack = [
          record.text,
          record.log?.name,
          ...(record.links ?? []).map((link) => link.label),
          ...(record.files ?? []).map((file) => file.name),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (recordHaystack.includes(q)) {
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
            ...(reply.links ?? []).map((link) => link.label),
            ...(reply.files ?? []).map((file) => file.name),
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          if (replyHaystack.includes(q)) {
            results.push({
              record: { id: record.id, log: record.log },
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
