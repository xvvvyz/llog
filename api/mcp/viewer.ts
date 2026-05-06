import { fileFields } from '@/api/mcp/fields';
import type { McpContext, McpLog, McpRole, McpViewer } from '@/api/mcp/types';
import type { Db } from '@/api/middleware/db';
import * as permissions from '@/domain/teams/permissions';

export const getViewer = async (db: Db, userId: string): Promise<McpViewer> => {
  const [{ profiles }, { roles }] = await Promise.all([
    db.query({
      profiles: {
        $: { where: { user: userId } },
        image: {},
        logs: {
          tags: { $: { where: { type: 'log' } } },
          team: { $: { fields: ['id', 'name'] } },
        },
        user: { $: { fields: ['id', 'email'] } },
      },
    }),
    db.query({
      roles: {
        $: { where: { userId } },
        team: { image: {}, logs: { tags: { $: { where: { type: 'log' } } } } },
      },
    }),
  ]);

  const profile = profiles[0];
  const visibleLogs = new Map<string, McpLog>();
  const teams = new Map<string, McpViewer['teams'][number]>();
  const rolesByTeamId = new Map<string, McpRole>();

  for (const role of (roles ?? []) as McpRole[]) {
    if (!role.team?.id) continue;
    rolesByTeamId.set(role.team.id, role);

    teams.set(role.team.id, {
      id: role.team.id,
      image: role.team.image ? fileFields(role.team.image) : undefined,
      name: role.team.name,
      role: role.role,
    });

    if (permissions.canManageTeam(role.role)) {
      for (const log of role.team.logs ?? []) visibleLogs.set(log.id, log);
    }
  }

  for (const log of profile?.logs ?? []) visibleLogs.set(log.id, log);

  return {
    profile,
    roles: roles ?? [],
    rolesByTeamId,
    teams: Array.from(teams.values()),
    visibleLogIds: new Set(visibleLogs.keys()),
    visibleLogs: Array.from(visibleLogs.values()),
  };
};

export const requireVisibleLog = async (ctx: McpContext, logId: string) => {
  const viewer = await getViewer(ctx.db, ctx.props.userId);

  if (!viewer.visibleLogIds.has(logId)) {
    throw new Error('Log not found or not visible');
  }

  return viewer;
};
