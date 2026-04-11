import { db } from '@/utilities/db';
import { useMemo } from 'react';

export const useTeams = () => {
  const auth = db.useAuth();

  const { data, isLoading } = db.useQuery(
    auth.user
      ? {
          roles: {
            $: { where: { userId: auth.user.id } },
            team: {
              image: {},
            },
          },
        }
      : null
  );

  const teams = useMemo(() => {
    const seen = new Set<string>();
    return (
      data?.roles
        ?.map((role) => role.team)
        .filter((team): team is NonNullable<typeof team> => {
          if (!team || seen.has(team.id)) return false;
          seen.add(team.id);
          return true;
        }) ?? []
    );
  }, [data?.roles]);

  return { teams, isLoading };
};
