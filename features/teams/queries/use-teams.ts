import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

export const useTeams = () => {
  const auth = db.useAuth();

  const { data, isLoading } = db.useQuery(
    auth.user ? { teams: { $: { order: { name: 'asc' } }, image: {} } } : null
  );

  const hasCurrentResult = useCurrentQueryResult(auth.user?.id, data);

  return {
    teams: auth.user && hasCurrentResult ? (data?.teams ?? []) : [],
    isLoading: !!auth.user && (isLoading || !hasCurrentResult),
  };
};
