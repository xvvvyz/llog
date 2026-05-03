import { db } from '@/lib/db';
import * as React from 'react';

export type RecordCopyTargetLog = {
  color?: number | null;
  id: string;
  name?: string | null;
  teamId?: string | null;
};

export type RecordCopyTargetGroup = {
  id: string;
  logs: RecordCopyTargetLog[];
  name: string;
};

export const useRecordCopyTargets = ({
  enabled = true,
  sourceLogId,
}: { enabled?: boolean; sourceLogId?: string } = {}) => {
  const auth = db.useAuth();

  const { data: teamsData, isLoading: teamsLoading } = db.useQuery(
    enabled && auth.user
      ? { teams: { $: { fields: ['id', 'name'], order: { name: 'asc' } } } }
      : null
  );

  const teams = teamsData?.teams ?? [];
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

  const groups = React.useMemo<RecordCopyTargetGroup[]>(() => {
    const logsByTeamId = new Map<string, RecordCopyTargetLog[]>();

    for (const log of logsData?.logs ?? []) {
      if (log.id === sourceLogId || !log.teamId) continue;
      const logs = logsByTeamId.get(log.teamId) ?? [];
      logs.push(log);
      logsByTeamId.set(log.teamId, logs);
    }

    return teams.flatMap((team) => {
      const logs = logsByTeamId.get(team.id) ?? [];
      if (!logs.length) return [];
      return [{ id: team.id, logs, name: team.name }];
    });
  }, [logsData?.logs, sourceLogId, teams]);

  const logs = React.useMemo(
    () => groups.flatMap((group) => group.logs),
    [groups]
  );

  return { groups, isLoading: teamsLoading || logsLoading, logs };
};
