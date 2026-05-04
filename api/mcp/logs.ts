import { logFields, table, textResult } from '@/api/mcp/fields';
import type { McpContext, McpRole } from '@/api/mcp/types';
import { getViewer } from '@/api/mcp/viewer';
import * as permissions from '@/features/teams/lib/permissions';
import { id } from '@instantdb/admin';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';

type RoleWithProfile = McpRole & {
  user?: { profile?: { id?: string | null } | null } | null;
};

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
        ['Name', 'Team', 'Tags', 'ID'],
        logs.map((log) => [
          log.name,
          log.teamId,
          log.tags?.map((tag) => tag.name).join(', '),
          log.id,
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

    const { roles } = (await ctx.db.query({
      roles: {
        $: { where: { team: resolvedTeamId } },
        user: { profile: { $: { fields: ['id' as const] } } },
      },
    })) as { roles?: RoleWithProfile[] };

    const profileIds = (roles ?? [])
      .filter((role) => permissions.isManagedRole(role.role))
      .map((role) => role.user?.profile?.id)
      .filter((profileId): profileId is string => !!profileId);

    const logId = id();
    const trimmedName = name.trim();

    await ctx.db.transact([
      ctx.db.tx.logs[logId]
        .update({
          color: DEFAULT_LOG_COLOR,
          name: trimmedName,
          teamId: resolvedTeamId,
        })
        .link({ team: resolvedTeamId }),
      ...profileIds.map((profileId) =>
        ctx.db.tx.logs[logId].link({ profiles: profileId })
      ),
    ]);

    const log = logFields({
      color: DEFAULT_LOG_COLOR,
      id: logId,
      name: trimmedName,
      teamId: resolvedTeamId,
    });

    return textResult({ log }, `Created log: ${trimmedName} (${logId})`);
  };

  server.registerTool(
    'logs',
    {
      description: 'List or create logs.',
      inputSchema: {
        action: logsActionSchema,
        name: z.string().trim().min(1).max(32).optional(),
        teamId: z.string().min(1).optional(),
      },
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
