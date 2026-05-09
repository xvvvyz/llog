import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';
import * as React from 'react';

type RecordCopyTargetTeam = {
  id: string;
  image?: { uri?: string | null } | null;
  name: string;
};

type RecordCopyTargetLog = {
  color?: number | null;
  id: string;
  name?: string | null;
  team: RecordCopyTargetTeam;
  teamId?: string | null;
};

type RecordCopyTargetGroup = RecordCopyTargetTeam & {
  logs: RecordCopyTargetLog[];
};

export const useRecordCopyTargets = ({
  enabled = true,
}: { enabled?: boolean } = {}) => {
  const auth = db.useAuth();

  const { data: teamsData, isLoading: teamsLoading } = db.useQuery(
    enabled && auth.user
      ? {
          teams: {
            $: { fields: ['id', 'name'], order: { name: 'asc' } },
            image: {},
          },
        }
      : null
  );

  const teamsQueryKey = enabled && auth.user ? auth.user.id : undefined;
  const hasCurrentTeamsResult = useCurrentQueryResult(teamsQueryKey, teamsData);

  const teams =
    teamsQueryKey && hasCurrentTeamsResult ? (teamsData?.teams ?? []) : [];

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

  const queryLogs =
    logsQueryKey && hasCurrentLogsResult ? (logsData?.logs ?? []) : [];

  const groups = React.useMemo<RecordCopyTargetGroup[]>(() => {
    const logsByTeamId = new Map<string, Omit<RecordCopyTargetLog, 'team'>[]>();

    for (const log of queryLogs) {
      if (!log.teamId) continue;
      const logs = logsByTeamId.get(log.teamId) ?? [];
      logs.push(log);
      logsByTeamId.set(log.teamId, logs);
    }

    return teams.flatMap((team) => {
      const logs = logsByTeamId.get(team.id) ?? [];
      if (!logs.length) return [];

      const targetTeam: RecordCopyTargetTeam = {
        id: team.id,
        image: team.image,
        name: team.name,
      };

      return [
        {
          ...targetTeam,
          logs: logs.map((log) => ({ ...log, team: targetTeam })),
        },
      ];
    });
  }, [queryLogs, teams]);

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
