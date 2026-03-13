import { db } from '@/utilities/db';

export const useTeams = () => {
  const auth = db.useAuth();

  const { data, isLoading } = db.useQuery(
    auth.user
      ? {
          roles: {
            $: { where: { userId: auth.user.id } },
            team: {},
          },
        }
      : null
  );

  const seen = new Set<string>();

  const teams =
    data?.roles
      ?.map((role) => role.team)
      .filter((team): team is NonNullable<typeof team> => {
        if (!team || seen.has(team.id)) return false;
        seen.add(team.id);
        return true;
      }) ?? [];

  return { teams, isLoading };
};
