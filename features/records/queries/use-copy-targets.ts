import { canManageTeam } from '@/domain/teams/permissions';
import type { FileItem } from '@/features/files/types/file';
import type { Log } from '@/features/logs/types/log';
import type { Team } from '@/features/teams/types/team';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import schema from '@/instant.schema';
import { db } from '@/lib/db';
import { InstaQLEntity } from '@instantdb/react-native';
import * as React from 'react';

type CopyTargetRole = InstaQLEntity<typeof schema, 'roles'>['role'];

type CopyTargetTeam = Pick<Team, 'id' | 'name'> & {
  image?: Pick<FileItem, 'uri'> | null;
  role?: CopyTargetRole | null;
};

export type CopyTargetLog = Pick<Log, 'color' | 'id' | 'name' | 'teamId'> & {
  team: CopyTargetTeam;
};

type CopyTargetGroup = CopyTargetTeam & { logs: CopyTargetLog[] };

export const useCopyTargets = ({
  enabled = true,
  requireCanManage = false,
}: { enabled?: boolean; requireCanManage?: boolean } = {}) => {
  const auth = db.useAuth();

  const { data: teamsData, isLoading: teamsLoading } = db.useQuery(
    enabled && auth.user
      ? requireCanManage
        ? {
            teams: {
              $: {
                fields: ['id' as const, 'name' as const],
                order: { name: 'asc' as const },
              },
              image: {},
              roles: {
                $: { fields: ['role' as const], where: { user: auth.user.id } },
              },
            },
          }
        : {
            teams: {
              $: {
                fields: ['id' as const, 'name' as const],
                order: { name: 'asc' as const },
              },
              image: {},
            },
          }
      : null
  );

  const teamsQueryKey =
    enabled && auth.user
      ? `${auth.user.id}:${requireCanManage ? 'manage' : 'all'}`
      : undefined;

  const hasCurrentTeamsResult = useCurrentQueryResult(teamsQueryKey, teamsData);

  const teams = React.useMemo(
    () =>
      teamsQueryKey && hasCurrentTeamsResult ? (teamsData?.teams ?? []) : [],
    [hasCurrentTeamsResult, teamsData?.teams, teamsQueryKey]
  );

  const teamIds = React.useMemo(() => teams.map((team) => team.id), [teams]);

  const { data: logsData, isLoading: logsLoading } = db.useQuery(
    enabled && teamIds.length
      ? {
          logs: {
            $: {
              fields: ['color', 'id', 'name', 'teamId'],
              order: { name: 'asc' },
              where: { teamId: { $in: teamIds } },
            },
          },
        }
      : null
  );

  const logsQueryKey =
    enabled && teamIds.length ? teamIds.join(',') : undefined;

  const hasCurrentLogsResult = useCurrentQueryResult(logsQueryKey, logsData);

  const queryLogs = React.useMemo(
    () => (logsQueryKey && hasCurrentLogsResult ? (logsData?.logs ?? []) : []),
    [hasCurrentLogsResult, logsData?.logs, logsQueryKey]
  );

  const groups = React.useMemo<CopyTargetGroup[]>(() => {
    const logsByTeamId = new Map<string, Omit<CopyTargetLog, 'team'>[]>();

    for (const log of queryLogs) {
      if (!log.teamId) continue;
      const logs = logsByTeamId.get(log.teamId) ?? [];
      logs.push(log);
      logsByTeamId.set(log.teamId, logs);
    }

    return teams.flatMap((team) => {
      const logs = logsByTeamId.get(team.id) ?? [];
      if (!logs.length) return [];

      const targetTeam: CopyTargetTeam = {
        id: team.id,
        image: team.image,
        name: team.name,
        role: team.roles?.[0]?.role,
      };

      if (requireCanManage && !canManageTeam(targetTeam.role)) return [];

      return [
        {
          ...targetTeam,
          logs: logs.map((log) => ({ ...log, team: targetTeam })),
        },
      ];
    });
  }, [queryLogs, requireCanManage, teams]);

  const logs = React.useMemo(
    () => groups.flatMap((group) => group.logs),
    [groups]
  );

  return {
    groups,
    isLoading:
      enabled &&
      ((!!teamsQueryKey && (teamsLoading || !hasCurrentTeamsResult)) ||
        (!!logsQueryKey && (logsLoading || !hasCurrentLogsResult))),
    logs,
  };
};
