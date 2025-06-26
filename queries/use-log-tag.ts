import { db } from '@/utilities/db';

export const useLogTag = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id ? { logTags: { $: { where: { id } } } } : null
  );

  const tag = data?.logTags?.[0];

  return { id: tag?.id, isLoading, name: tag?.name };
};
