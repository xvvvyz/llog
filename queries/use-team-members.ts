import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/db';

export const useTeamMembers = () => {
  const { activeTeamId } = useUi();

  const { data, isLoading } = db.useQuery(
    activeTeamId
      ? {
          roles: {
            $: { where: { team: activeTeamId } },
            user: {
              profile: {
                image: {},
              },
            },
          },
        }
      : null
  );

  return { members: data?.roles ?? [], isLoading };
};
