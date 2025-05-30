import { db } from '@/utilities/db';

export const useOnboarding = () => {
  const auth = db.useAuth();

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
};
