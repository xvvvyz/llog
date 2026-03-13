import { db } from '@/utilities/db';

export const useRecord = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id
      ? {
          records: {
            $: { where: { id } },
            author: { image: {} },
            comments: { author: { image: {} }, images: {}, reactions: { author: {} } },
            images: {},
            reactions: { author: {} },
          },
        }
      : null
  );

  const record = data?.records?.[0];
  const comments = record?.comments ?? [];
  const images = record?.images ?? [];
  return { ...record, comments, images, isLoading };
};
