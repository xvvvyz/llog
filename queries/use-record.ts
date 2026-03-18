import { db } from '@/utilities/db';

export const useRecord = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id
      ? {
          records: {
            $: { where: { id } },
            author: { image: {} },
            comments: {
              $: { where: { isDraft: { $not: true } } },
              author: { image: {} },
              media: {},
              reactions: { author: {} },
            },
            media: {},
            log: {},
            reactions: { author: {} },
          },
        }
      : null
  );

  const record = data?.records?.[0];
  const comments = record?.comments ?? [];
  const media = record?.media ?? [];
  return { ...record, comments, media, isLoading };
};
