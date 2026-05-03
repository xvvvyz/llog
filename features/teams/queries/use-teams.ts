import { db } from '@/lib/db';

export const useTeams = () => {
  const auth = db.useAuth();

  const { data, isLoading } = db.useQuery(
    auth.user ? { teams: { $: { order: { name: 'asc' } }, image: {} } } : null
  );

  return { teams: data?.teams ?? [], isLoading };
};
