import { useAuth } from '@/lib/auth';
import { db } from '@/lib/utils';

export function useOnboarding() {
  const auth = useAuth();

  const { data, isLoading } = db.useQuery(
    auth.user
      ? {
          profiles: {
            $: { fields: [], where: { 'user.id': auth.user.id } },
          },
        }
      : null
  );

  return {
    auth,
    isLoading: auth.isLoading || (auth.user && isLoading),
    requiresAuth: !auth.isLoading && !auth.user,
    requiresOnboarding: !isLoading && !data?.profiles.length,
  };
}
