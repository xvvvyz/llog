import { useUi } from '@/queries/use-ui';
import { db } from '@/utilities/ui/db';

export const useHasNoLogs = () => {
  const ui = useUi();

  const { data, isLoading } = db.useQuery(
    ui.activeTeamId
      ? {
          logs: {
            $: {
              fields: ['id'],

              // limit 2 so if we delete 1 of them
              // we don't get an empty state flash
              limit: 2,

              where: { team: ui.activeTeamId },
            },
          },
        }
      : null
  );

  return !isLoading && !data?.logs?.length;
};
