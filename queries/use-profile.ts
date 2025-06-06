import { db } from '@/utilities/db';

export const useProfile = () => {
  const auth = db.useAuth();

  const { data, isLoading } = db.useQuery(
    auth.user
      ? {
          profiles: {
            $: { where: { user: auth.user.id } },
          },
        }
      : null
  );

  const profile = data?.profiles?.[0];

  return { ...profile, isLoading };
};
