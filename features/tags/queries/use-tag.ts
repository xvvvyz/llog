import { useCurrentQueryResult } from '@/hooks/use-current-query-result';
import { db } from '@/lib/db';

export const useTag = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id ? { tags: { $: { where: { id } } } } : null
  );

  const hasCurrentResult = useCurrentQueryResult(id, data);

  const tag = hasCurrentResult
    ? id
      ? data?.tags?.find((item) => item.id === id)
      : undefined
    : undefined;

  return {
    id: tag?.id,
    isLoading: !!id && (isLoading || !hasCurrentResult),
    name: tag?.name,
  };
};
