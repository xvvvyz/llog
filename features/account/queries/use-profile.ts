import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

export const useProfile = () => {
  const auth = db.useAuth();

  const { data, isLoading } = db.useQuery(
    auth.user
      ? { profiles: { $: { where: { user: auth.user.id } }, image: {} } }
      : null
  );

  const hasCurrentResult = useCurrentQueryResult(auth.user?.id, data);

  const profile =
    auth.user && hasCurrentResult ? data?.profiles?.[0] : undefined;

  return {
    ...profile,
    isLoading: !!auth.user && (isLoading || !hasCurrentResult),
  };
};
