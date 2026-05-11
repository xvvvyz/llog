import * as mcpFields from '@/api/mcp/fields';
import { registerMcpTool } from '@/api/mcp/register-tool';
import * as mcpSchemas from '@/api/mcp/schemas';
import type { McpContext, McpRecord } from '@/api/mcp/types';
import { getViewer } from '@/api/mcp/viewer';
import * as recordQueries from '@/domain/records/query';
import { recordTagsQuery } from '@/domain/tags/query';
import * as permissions from '@/domain/teams/permissions';
import { id } from '@instantdb/admin';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

const logsActionSchema = z.enum(['list', 'get', 'create']);

const recordSummaryQuery = {
  files: recordQueries.countFileQuery,
  links: recordQueries.countLinkQuery,
  log: { $: { fields: ['id' as const, 'name' as const] } },
  reactions: recordQueries.countReactionQuery,
  replies: {
    $: {
      fields: ['id' as const, 'isDraft' as const],
      where: recordQueries.publishedContentWhere,
    },
  },
  tags: recordTagsQuery,
};

export const registerLogTools = (server: McpServer, ctx: McpContext) => {
  const fieldOptions = { appUrl: ctx.env.APP_URL };

  const listLogs = async () => {
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
        ['Name', 'Tags'],
        logs.map((log) => [
          log.name,
          log.tags?.map((tag) => tag.name).join(', '),
        ])
      )
    );
  };

  const getLog = async ({
    limit = 25,
    logId,
    name,
  }: {
    limit?: number;
    logId?: string;
    name?: string;
  }) => {
    if (!logId && !name) throw new Error('logId or name is required');
    const viewer = await getViewer(ctx.db, ctx.props.userId);
    const normalizedName = name?.trim().toLowerCase();

    const matches = viewer.visibleLogs.filter((log) =>
      logId ? log.id === logId : log.name.toLowerCase() === normalizedName
    );

    if (!matches.length) throw new Error('Log not found or not visible');

    if (matches.length > 1) {
      throw new Error('Multiple visible logs match that name; pass logId');
    }

    const log = mcpFields.logFields(matches[0]);

    const { records } = (await ctx.db.query({
      records: {
        $: {
          fields: [
            'date' as const,
            'id' as const,
            'isDraft' as const,
            'isPinned' as const,
            'teamId' as const,
            'text' as const,
          ],
          limit,
          order: { date: 'desc' },
          where: { isDraft: false, log: log.id },
        },
        ...recordSummaryQuery,
      },
    })) as unknown as { records?: McpRecord[] };

    const recordSummaries = (records ?? []).map((record) =>
      mcpFields.recordSummaryFields(record, fieldOptions)
    );

    return mcpFields.textResult(
      { log, records: recordSummaries },
      [
        `Log: ${log.name} (${log.id})`,
        mcpFields.table(
          ['Date', 'Text', 'Tags', 'Replies', 'URL'],
          recordSummaries.map((record) => [
            String(record.date),
            record.text,
            record.tags?.map((tag) => tag.name).join(', '),
            record.replyCount,
            record.url,
          ])
        ),
      ].join('\n\n')
    );
  };

  const createLog = async ({
    name,
    teamId,
  }: {
    name?: string;
    teamId?: string;
  }) => {
    if (!name) throw new Error('name is required to create a log');
    const viewer = await getViewer(ctx.db, ctx.props.userId);

    const managedRoles = viewer.roles.filter((role) =>
      permissions.canManageTeam(role.role)
    );

    const managedTeamIds = managedRoles
      .map((role) => role.team?.id ?? role.teamId)
      .filter((id): id is string => !!id);

    const resolvedTeamId =
      teamId ?? (managedTeamIds.length === 1 ? managedTeamIds[0] : undefined);

    if (!resolvedTeamId) {
      throw new Error('teamId is required unless you manage exactly one team');
    }

    const callerRole = viewer.rolesByTeamId.get(resolvedTeamId)?.role;

    if (!permissions.canManageTeam(callerRole)) {
      throw new Error('Only team owners and admins can create logs');
    }

    const logId = id();
    const trimmedName = name.trim();

    await ctx.db.transact(
      ctx.db.tx.logs[logId]
        .update({ name: trimmedName, teamId: resolvedTeamId })
        .link({ team: resolvedTeamId })
    );

    const log = mcpFields.logFields({
      id: logId,
      name: trimmedName,
      teamId: resolvedTeamId,
    });

    return mcpFields.textResult(
      { log },
      `Created log: ${trimmedName} (${logId})`
    );
  };

  registerMcpTool(
    server,
    'logs',
    {
      description: 'Logs.',
      inputSchema: {
        action: logsActionSchema,
        limit: z.number().int().min(1).max(100).optional(),
        logId: z.string().min(1).optional(),
        name: z.string().trim().min(1).max(32).optional(),
        teamId: z.string().min(1).optional(),
      },
      outputSchema: mcpSchemas.logsOutputSchema,
    },
    async ({ action, limit, logId, name, teamId }) => {
      switch (action) {
        case 'list': {
          return listLogs();
        }

        case 'get': {
          return getLog({ limit, logId, name });
        }

        case 'create': {
          return createLog({ name, teamId });
        }
      }
    }
  );
};
