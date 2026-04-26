import { db } from '@/lib/db';

export const useRecord = ({ id }: { id?: string }) => {
  const { data, isLoading } = db.useQuery(
    id
      ? {
          records: {
            $: { where: { id } },
            author: { image: {} },
            replies: {
              $: { where: { isDraft: { $not: true } } },
              author: { image: {} },
              media: {},
              links: {},
              reactions: { author: {} },
            },
            media: {},
            links: {},
            log: {},
            reactions: { author: {} },
          },
        }
      : null
  );

  const records = data?.records ?? [];
  const record = records.find((item) => item.id === id);
  const hasStaleResult = !!id && records.length > 0 && !record;
  const replies = record?.replies ?? [];
  const media = record?.media ?? [];
  const links = record?.links ?? [];

  return {
    ...record,
    links,
    replies,
    media,
    isLoading: isLoading || hasStaleResult,
  };
};

export type UseRecordResult = ReturnType<typeof useRecord>;
