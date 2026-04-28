import { logFields, textResult } from '@/api/mcp/fields';
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

export const registerLogTools = (server: McpServer, ctx: McpContext) => {
  server.registerTool(
    'create_log',
    {
      description: 'Create a log.',
      inputSchema: {
        name: z.string().trim().min(1).max(32),
        teamId: z.string().min(1).optional(),
      },
    },
    async ({ name, teamId }) => {
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
        throw new Error(
          'teamId is required unless you manage exactly one team'
        );
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
    }
  );
};
