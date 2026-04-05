import { useTeams } from '@/queries/use-teams';
import { db } from '@/utilities/db';
import { useMemo } from 'react';

export const useActivities = () => {
  const { teams } = useTeams();
  const teamIds = useMemo(() => teams.map((t) => t.id), [teams]);

  const { data, isLoading } = db.useQuery(
    teamIds.length
      ? {
          activities: {
            $: {
              where: { teamId: { $in: teamIds } },
              order: { date: 'desc' },
              limit: 100,
            },
            actor: { image: {} },
            team: {},
            record: { media: {} },
            comment: { media: {} },
            log: {},
          },
        }
      : null
  );

  return { activities: data?.activities ?? [], isLoading };
};
