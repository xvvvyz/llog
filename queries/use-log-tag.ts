import { db } from '@/lib/db';

export const useTag = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id ? { tags: { $: { where: { id } } } } : null
  );

  const tag = data?.tags?.[0];

  return { id: tag?.id, isLoading, name: tag?.name };
};
