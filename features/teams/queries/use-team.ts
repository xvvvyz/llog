import { useUi } from '@/features/account/queries/use-ui';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

export const useTeam = () => {
  const { activeTeamId } = useUi();

  const { data, isLoading } = db.useQuery(
    activeTeamId
      ? { teams: { $: { where: { id: activeTeamId } }, image: {} } }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(activeTeamId, data);
  const team = activeTeamId && hasCurrentResult ? data?.teams?.[0] : undefined;

  return {
    ...team,
    isLoading: !!activeTeamId && (isLoading || !hasCurrentResult),
  };
};
