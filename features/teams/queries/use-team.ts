import { useUi } from '@/features/account/queries/use-ui';
import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

export const useTeam = ({ teamId }: { teamId?: string } = {}) => {
  const { activeTeamId } = useUi();
  const resolvedTeamId = teamId ?? activeTeamId;

  const { data, isLoading } = db.useQuery(
    resolvedTeamId
      ? { teams: { $: { where: { id: resolvedTeamId } }, image: {} } }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(resolvedTeamId, data);

  const team =
    resolvedTeamId && hasCurrentResult ? data?.teams?.[0] : undefined;

  return {
    ...team,
    isLoading: !!resolvedTeamId && (isLoading || !hasCurrentResult),
  };
};
