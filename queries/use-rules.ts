import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/ui/db';

export const useRules = () => {
  const ui = useUi();

  const { data, isLoading } = db.useQuery(
    ui.activeTeamId
      ? {
          rules: {
            $: { where: { team: ui.activeTeamId } },
            author: {},
          },
        }
      : null
  );

  return { data: data?.rules ?? [], isLoading };
};
