import { db } from '@/utilities/ui/db';

export const useRecord = ({ recordId }: { recordId?: string }) => {
  const { data, isLoading } = db.useQuery(
    recordId
      ? {
          records: {
            $: { where: { id: recordId } },
            author: {},
            comments: { author: {} },
          },
        }
      : null
  );

  const record = data?.records?.[0];
  const comments = record?.comments ?? [];
  return { ...record, comments, isLoading };
};
