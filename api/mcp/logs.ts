import { logFields, table, textResult } from '@/api/mcp/fields';
import { registerMcpTool } from '@/api/mcp/register-tool';
import * as mcpSchemas from '@/api/mcp/schemas';
import type { McpContext } from '@/api/mcp/types';
import { getViewer } from '@/api/mcp/viewer';
import * as permissions from '@/domain/teams/permissions';
import { id } from '@instantdb/admin';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

const DEFAULT_LOG_COLOR = 7;
const logsActionSchema = z.enum(['list', 'create']);

export const registerLogTools = (server: McpServer, ctx: McpContext) => {
  const listLogs = async () => {
    const viewer = await getViewer(ctx.db, ctx.props.userId);

    const logs = viewer.visibleLogs.map((log) => {
      const fields = logFields(log);

      return {
        id: fields.id,
        name: fields.name,
        tags: fields.tags,
        teamId: fields.teamId,
      };
    });

    return textResult(
      { logs },
      table(
        ['Name', 'Tags'],
        logs.map((log) => [
          log.name,
          log.tags?.map((tag) => tag.name).join(', '),
        ])
      )
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
        .update({
          color: DEFAULT_LOG_COLOR,
          name: trimmedName,
          teamId: resolvedTeamId,
        })
        .link({ team: resolvedTeamId })
    );

    const log = logFields({
      color: DEFAULT_LOG_COLOR,
      id: logId,
      name: trimmedName,
      teamId: resolvedTeamId,
    });

    return textResult({ log }, `Created log: ${trimmedName} (${logId})`);
  };

  registerMcpTool(
    server,
    'logs',
    {
      description: 'List or create logs.',
      inputSchema: {
        action: logsActionSchema,
        name: z.string().trim().min(1).max(32).optional(),
        teamId: z.string().min(1).optional(),
      },
      outputSchema: mcpSchemas.logsOutputSchema,
    },
    async ({ action, name, teamId }) => {
      switch (action) {
        case 'list': {
          return listLogs();
        }

        case 'create': {
          return createLog({ name, teamId });
        }
      }
    }
  );
};
